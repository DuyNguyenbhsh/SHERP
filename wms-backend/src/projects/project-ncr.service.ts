import {
  Injectable,
  Logger,
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
import {
  CloudStorageService,
  CloudUploadResult,
} from '../shared/cloud-storage/cloud-storage.service';

export const NCR_MAX_ATTACHMENTS = 5;

@Injectable()
export class ProjectNcrService {
  private readonly logger = new Logger(ProjectNcrService.name);

  constructor(
    @InjectRepository(NonConformanceReport)
    private readonly ncrRepo: Repository<NonConformanceReport>,
    @InjectRepository(NcrAttachment)
    private readonly attachmentRepo: Repository<NcrAttachment>,
    private readonly cloudStorage: CloudStorageService,
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
    upload: CloudUploadResult,
    userId: string,
  ): Promise<NcrAttachment> {
    // Kiểm tra giới hạn 5 attachment/NCR
    const currentCount = await this.attachmentRepo.count({
      where: { ncr_id: ncrId, is_missing: false },
    });
    if (currentCount >= NCR_MAX_ATTACHMENTS) {
      throw new BadRequestException({
        status: 'error',
        message: `NCR đã đạt giới hạn ${NCR_MAX_ATTACHMENTS} tệp đính kèm. Vui lòng xoá bớt trước khi upload.`,
        data: null,
      });
    }

    const att = this.attachmentRepo.create({
      ncr_id: ncrId,
      phase,
      file_url: upload.secure_url,
      file_name: upload.file_name,
      public_id: upload.public_id,
      file_size: upload.file_size,
      file_format: upload.format,
      resource_type: upload.resource_type,
      is_missing: false,
      uploaded_by: userId,
    });
    return this.attachmentRepo.save(att);
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const att = await this.attachmentRepo.findOne({
      where: { id: attachmentId },
    });
    if (!att) {
      throw new NotFoundException('Attachment khong ton tai');
    }

    // Xoá file trên Cloudinary (best-effort — KHÔNG chặn DB delete nếu Cloudinary fail)
    if (att.public_id) {
      try {
        await this.cloudStorage.delete(att.public_id);
      } catch (err) {
        this.logger.warn(
          `Cloudinary delete fail cho ${att.public_id}: ${String(err)}. Tiếp tục xoá DB row.`,
        );
      }
    } else if (!att.is_missing) {
      this.logger.warn(
        `[NCR] Orphan attachment ${attachmentId} không có public_id, file_url=${att.file_url}`,
      );
    }

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
