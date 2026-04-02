import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ProjectSettlement,
  ProjectSettlementLine,
  SettlementStatus,
} from './entities/project-settlement.entity';
import { ProjectBoqItem } from './entities/project-boq-item.entity';
import { Project } from './entities/project.entity';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import {
  calculateSettlementLine,
  calculateSettlementTotals,
} from './domain/logic';
import type { SettlementLineCalc } from './domain/types';

@Injectable()
export class ProjectSettlementService {
  constructor(
    @InjectRepository(ProjectSettlement)
    private settlementRepo: Repository<ProjectSettlement>,
    @InjectRepository(ProjectBoqItem)
    private boqRepo: Repository<ProjectBoqItem>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private dataSource: DataSource,
  ) {}

  // ── Preview đối chiếu vật tư (không lưu DB) ──
  async previewReconciliation(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    const boqItems = await this.boqRepo.find({
      where: { project_id: projectId },
      order: { item_code: 'ASC' },
    });

    // Domain logic: tính settlement lines
    const lines: SettlementLineCalc[] = boqItems.map((item) => {
      const issued = Number(item.issued_qty);
      const returned = 0;
      const onSite = 0;
      const { qty_variance, value_variance } = calculateSettlementLine(
        issued,
        Number(item.unit_price),
        onSite,
        returned,
      );

      return {
        product_id: item.product_id || item.item_code,
        product_name: item.item_name,
        unit: item.unit,
        qty_issued: issued,
        qty_returned: returned,
        qty_on_site: onSite,
        qty_variance,
        unit_price: Number(item.unit_price),
        value_variance,
      };
    });

    const totals = calculateSettlementTotals(lines);

    return {
      status: 'success',
      message: 'Preview đối chiếu vật tư',
      data: { ...totals, lines },
    };
  }

  // ── Tạo biên bản quyết toán ──
  async createSettlement(
    projectId: string,
    dto: CreateSettlementDto,
    settledBy?: string,
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project)
      throw new NotFoundException({
        status: 'error',
        message: 'Dự án không tồn tại!',
        data: null,
      });

    return this.dataSource.transaction(async (manager) => {
      const boqItems = await manager.find(ProjectBoqItem, {
        where: { project_id: projectId },
      });
      const boqMap = new Map<string, ProjectBoqItem>();
      for (const item of boqItems)
        boqMap.set(item.product_id || item.item_code, item);

      // Domain logic: tính settlement lines
      const settlementLines: SettlementLineCalc[] = dto.lines.map((line) => {
        const boq = boqMap.get(line.product_id);
        const issued = boq ? Number(boq.issued_qty) : 0;
        const returned = 0;
        const unitPrice = line.unit_price ?? (boq ? Number(boq.unit_price) : 0);
        const { qty_variance, value_variance } = calculateSettlementLine(
          issued,
          unitPrice,
          line.qty_on_site,
          returned,
        );

        return {
          product_id: line.product_id,
          product_name: line.product_name,
          unit: line.unit,
          qty_issued: issued,
          qty_returned: returned,
          qty_on_site: line.qty_on_site,
          qty_variance,
          unit_price: unitPrice,
          value_variance,
          notes: line.notes,
        };
      });

      const totals = calculateSettlementTotals(settlementLines);

      const settlement = manager.create(ProjectSettlement, {
        project_id: projectId,
        settlement_date: new Date(dto.settlement_date),
        total_material_in: totals.total_material_in,
        total_material_out: totals.total_material_out,
        on_site_stock_value: totals.on_site_stock_value,
        variance: totals.variance,
        variance_percent: totals.variance_percent,
        notes: dto.notes,
        settled_by: settledBy,
        lines: settlementLines as unknown as ProjectSettlementLine[],
      });

      const saved = await manager.save(ProjectSettlement, settlement);
      return {
        status: 'success',
        message: 'Tạo biên bản quyết toán thành công',
        data: saved,
      };
    });
  }

  // ── Finalize settlement (khóa) ──
  async finalize(settlementId: string) {
    const settlement = await this.settlementRepo.findOne({
      where: { id: settlementId },
    });
    if (!settlement)
      throw new NotFoundException({
        status: 'error',
        message: 'Biên bản quyết toán không tồn tại!',
        data: null,
      });
    if (settlement.status === SettlementStatus.FINALIZED) {
      throw new BadRequestException({
        status: 'error',
        message: 'Biên bản đã được chốt!',
        data: null,
      });
    }

    settlement.status = SettlementStatus.FINALIZED;
    const saved = await this.settlementRepo.save(settlement);
    return {
      status: 'success',
      message: 'Chốt biên bản quyết toán thành công',
      data: saved,
    };
  }

  async findAll(projectId: string) {
    const items = await this.settlementRepo.find({
      where: { project_id: projectId },
      order: { settlement_date: 'DESC' },
    });
    return {
      status: 'success',
      message: `Tìm thấy ${items.length} biên bản`,
      data: items,
    };
  }

  async findOne(settlementId: string) {
    const item = await this.settlementRepo.findOne({
      where: { id: settlementId },
      relations: ['lines'],
    });
    if (!item)
      throw new NotFoundException({
        status: 'error',
        message: 'Biên bản không tồn tại!',
        data: null,
      });
    return {
      status: 'success',
      message: 'Chi tiết biên bản quyết toán',
      data: item,
    };
  }
}
