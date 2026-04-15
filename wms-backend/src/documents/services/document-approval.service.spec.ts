import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { DocumentApprovalService } from './document-approval.service';
import { DocumentAuditService } from './document-audit.service';
import { ProjectDocument } from '../entities/project-document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { ApprovalRequest } from '../../approvals/entities/approval-request.entity';
import { ApprovalsService } from '../../approvals/approvals.service';
import {
  ApprovalEntityType,
  ApprovalRequestStatus,
} from '../../approvals/enums/approval.enum';
import { DocumentStatus } from '../enums/document.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

describe('DocumentApprovalService', () => {
  let service: DocumentApprovalService;
  let documentRepo: ReturnType<typeof mockRepo>;
  let versionRepo: ReturnType<typeof mockRepo>;
  let requestRepo: ReturnType<typeof mockRepo>;
  let approvalsService: { submitForApproval: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    approvalsService = { submitForApproval: jest.fn() };
    audit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentApprovalService,
        { provide: getRepositoryToken(ProjectDocument), useValue: mockRepo() },
        { provide: getRepositoryToken(DocumentVersion), useValue: mockRepo() },
        { provide: getRepositoryToken(ApprovalRequest), useValue: mockRepo() },
        { provide: ApprovalsService, useValue: approvalsService },
        { provide: DocumentAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(DocumentApprovalService);
    documentRepo = module.get(getRepositoryToken(ProjectDocument));
    versionRepo = module.get(getRepositoryToken(DocumentVersion));
    requestRepo = module.get(getRepositoryToken(ApprovalRequest));
  });

  describe('submitForApproval', () => {
    it('BR-DOC-07 — reject khi đã có ApprovalRequest active', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1' });
      versionRepo.findOne.mockResolvedValue({
        id: 'v-1',
        document_id: 'doc-1',
      });
      requestRepo.findOne.mockResolvedValue({
        id: 'req-existing',
        status: ApprovalRequestStatus.PENDING,
      });

      await expect(
        service.submitForApproval('doc-1', 'v-1', 'user-1'),
      ).rejects.toThrow(ConflictException);

      expect(approvalsService.submitForApproval).not.toHaveBeenCalled();
    });

    it('happy path — gọi ApprovalsService với entity_type=DOCUMENT_VERSION', async () => {
      documentRepo.findOne.mockResolvedValue({ id: 'doc-1' });
      versionRepo.findOne.mockResolvedValue({
        id: 'v-1',
        document_id: 'doc-1',
        version_number: 'V1.2',
        file_name: 'contract.pdf',
      });
      requestRepo.findOne.mockResolvedValue(null);
      approvalsService.submitForApproval.mockResolvedValue({
        status: 'success',
        data: { id: 'req-new' },
      });

      await service.submitForApproval('doc-1', 'v-1', 'user-1', 'note');

      expect(approvalsService.submitForApproval).toHaveBeenCalledWith(
        ApprovalEntityType.DOCUMENT_VERSION,
        'v-1',
        'user-1',
        expect.objectContaining({
          document_id: 'doc-1',
          version_number: 'V1.2',
        }),
      );
      expect(documentRepo.update).toHaveBeenCalledWith('doc-1', {
        status: DocumentStatus.PENDING_APPROVAL,
      });
      expect(audit.log).toHaveBeenCalled();
    });

    it('document không tồn tại → NotFoundException', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.submitForApproval('doc-missing', 'v-1', 'u'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncApprovalStatus', () => {
    it('APPROVED → update document status + approved_version_id', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        status: ApprovalRequestStatus.APPROVED,
      });
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.PENDING_APPROVAL,
      });

      await service.syncApprovalStatus('doc-1', 'v-1');

      expect(documentRepo.update).toHaveBeenCalledWith('doc-1', {
        status: DocumentStatus.APPROVED,
        approved_version_id: 'v-1',
      });
      expect(audit.log).toHaveBeenCalled();
    });

    it('REJECTED → update document status = REJECTED', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        status: ApprovalRequestStatus.REJECTED,
      });
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.PENDING_APPROVAL,
      });

      await service.syncApprovalStatus('doc-1', 'v-1');

      expect(documentRepo.update).toHaveBeenCalledWith('doc-1', {
        status: DocumentStatus.REJECTED,
      });
    });

    it('idempotent — không update lại nếu đã APPROVED', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        status: ApprovalRequestStatus.APPROVED,
      });
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.APPROVED,
      });

      await service.syncApprovalStatus('doc-1', 'v-1');

      expect(documentRepo.update).not.toHaveBeenCalled();
    });

    it('không có approval request → return null', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      const result = await service.syncApprovalStatus('doc-1', 'v-1');
      expect(result).toBeNull();
    });
  });
});
