import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkItemsService } from '../work-items/work-items.service';
import { EnergyMeter } from './entities/energy-meter.entity';
import { EnergyInspection } from './entities/energy-inspection.entity';
import { EnergyReading } from './entities/energy-reading.entity';
import { EnergyInspectionStatus } from './enums/energy.enum';
import { CreateMeterDto } from './dto/create-meter.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { RecordReadingDto } from './dto/record-reading.dto';
import { validateReading } from './domain/logic/reading-validator.logic';

@Injectable()
export class EnergyInspectionService {
  constructor(
    @InjectRepository(EnergyMeter)
    private readonly meterRepo: Repository<EnergyMeter>,
    @InjectRepository(EnergyInspection)
    private readonly inspRepo: Repository<EnergyInspection>,
    @InjectRepository(EnergyReading)
    private readonly readingRepo: Repository<EnergyReading>,
    private readonly dataSource: DataSource,
    private readonly workItems: WorkItemsService,
  ) {}

  // ── Meter master-data ────────────────────────────────────
  async createMeter(dto: CreateMeterDto) {
    const dup = await this.meterRepo.findOne({ where: { code: dto.code } });
    if (dup) throw new ConflictException(`Meter code đã tồn tại: ${dto.code}`);
    return this.meterRepo.save(this.meterRepo.create(dto));
  }

  async listMeters(filter: { projectId?: string; active?: boolean }) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.project_id = filter.projectId;
    if (filter.active !== undefined) where.is_active = filter.active;
    return this.meterRepo.find({ where, order: { code: 'ASC' } });
  }

  async deactivateMeter(id: string) {
    const m = await this.meterRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Không tìm thấy Meter');
    m.is_active = false;
    return this.meterRepo.save(m);
  }

  // ── Inspection instance ──────────────────────────────────
  async createInspection(dto: CreateInspectionDto) {
    // Validate tất cả required_meter_ids tồn tại + thuộc project
    const meters = await this.meterRepo.findByIds(dto.required_meter_ids);
    if (meters.length !== dto.required_meter_ids.length) {
      throw new BadRequestException(
        'Có Meter không tồn tại trong required_meter_ids',
      );
    }
    const wrongProject = meters.find((m) => m.project_id !== dto.project_id);
    if (wrongProject) {
      throw new BadRequestException(
        `Meter ${wrongProject.code} không thuộc project đã chỉ định`,
      );
    }

    return this.inspRepo.save(
      this.inspRepo.create({
        project_id: dto.project_id,
        work_item_id: dto.work_item_id ?? null,
        assignee_id: dto.assignee_id,
        inspection_date: dto.inspection_date,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        required_meter_ids: dto.required_meter_ids,
        notes: dto.notes ?? null,
        status: EnergyInspectionStatus.NEW,
      }),
    );
  }

  async listInspections(filter: {
    projectId?: string;
    assigneeId?: string;
    status?: EnergyInspectionStatus;
  }) {
    const where: Record<string, unknown> = {};
    if (filter.projectId) where.project_id = filter.projectId;
    if (filter.assigneeId) where.assignee_id = filter.assigneeId;
    if (filter.status) where.status = filter.status;
    return this.inspRepo.find({
      where,
      order: { inspection_date: 'DESC' },
      take: 100,
    });
  }

  async findInspection(id: string) {
    const inspection = await this.inspRepo.findOne({
      where: { id },
      relations: ['readings', 'readings.meter'],
    });
    if (!inspection) throw new NotFoundException('Không tìm thấy Inspection');
    return inspection;
  }

  // BR-EI-01: validate non-decreasing cho cumulative meter
  async recordReading(
    inspectionId: string,
    dto: RecordReadingDto,
    actorId: string,
  ) {
    return this.dataSource.transaction(async (mgr) => {
      const inspection = await mgr.findOne(EnergyInspection, {
        where: { id: inspectionId },
      });
      if (!inspection) throw new NotFoundException('Không tìm thấy Inspection');
      if (inspection.status === EnergyInspectionStatus.COMPLETED) {
        throw new BadRequestException(
          'Inspection đã COMPLETED, không ghi reading mới',
        );
      }
      if (!inspection.required_meter_ids.includes(dto.meter_id)) {
        throw new BadRequestException(
          'Meter không nằm trong scope inspection này',
        );
      }

      const meter = await mgr.findOne(EnergyMeter, {
        where: { id: dto.meter_id },
      });
      if (!meter) throw new NotFoundException('Meter không tồn tại');

      // Lấy reading trước đó (của meter này, không phải inspection này)
      const prev = await mgr
        .createQueryBuilder(EnergyReading, 'r')
        .where('r.meter_id = :mid', { mid: dto.meter_id })
        .orderBy('r.recorded_at', 'DESC')
        .limit(1)
        .getOne();

      const validated = validateReading({
        isCumulative: meter.is_cumulative,
        newValue: dto.value,
        previousValue: prev?.value ?? null,
      });
      if (!validated.ok) throw new BadRequestException(validated.reason);

      // Upsert reading per (inspection, meter)
      let reading = await mgr.findOne(EnergyReading, {
        where: { inspection_id: inspectionId, meter_id: dto.meter_id },
      });
      if (!reading) {
        reading = mgr.create(EnergyReading, {
          inspection_id: inspectionId,
          meter_id: dto.meter_id,
          recorded_by: actorId,
        });
      }
      reading.value = dto.value;
      reading.previous_value = prev?.value ?? null;
      reading.delta = validated.delta ?? null;
      reading.photo_url = dto.photo_url ?? reading.photo_url ?? null;
      reading.notes = dto.notes ?? reading.notes ?? null;
      await mgr.save(reading);

      // Progress: done/total theo required_meter_ids
      const doneCount = await mgr.count(EnergyReading, {
        where: { inspection_id: inspectionId },
      });
      const total = inspection.required_meter_ids.length;
      const progressPct = Math.round((doneCount / total) * 100);

      // BR-EI-03: auto complete khi đủ required meters
      const allDone = doneCount >= total;
      if (inspection.status === EnergyInspectionStatus.NEW && doneCount > 0) {
        inspection.status = EnergyInspectionStatus.IN_PROGRESS;
      }
      if (allDone) {
        inspection.status = EnergyInspectionStatus.COMPLETED;
        inspection.completed_at = new Date();
      }
      await mgr.save(inspection);

      if (inspection.work_item_id) {
        await this.workItems.syncProgress(
          inspection.work_item_id,
          progressPct,
          allDone,
        );
      }

      return {
        reading,
        inspectionStatus: inspection.status,
        progressPct,
        doneCount,
        total,
      };
    });
  }
}
