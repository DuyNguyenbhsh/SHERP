import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProjectDocument } from '../entities/project-document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { ApprovalsService } from '../../approvals/approvals.service';
import { ApprovalRequest } from '../../approvals/entities/approval-request.entity';
import {
  ApprovalEntityType,
  ApprovalRequestStatus,
} from '../../approvals/enums/approval.enum';
import { DocumentAuditAction, DocumentStatus } from '../enums/document.enum';
import { DocumentAuditService } from './document-audit.service';

@Injectable()
export class DocumentApprovalService {
  constructor(
    @InjectRepository(ProjectDocument)
    private readonly documentRepo: Repository<ProjectDocument>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(ApprovalRequest)
    private readonly requestRepo: Repository<ApprovalRequest>,
    private readonly approvalsService: ApprovalsService,
    private readonly auditService: DocumentAuditService,
  ) {}

  async submitForApproval(
    documentId: string,
    versionId: string,
    userId: string,
    note?: string,
  ) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException({
        status: 'error',
        message: 'Không tìm thấy tài liệu',
        data: null,
      });
    }

    const version = await this.versionRepo.findOne({
      where: { id: versionId, document_id: documentId },
    });
    if (!version) {
      throw new NotFoundException({
        status: 'error',
        message: 'Không tìm thấy phiên bản',
        data: null,
      });
    }

    // BR-DOC-07: 1 version = 1 active approval request tại một thời điểm
    const active = await this.requestRepo.findOne({
      where: {
        entity_type: ApprovalEntityType.DOCUMENT_VERSION,
        entity_id: versionId,
        status: In([
          ApprovalRequestStatus.PENDING,
          ApprovalRequestStatus.IN_PROGRESS,
        ]),
      },
    });
    if (active) {
      throw new ConflictException({
        status: 'error',
        message: 'Phiên bản này đã có yêu cầu duyệt đang mở (BR-DOC-07)',
        data: { request_id: active.id },
      });
    }

    const result = await this.approvalsService.submitForApproval(
      ApprovalEntityType.DOCUMENT_VERSION,
      versionId,
      userId,
      {
        document_id: documentId,
        version_number: version.version_number,
        file_name: version.file_name,
        note: note ?? null,
      },
    );

    if (!result) {
      throw new BadRequestException({
        status: 'error',
        message:
          'Chưa cấu hình workflow cho DOCUMENT_VERSION — vui lòng tạo ApprovalConfig trước',
        data: null,
      });
    }

    await this.documentRepo.update(documentId, {
      status: DocumentStatus.PENDING_APPROVAL,
    });

    this.auditService.log({
      entity_type: 'DOCUMENT_VERSION',
      entity_id: versionId,
      action: DocumentAuditAction.SUBMITTED_APPROVAL,
      actor_id: userId,
      new_data: { document_id: documentId, note: note ?? null },
    });

    return result;
  }

  /**
   * Đồng bộ trạng thái document với approval mới nhất.
   * Gọi khi: user xem document, hoặc sau khi approver action.
   */
  async syncApprovalStatus(documentId: string, versionId: string) {
    const request = await this.requestRepo.findOne({
      where: {
        entity_type: ApprovalEntityType.DOCUMENT_VERSION,
        entity_id: versionId,
      },
      order: { created_at: 'DESC' },
      relations: ['steps'],
    });

    if (!request) return null;

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });
    if (!document) return request;

    if (
      request.status === ApprovalRequestStatus.APPROVED &&
      document.status !== DocumentStatus.APPROVED
    ) {
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.APPROVED,
        approved_version_id: versionId,
      });
      this.auditService.log({
        entity_type: 'DOCUMENT_VERSION',
        entity_id: versionId,
        action: DocumentAuditAction.APPROVED,
        new_data: { request_id: request.id },
      });
    } else if (
      request.status === ApprovalRequestStatus.REJECTED &&
      document.status !== DocumentStatus.REJECTED
    ) {
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.REJECTED,
      });
      this.auditService.log({
        entity_type: 'DOCUMENT_VERSION',
        entity_id: versionId,
        action: DocumentAuditAction.REJECTED,
        new_data: { request_id: request.id },
      });
    }

    return request;
  }

  async getApprovalStatus(documentId: string) {
    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException({
        status: 'error',
        message: 'Không tìm thấy tài liệu',
        data: null,
      });
    }

    if (!document.current_version_id) {
      return {
        document_status: document.status,
        current_version_id: null,
        approval_request: null,
      };
    }

    const request = await this.syncApprovalStatus(
      documentId,
      document.current_version_id,
    );

    return {
      document_status: document.status,
      current_version_id: document.current_version_id,
      approved_version_id: document.approved_version_id,
      approval_request: request,
    };
  }
}
