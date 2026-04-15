import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { DocumentVersionsService } from './document-versions.service';
import { DocumentAuditService } from './document-audit.service';
import { ProjectDocument } from '../entities/project-document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { CloudStorageService } from '../../shared/cloud-storage';
import { DocumentStatus } from '../enums/document.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data: unknown) => data),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
});

const makeFile = (
  buffer: Buffer,
  mimetype = 'application/pdf',
): Express.Multer.File =>
  ({
    buffer,
    size: buffer.length,
    mimetype,
    originalname: 'test.pdf',
    fieldname: 'file',
    encoding: '7bit',
    stream: undefined,
    destination: '',
    filename: '',
    path: '',
  }) as unknown as Express.Multer.File;

describe('DocumentVersionsService', () => {
  let service: DocumentVersionsService;
  let documentRepo: ReturnType<typeof mockRepo>;
  let versionRepo: ReturnType<typeof mockRepo>;
  let cloudStorage: { upload: jest.Mock };
  let audit: { log: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    cloudStorage = { upload: jest.fn() };
    audit = { log: jest.fn() };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentVersionsService,
        { provide: getRepositoryToken(ProjectDocument), useValue: mockRepo() },
        { provide: getRepositoryToken(DocumentVersion), useValue: mockRepo() },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: CloudStorageService, useValue: cloudStorage },
        { provide: DocumentAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(DocumentVersionsService);
    documentRepo = module.get(getRepositoryToken(ProjectDocument));
    versionRepo = module.get(getRepositoryToken(DocumentVersion));
  });

  describe('uploadNewVersion', () => {
    it('BR-DOC-03 — reject duplicate checksum', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        project_id: 'proj-1',
        status: DocumentStatus.DRAFT,
      });
      versionRepo.findOne.mockResolvedValue({
        id: 'v-existing',
        version_number: 'V1.2',
      });

      const file = makeFile(Buffer.from('same-content'));
      await expect(
        service.uploadNewVersion(
          'doc-1',
          file,
          'Upload lại file trùng',
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);

      expect(cloudStorage.upload).not.toHaveBeenCalled();
    });

    it('BR-DOC-08 — cấm upload khi document đang PENDING_APPROVAL', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        project_id: 'proj-1',
        status: DocumentStatus.PENDING_APPROVAL,
      });

      const file = makeFile(Buffer.from('new content'));
      await expect(
        service.uploadNewVersion(
          'doc-1',
          file,
          'Cố upload khi pending',
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('document không tồn tại → NotFoundException', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      const file = makeFile(Buffer.from('x'));
      await expect(
        service.uploadNewVersion('doc-missing', file, 'Note hợp lệ', 'u'),
      ).rejects.toThrow(NotFoundException);
    });

    it('reject file > 50MB', async () => {
      const bigBuffer = Buffer.alloc(51 * 1024 * 1024);
      const file = makeFile(bigBuffer);
      await expect(
        service.uploadNewVersion('doc-1', file, 'File quá lớn', 'u'),
      ).rejects.toThrow(/50MB/);
    });

    it('reject mime type không hỗ trợ', async () => {
      const file = makeFile(Buffer.from('fake'), 'application/x-sh');
      await expect(
        service.uploadNewVersion('doc-1', file, 'File không hỗ trợ', 'u'),
      ).rejects.toThrow(/không hỗ trợ/);
    });
  });

  describe('rollbackToVersion', () => {
    it('BR-DOC-06 — cấm rollback khi đang PENDING_APPROVAL', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.PENDING_APPROVAL,
      });

      await expect(
        service.rollbackToVersion(
          'doc-1',
          'v-source',
          'Lý do hợp lệ đủ dài',
          'u',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('source version không tồn tại → NotFoundException', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        status: DocumentStatus.DRAFT,
      });
      versionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rollbackToVersion('doc-1', 'v-missing', 'Lý do đủ dài', 'u'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveVersion', () => {
    it('cấm archive version hiện tại (current_version_id)', async () => {
      versionRepo.findOne.mockResolvedValue({
        id: 'v-1',
        document_id: 'doc-1',
      });
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        current_version_id: 'v-1',
      });

      await expect(service.archiveVersion('doc-1', 'v-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
