import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectDocument } from '../entities/project-document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { CloudStorageService } from '../../shared/cloud-storage';
import { calculateChecksum } from '../domain/logic/checksum.calculator';
import { nextVersionNumber } from '../domain/logic/version-number.calculator';
import { DocumentAuditAction, DocumentStatus } from '../enums/document.enum';
import { DocumentAuditService } from './document-audit.service';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/zip',
  'application/x-zip-compressed',
  'image/',
  'application/acad',
  'application/dxf',
  'application/octet-stream',
];

@Injectable()
export class DocumentVersionsService {
  constructor(
    @InjectRepository(ProjectDocument)
    private readonly documentRepo: Repository<ProjectDocument>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cloudStorage: CloudStorageService,
    private readonly auditService: DocumentAuditService,
  ) {}

  async uploadNewVersion(
    documentId: string,
    file: Express.Multer.File,
    changeNote: string,
    userId: string,
  ): Promise<DocumentVersion> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        status: 'error',
        message: 'Không tìm thấy file để upload',
        data: null,
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException({
        status: 'error',
        message: `File vượt quá giới hạn 50MB`,
        data: null,
      });
    }

    if (
      file.mimetype &&
      !ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p))
    ) {
      throw new BadRequestException({
        status: 'error',
        message: `Định dạng file không hỗ trợ: ${file.mimetype}`,
        data: null,
      });
    }

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

    if (document.status === DocumentStatus.PENDING_APPROVAL) {
      throw new ConflictException({
        status: 'error',
        message:
          'Tài liệu đang chờ duyệt — không thể upload phiên bản mới (BR-DOC-08)',
        data: null,
      });
    }

    const checksum = calculateChecksum(file.buffer);

    const duplicate = await this.versionRepo.findOne({
      where: { document_id: documentId, checksum },
    });
    if (duplicate) {
      throw new ConflictException({
        status: 'error',
        message: `File không thay đổi so với phiên bản ${duplicate.version_number} (BR-DOC-03)`,
        data: null,
      });
    }

    const uploaded = await this.cloudStorage.upload(
      file,
      `documents/${document.project_id}/${documentId}`,
    );

    return this.dataSource.transaction(async (manager) => {
      const latest = await manager
        .getRepository(DocumentVersion)
        .createQueryBuilder('v')
        .where('v.document_id = :id', { id: documentId })
        .orderBy('v.version_seq', 'DESC')
        .setLock('pessimistic_write')
        .getOne();

      const { seq, label } = nextVersionNumber(latest ? latest.version_seq : 0);

      const version = manager.getRepository(DocumentVersion).create({
        document_id: documentId,
        version_number: label,
        version_seq: seq,
        file_url: uploaded.secure_url,
        cloudinary_public_id: uploaded.public_id,
        file_name: uploaded.file_name,
        file_size: String(uploaded.file_size),
        mime_type: file.mimetype,
        checksum,
        change_note: changeNote,
        source_version_id: null,
        uploaded_by: userId,
      });
      const saved = await manager.getRepository(DocumentVersion).save(version);

      await manager.getRepository(ProjectDocument).update(documentId, {
        current_version_id: saved.id,
        file_url: uploaded.secure_url,
        mime_type: file.mimetype,
        status:
          document.status === DocumentStatus.APPROVED
            ? DocumentStatus.DRAFT
            : document.status,
      });

      this.auditService.log({
        entity_type: 'DOCUMENT_VERSION',
        entity_id: saved.id,
        action: DocumentAuditAction.UPLOADED_VERSION,
        actor_id: userId,
        new_data: {
          document_id: documentId,
          version_number: saved.version_number,
          file_name: saved.file_name,
          checksum: saved.checksum,
        },
      });

      return saved;
    });
  }

  async findVersions(documentId: string): Promise<DocumentVersion[]> {
    return this.versionRepo.find({
      where: { document_id: documentId },
      order: { version_seq: 'DESC' },
    });
  }

  async findVersionById(
    documentId: string,
    versionId: string,
  ): Promise<DocumentVersion> {
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
    return version;
  }

  // ── Sprint 2: Rollback & Archive ──

  async rollbackToVersion(
    documentId: string,
    sourceVersionId: string,
    reason: string,
    userId: string,
  ): Promise<DocumentVersion> {
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

    // BR-DOC-06: Cấm rollback khi đang chờ duyệt
    if (document.status === DocumentStatus.PENDING_APPROVAL) {
      throw new ConflictException({
        status: 'error',
        message: 'Tài liệu đang chờ duyệt — không thể rollback (BR-DOC-06)',
        data: null,
      });
    }

    const source = await this.versionRepo.findOne({
      where: { id: sourceVersionId, document_id: documentId },
    });
    if (!source) {
      throw new NotFoundException({
        status: 'error',
        message: 'Không tìm thấy phiên bản nguồn để rollback',
        data: null,
      });
    }

    return this.dataSource.transaction(async (manager) => {
      const latest = await manager
        .getRepository(DocumentVersion)
        .createQueryBuilder('v')
        .where('v.document_id = :id', { id: documentId })
        .orderBy('v.version_seq', 'DESC')
        .setLock('pessimistic_write')
        .getOne();

      const { seq, label } = nextVersionNumber(latest ? latest.version_seq : 0);

      // BR-DOC-05: Rollback = tạo version mới trỏ về source_version_id (không ghi đè)
      const rollbackVersion = manager.getRepository(DocumentVersion).create({
        document_id: documentId,
        version_number: label,
        version_seq: seq,
        file_url: source.file_url,
        cloudinary_public_id: source.cloudinary_public_id,
        file_name: source.file_name,
        file_size: source.file_size,
        mime_type: source.mime_type,
        checksum: source.checksum,
        change_note: `Rollback từ ${source.version_number}: ${reason}`,
        source_version_id: source.id,
        uploaded_by: userId,
      });
      const saved = await manager
        .getRepository(DocumentVersion)
        .save(rollbackVersion);

      await manager.getRepository(ProjectDocument).update(documentId, {
        current_version_id: saved.id,
        file_url: source.file_url,
        mime_type: source.mime_type,
        status: DocumentStatus.DRAFT,
      });

      this.auditService.log({
        entity_type: 'DOCUMENT_VERSION',
        entity_id: saved.id,
        action: DocumentAuditAction.ROLLBACK,
        actor_id: userId,
        old_data: {
          source_version_id: source.id,
          source_version: source.version_number,
        },
        new_data: { version_number: saved.version_number, reason },
      });

      return saved;
    });
  }

  async archiveVersion(
    documentId: string,
    versionId: string,
  ): Promise<DocumentVersion> {
    const version = await this.findVersionById(documentId, versionId);

    const document = await this.documentRepo.findOne({
      where: { id: documentId },
    });
    if (document?.current_version_id === versionId) {
      throw new ConflictException({
        status: 'error',
        message:
          'Không thể archive phiên bản hiện tại — upload hoặc rollback sang phiên bản khác trước',
        data: null,
      });
    }

    version.is_archived = true;
    const saved = await this.versionRepo.save(version);

    this.auditService.log({
      entity_type: 'DOCUMENT_VERSION',
      entity_id: versionId,
      action: DocumentAuditAction.ARCHIVED,
      new_data: { version_number: version.version_number },
    });

    return saved;
  }
}
