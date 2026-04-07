import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NonConformanceReport } from './entities/non-conformance-report.entity';
import { NcrAttachment } from './entities/ncr-attachment.entity';
import {
  CreateNcrDto,
  AssignNcrDto,
  ResolveNcrDto,
  VerifyNcrDto,
  UpdateNcrDto,
} from './dto/create-ncr.dto';
import { NcrStatus, NCR_STATUS_TRANSITIONS } from './enums/ncr.enum';

@Injectable()
export class ProjectNcrService {
  constructor(
    @InjectRepository(NonConformanceReport)
    private readonly ncrRepo: Repository<NonConformanceReport>,
    @InjectRepository(NcrAttachment)
    private readonly attachmentRepo: Repository<NcrAttachment>,
  ) {}

  async create(
    projectId: string,
    dto: CreateNcrDto,
    userId: string,
  ): Promise<NonConformanceReport> {
    const ncrCode = await this.generateCode();
    const ncr = this.ncrRepo.create({
      ...dto,
      ncr_code: ncrCode,
      project_id: projectId,
      status: NcrStatus.OPEN,
      created_by: userId,
      assigned_by: dto.assigned_to ? userId : undefined,
    });
    return this.ncrRepo.save(ncr);
  }

  async findByProject(projectId: string): Promise<NonConformanceReport[]> {
    return this.ncrRepo.find({
      where: { project_id: projectId },
      relations: ['assignee', 'verifier', 'attachments'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(ncrId: string): Promise<NonConformanceReport> {
    const ncr = await this.ncrRepo.findOne({
      where: { id: ncrId },
      relations: ['assignee', 'assigner', 'verifier', 'attachments', 'project'],
    });
    if (!ncr) throw new NotFoundException('NCR khong ton tai');
    return ncr;
  }

  async update(
    ncrId: string,
    dto: UpdateNcrDto,
  ): Promise<NonConformanceReport> {
    const ncr = await this.findOne(ncrId);
    if (ncr.status === NcrStatus.CLOSED) {
      throw new BadRequestException('Khong the sua NCR da dong');
    }
    Object.assign(ncr, dto);
    return this.ncrRepo.save(ncr);
  }

  async assign(
    ncrId: string,
    dto: AssignNcrDto,
    userId: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.findOne(ncrId);
    this.validateTransition(ncr.status, NcrStatus.IN_PROGRESS);
    ncr.assigned_to = dto.assigned_to;
    ncr.assigned_by = userId;
    ncr.status = NcrStatus.IN_PROGRESS;
    return this.ncrRepo.save(ncr);
  }

  async resolve(
    ncrId: string,
    dto: ResolveNcrDto,
  ): Promise<NonConformanceReport> {
    const ncr = await this.findOne(ncrId);
    this.validateTransition(ncr.status, NcrStatus.RESOLVED);
    ncr.resolution_note = dto.resolution_note;
    ncr.status = NcrStatus.RESOLVED;
    return this.ncrRepo.save(ncr);
  }

  async verify(
    ncrId: string,
    dto: VerifyNcrDto,
    userId: string,
  ): Promise<NonConformanceReport> {
    const ncr = await this.findOne(ncrId);
    if (dto.accepted) {
      this.validateTransition(ncr.status, NcrStatus.VERIFIED);
      ncr.status = NcrStatus.VERIFIED;
      ncr.verified_by = userId;
      ncr.verified_at = new Date();
      // Tu dong dong NCR sau khi verify
      ncr.status = NcrStatus.CLOSED;
    } else {
      // Tu choi → quay lai IN_PROGRESS
      this.validateTransition(ncr.status, NcrStatus.IN_PROGRESS);
      ncr.status = NcrStatus.IN_PROGRESS;
      ncr.resolution_note = dto.comment
        ? `[Tu choi] ${dto.comment}\n\n${ncr.resolution_note || ''}`
        : ncr.resolution_note;
    }
    return this.ncrRepo.save(ncr);
  }

  async reopen(ncrId: string): Promise<NonConformanceReport> {
    const ncr = await this.findOne(ncrId);
    this.validateTransition(ncr.status, NcrStatus.OPEN);
    await this.ncrRepo
      .createQueryBuilder()
      .update(NonConformanceReport)
      .set({
        status: NcrStatus.OPEN,
        verified_by: () => 'NULL',
        verified_at: () => 'NULL',
        resolution_note: () => 'NULL',
      })
      .where('id = :id', { id: ncrId })
      .execute();
    return this.findOne(ncrId);
  }

  async addAttachment(
    ncrId: string,
    phase: 'BEFORE' | 'AFTER',
    fileUrl: string,
    fileName: string,
    userId: string,
  ): Promise<NcrAttachment> {
    const att = this.attachmentRepo.create({
      ncr_id: ncrId,
      phase,
      file_url: fileUrl,
      file_name: fileName,
      uploaded_by: userId,
    });
    return this.attachmentRepo.save(att);
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const result = await this.attachmentRepo.delete(attachmentId);
    if (result.affected === 0) {
      throw new NotFoundException('Attachment khong ton tai');
    }
  }

  async getSummary(projectId: string) {
    const qb = this.ncrRepo
      .createQueryBuilder('ncr')
      .select('ncr.category', 'category')
      .addSelect('ncr.severity', 'severity')
      .addSelect('ncr.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(ncr.penalty_amount), 0)', 'total_penalty')
      .where('ncr.project_id = :projectId', { projectId })
      .groupBy('ncr.category')
      .addGroupBy('ncr.severity')
      .addGroupBy('ncr.status');

    return qb.getRawMany();
  }

  private validateTransition(from: NcrStatus, to: NcrStatus): void {
    const allowed = NCR_STATUS_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Khong the chuyen trang thai NCR tu ${from} sang ${to}`,
      );
    }
  }

  private async generateCode(): Promise<string> {
    const now = new Date();
    const prefix = `NCR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const count = await this.ncrRepo
      .createQueryBuilder('ncr')
      .where('ncr.ncr_code LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }
}
