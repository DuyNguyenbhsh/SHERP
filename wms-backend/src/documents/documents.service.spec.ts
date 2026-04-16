import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { DocumentsService } from './documents.service';
import { ProjectFolder } from './entities/project-folder.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentNotification } from './entities/document-notification.entity';
import {
  DEFAULT_FOLDERS,
  DocumentStatus,
  NotificationType,
} from './enums/document.enum';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((x) => (Array.isArray(x) ? x : { id: 'uuid', ...x })),
  create: jest.fn((x) => x),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let folderRepo: ReturnType<typeof mockRepo>;
  let documentRepo: ReturnType<typeof mockRepo>;
  let notificationRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const folderRepoMock = mockRepo();
    const documentRepoMock = mockRepo();
    const notificationRepoMock = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(ProjectFolder),
          useValue: folderRepoMock,
        },
        {
          provide: getRepositoryToken(ProjectDocument),
          useValue: documentRepoMock,
        },
        {
          provide: getRepositoryToken(DocumentNotification),
          useValue: notificationRepoMock,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    folderRepo = folderRepoMock;
    documentRepo = documentRepoMock;
    notificationRepo = notificationRepoMock;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── createDefaultFolders() ──
  describe('createDefaultFolders()', () => {
    it('KHÔNG tạo duplicate khi project đã có folder', async () => {
      folderRepo.count.mockResolvedValue(5);
      await service.createDefaultFolders('prj-1');
      expect(folderRepo.save).not.toHaveBeenCalled();
    });

    it('tạo đủ DEFAULT_FOLDERS khi project chưa có folder', async () => {
      folderRepo.count.mockResolvedValue(0);
      await service.createDefaultFolders('prj-1');
      expect(folderRepo.create).toHaveBeenCalledTimes(DEFAULT_FOLDERS.length);
      expect(folderRepo.save).toHaveBeenCalled();
    });
  });

  // ── createDocument() ──
  describe('createDocument()', () => {
    it('throws NotFound khi folder không tồn tại', async () => {
      folderRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createDocument('prj-1', 'folder-missing', {
          document_name: 'Doc A',
          file_url: '/x.pdf',
          mime_type: 'application/pdf',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('status=VALID khi không có expiry_date', async () => {
      folderRepo.findOne.mockResolvedValue({ id: 'f-1', project_id: 'prj-1' });
      const result = await service.createDocument('prj-1', 'f-1', {
        document_name: 'Doc A',
        file_url: '/x.pdf',
        mime_type: 'application/pdf',
      } as any);
      expect((result.data as any).status).toBe(DocumentStatus.VALID);
    });

    it('status=EXPIRED khi expiry_date đã qua', async () => {
      folderRepo.findOne.mockResolvedValue({ id: 'f-1', project_id: 'prj-1' });
      const past = new Date();
      past.setDate(past.getDate() - 10);

      const result = await service.createDocument('prj-1', 'f-1', {
        document_name: 'Doc B',
        file_url: '/b.pdf',
        mime_type: 'application/pdf',
        expiry_date: past.toISOString(),
      } as any);
      expect((result.data as any).status).toBe(DocumentStatus.EXPIRED);
    });

    it('status=EXPIRING_SOON khi expiry_date trong 30 ngày tới', async () => {
      folderRepo.findOne.mockResolvedValue({ id: 'f-1', project_id: 'prj-1' });
      const soon = new Date();
      soon.setDate(soon.getDate() + 10);

      const result = await service.createDocument('prj-1', 'f-1', {
        document_name: 'Doc C',
        file_url: '/c.pdf',
        mime_type: 'application/pdf',
        expiry_date: soon.toISOString(),
      } as any);
      expect((result.data as any).status).toBe(DocumentStatus.EXPIRING_SOON);
    });
  });

  // ── updateDocument() ──
  describe('updateDocument()', () => {
    it('throws NotFound khi document không tồn tại', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateDocument('missing', { document_name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('cập nhật status khi đổi expiry_date', async () => {
      const doc = {
        id: 'doc-1',
        document_name: 'Doc',
        expiry_date: null,
        status: DocumentStatus.VALID,
      };
      documentRepo.findOne.mockResolvedValue(doc);
      const past = new Date();
      past.setDate(past.getDate() - 1);

      const result = await service.updateDocument('doc-1', {
        expiry_date: past.toISOString(),
      } as any);
      expect((result.data as any).status).toBe(DocumentStatus.EXPIRED);
    });
  });

  // ── removeDocument() ──
  describe('removeDocument()', () => {
    it('throws NotFound khi document không tồn tại', async () => {
      documentRepo.findOne.mockResolvedValue(null);
      await expect(service.removeDocument('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('gọi delete sau khi verify tồn tại', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        document_name: 'X',
      });
      await service.removeDocument('doc-1');
      expect(documentRepo.delete).toHaveBeenCalledWith('doc-1');
    });
  });

  // ── generateNotifications() ──
  describe('generateNotifications()', () => {
    it('không tạo notification nào khi không có document có expiry', async () => {
      documentRepo.find.mockResolvedValue([]);
      const result = await service.generateNotifications();
      expect((result.data as any).created).toBe(0);
      expect(notificationRepo.save).not.toHaveBeenCalled();
    });

    it('tạo EXPIRED notification khi document quá hạn và chưa từng có notif EXPIRED', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      documentRepo.find.mockResolvedValue([
        {
          id: 'doc-1',
          expiry_date: past,
          notifications: [],
        },
      ]);

      await service.generateNotifications();
      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: 'doc-1',
          notification_type: NotificationType.EXPIRED,
        }),
      );
    });

    it('không duplicate notification cùng loại đã tồn tại', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      documentRepo.find.mockResolvedValue([
        {
          id: 'doc-1',
          expiry_date: past,
          notifications: [{ notification_type: NotificationType.EXPIRED }],
        },
      ]);

      const result = await service.generateNotifications();
      expect((result.data as any).created).toBe(0);
    });

    it('tạo EXPIRING_7_DAYS cho document sắp hết hạn trong 7 ngày', async () => {
      const in5days = new Date();
      in5days.setDate(in5days.getDate() + 5);
      documentRepo.find.mockResolvedValue([
        {
          id: 'doc-1',
          expiry_date: in5days,
          notifications: [],
        },
      ]);

      await service.generateNotifications();
      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_type: NotificationType.EXPIRING_7_DAYS,
        }),
      );
    });
  });

  // ── markNotificationRead() ──
  describe('markNotificationRead()', () => {
    it('throws NotFound khi notification không tồn tại', async () => {
      notificationRepo.findOne.mockResolvedValue(null);
      await expect(service.markNotificationRead('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('đặt is_read = true và save', async () => {
      const notif = { id: 'n-1', is_read: false };
      notificationRepo.findOne.mockResolvedValue(notif);
      await service.markNotificationRead('n-1');
      expect(notif.is_read).toBe(true);
      expect(notificationRepo.save).toHaveBeenCalledWith(notif);
    });
  });
});
