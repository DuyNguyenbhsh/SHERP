import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ChecklistTemplate } from './entities/checklist-template.entity';
import { ChecklistItemTemplate } from './entities/checklist-item-template.entity';
import { ChecklistInstance } from './entities/checklist-instance.entity';
import { ChecklistItemResult } from './entities/checklist-item-result.entity';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { CreateItemTemplateDto } from './dto/create-item-template.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { SubmitItemResultDto } from './dto/submit-item-result.dto';
import { ChecklistInstanceStatus } from './enums/checklist.enum';
import { validateSubmit } from './domain/logic/validate-submit.logic';
import { computeTransition } from './domain/logic/instance-transition.logic';
import { WorkItemsService } from '../work-items/work-items.service';

@Injectable()
export class ChecklistsService {
  constructor(
    @InjectRepository(ChecklistTemplate)
    private readonly tplRepo: Repository<ChecklistTemplate>,
    @InjectRepository(ChecklistItemTemplate)
    private readonly itemTplRepo: Repository<ChecklistItemTemplate>,
    @InjectRepository(ChecklistInstance)
    private readonly instanceRepo: Repository<ChecklistInstance>,
    @InjectRepository(ChecklistItemResult)
    private readonly resultRepo: Repository<ChecklistItemResult>,
    private readonly dataSource: DataSource,
    private readonly workItems: WorkItemsService,
  ) {}

  // ── Template CRUD ────────────────────────────────────────────
  async createTemplate(dto: CreateChecklistTemplateDto) {
    return this.dataSource.transaction(async (mgr) => {
      const tpl = mgr.create(ChecklistTemplate, {
        name: dto.name,
        description: dto.description ?? null,
        frequency: dto.frequency,
        asset_type: dto.asset_type ?? null,
        is_active: dto.is_active ?? true,
      });
      const savedTpl = await mgr.save(tpl);
      const items = dto.items.map((i) =>
        mgr.create(ChecklistItemTemplate, { ...i, template_id: savedTpl.id }),
      );
      await mgr.save(items);
      return mgr.findOne(ChecklistTemplate, {
        where: { id: savedTpl.id },
        relations: ['items'],
      });
    });
  }

  async listTemplates() {
    return this.tplRepo.find({
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
  }

  async getTemplate(id: string) {
    const tpl = await this.tplRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!tpl) throw new NotFoundException('Không tìm thấy Checklist template');
    return tpl;
  }

  async addItem(templateId: string, dto: CreateItemTemplateDto) {
    await this.getTemplate(templateId);
    return this.itemTplRepo.save(
      this.itemTplRepo.create({ ...dto, template_id: templateId }),
    );
  }

  // ── Instance ─────────────────────────────────────────────────
  async createInstance(dto: CreateInstanceDto) {
    await this.getTemplate(dto.template_id); // validate tồn tại
    return this.instanceRepo.save(
      this.instanceRepo.create({
        template_id: dto.template_id,
        assignee_id: dto.assignee_id,
        work_item_id: dto.work_item_id ?? null,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        status: ChecklistInstanceStatus.NEW,
      }),
    );
  }

  async getInstance(id: string) {
    const instance = await this.instanceRepo.findOne({
      where: { id },
      relations: ['template', 'template.items', 'results'],
    });
    if (!instance)
      throw new NotFoundException('Không tìm thấy Checklist instance');
    return instance;
  }

  // ── Submit item result ───────────────────────────────────────
  async submitItemResult(
    instanceId: string,
    itemTemplateId: string,
    dto: SubmitItemResultDto,
  ) {
    return this.dataSource.transaction(async (mgr) => {
      const instance = await mgr.findOne(ChecklistInstance, {
        where: { id: instanceId },
        relations: ['template', 'template.items'],
      });
      if (!instance)
        throw new NotFoundException('Không tìm thấy Checklist instance');

      // BR-CHK-05: instance COMPLETED là immutable
      if (instance.status === ChecklistInstanceStatus.COMPLETED) {
        throw new BadRequestException(
          'BR-CHK-05: Checklist đã hoàn thành, không được sửa kết quả',
        );
      }

      const item = instance.template.items.find((i) => i.id === itemTemplateId);
      if (!item) {
        throw new NotFoundException(
          'Item không thuộc template của instance này',
        );
      }

      // BR-CHK-01, BR-CHK-02
      const validated = validateSubmit(item, dto);
      if (!validated.ok) throw new BadRequestException(validated.reason);

      // Upsert result (1 row/item)
      let existing = await mgr.findOne(ChecklistItemResult, {
        where: { instance_id: instanceId, item_template_id: itemTemplateId },
      });
      if (!existing) {
        existing = mgr.create(ChecklistItemResult, {
          instance_id: instanceId,
          item_template_id: itemTemplateId,
          photos: [],
        });
      }
      Object.assign(existing, {
        result: dto.result ?? existing.result,
        value: dto.value ?? existing.value,
        photos: dto.photos ?? existing.photos,
        photo_category: dto.photo_category ?? existing.photo_category,
        notes: dto.notes ?? existing.notes,
      });
      const savedResult = await mgr.save(existing);

      // BR-CHK-03: auto-transition
      const completedCount = await mgr.count(ChecklistItemResult, {
        where: { instance_id: instanceId },
      });
      const totalItems = instance.template.items.length;
      const trans = computeTransition({
        totalItems,
        completedItems: completedCount,
        currentStatus: instance.status,
      });

      instance.status = trans.nextStatus;
      if (trans.shouldCompleteNow) instance.completed_at = new Date();
      await mgr.save(instance);

      // Sync WorkItem (nếu có link)
      if (instance.work_item_id) {
        await this.workItems.syncProgress(
          instance.work_item_id,
          trans.progressPct,
          trans.shouldCompleteNow,
        );
      }

      return {
        result: savedResult,
        instanceStatus: instance.status,
        progressPct: trans.progressPct,
      };
    });
  }
}
