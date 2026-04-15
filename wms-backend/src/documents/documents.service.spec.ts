import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DocumentsService } from './documents.service';
import { ProjectFolder } from './entities/project-folder.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentNotification } from './entities/document-notification.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});

describe('DocumentsService — Skeleton', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(ProjectFolder), useValue: mockRepo() },
        { provide: getRepositoryToken(ProjectDocument), useValue: mockRepo() },
        {
          provide: getRepositoryToken(DocumentNotification),
          useValue: mockRepo(),
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO (Gate 4): Theo TEST_DOCUMENT_MODULE.md
  it.todo(
    'createDefaultFolders() không tạo duplicate khi project đã có folder',
  );
  it.todo('uploadDocument() validate file size + mime type');
  it.todo('uploadDocument() sinh DocumentNotification cho stakeholder');
  it.todo('softDelete() không xóa cứng record trong DB');
});
