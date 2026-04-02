import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, IsNull, Not } from 'typeorm';
import { ProjectFolder } from './entities/project-folder.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { DocumentNotification } from './entities/document-notification.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import {
  DEFAULT_FOLDERS,
  DocumentStatus,
  NotificationType,
} from './enums/document.enum';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ProjectFolder)
    private folderRepo: Repository<ProjectFolder>,
    @InjectRepository(ProjectDocument)
    private documentRepo: Repository<ProjectDocument>,
    @InjectRepository(DocumentNotification)
    private notificationRepo: Repository<DocumentNotification>,
  ) {}

  // ── AUTO-CREATE DEFAULT FOLDERS ──

  async createDefaultFolders(projectId: string) {
    const existing = await this.folderRepo.count({
      where: { project_id: projectId },
    });
    if (existing > 0) return; // Đã tạo rồi

    const folders = DEFAULT_FOLDERS.map((f) =>
      this.folderRepo.create({
        project_id: projectId,
        folder_code: f.code,
        folder_name: f.name,
        sort_order: f.sortOrder,
      }),
    );
    await this.folderRepo.save(folders);
  }

  // ── FOLDERS ──

  async findFolders(projectId: string) {
    const folders = await this.folderRepo.find({
      where: { project_id: projectId },
      relations: ['documents'],
      order: { sort_order: 'ASC' },
    });

    // Tính document status theo ngày hết hạn
    for (const folder of folders) {
      for (const doc of folder.documents ?? []) {
        doc.status = this.computeStatus(doc.expiry_date);
      }
    }

    return {
      status: 'success',
      message: `Tìm thấy ${folders.length} thư mục`,
      data: folders,
    };
  }

  // ── DOCUMENTS ──

  async findDocumentsByFolder(folderId: string) {
    const docs = await this.documentRepo.find({
      where: { folder_id: folderId },
      order: { created_at: 'DESC' },
    });

    for (const doc of docs) {
      doc.status = this.computeStatus(doc.expiry_date);
    }

    return {
      status: 'success',
      message: `Tìm thấy ${docs.length} tài liệu`,
      data: docs,
    };
  }

  async findAllDocumentsByProject(projectId: string) {
    const docs = await this.documentRepo.find({
      where: { project_id: projectId },
      relations: ['folder'],
      order: { created_at: 'DESC' },
    });

    for (const doc of docs) {
      doc.status = this.computeStatus(doc.expiry_date);
    }

    return {
      status: 'success',
      message: `Tìm thấy ${docs.length} tài liệu`,
      data: docs,
    };
  }

  async createDocument(
    projectId: string,
    folderId: string,
    dto: CreateDocumentDto,
  ) {
    const folder = await this.folderRepo.findOne({
      where: { id: folderId, project_id: projectId },
    });
    if (!folder) {
      throw new NotFoundException({
        status: 'error',
        message: 'Thư mục không tồn tại!',
        data: null,
      });
    }

    const doc = this.documentRepo.create({
      folder_id: folderId,
      project_id: projectId,
      document_name: dto.document_name,
      file_url: dto.file_url,
      mime_type: dto.mime_type,
      expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : undefined,
      notes: dto.notes,
      status: dto.expiry_date
        ? this.computeStatus(new Date(dto.expiry_date))
        : DocumentStatus.VALID,
    });

    const saved = await this.documentRepo.save(doc);

    return {
      status: 'success',
      message: `Tạo tài liệu "${saved.document_name}" thành công`,
      data: saved,
    };
  }

  async updateDocument(documentId: string, dto: UpdateDocumentDto) {
    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException({
        status: 'error',
        message: 'Tài liệu không tồn tại!',
        data: null,
      });
    }

    Object.assign(doc, dto);
    if (dto.expiry_date) {
      doc.expiry_date = new Date(dto.expiry_date);
      doc.status = this.computeStatus(doc.expiry_date);
    }

    const saved = await this.documentRepo.save(doc);

    return {
      status: 'success',
      message: `Cập nhật tài liệu "${saved.document_name}" thành công`,
      data: saved,
    };
  }

  async removeDocument(documentId: string) {
    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException({
        status: 'error',
        message: 'Tài liệu không tồn tại!',
        data: null,
      });
    }

    await this.documentRepo.delete(documentId);

    return {
      status: 'success',
      message: `Xóa tài liệu "${doc.document_name}" thành công`,
      data: null,
    };
  }

  // ── EXPIRY & NOTIFICATIONS ──

  async findExpiringDocuments(days: number = 30) {
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    const docs = await this.documentRepo.find({
      where: {
        expiry_date: LessThanOrEqual(threshold),
        ...(days > 0 ? {} : {}),
      },
      relations: ['folder'],
      order: { expiry_date: 'ASC' },
    });

    // Lọc chỉ những document có expiry_date (not null) và trong khoảng
    const filtered = docs.filter((d) => d.expiry_date != null);

    for (const doc of filtered) {
      doc.status = this.computeStatus(doc.expiry_date);
    }

    return {
      status: 'success',
      message: `Tìm thấy ${filtered.length} tài liệu sắp/đã hết hạn`,
      data: filtered,
    };
  }

  async generateNotifications() {
    const now = new Date();
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    // Tìm tất cả documents có expiry_date
    const allDocs = await this.documentRepo.find({
      where: { expiry_date: Not(IsNull()) },
      relations: ['notifications'],
    });

    const newNotifications: Partial<DocumentNotification>[] = [];

    for (const doc of allDocs) {
      if (!doc.expiry_date) continue;
      const expiry = new Date(doc.expiry_date);
      const existingTypes = new Set(
        (doc.notifications ?? []).map((n) => n.notification_type),
      );

      if (expiry <= now && !existingTypes.has(NotificationType.EXPIRED)) {
        newNotifications.push({
          document_id: doc.id,
          notification_type: NotificationType.EXPIRED,
        });
      } else if (
        expiry <= in7 &&
        expiry > now &&
        !existingTypes.has(NotificationType.EXPIRING_7_DAYS)
      ) {
        newNotifications.push({
          document_id: doc.id,
          notification_type: NotificationType.EXPIRING_7_DAYS,
        });
      } else if (
        expiry <= in30 &&
        expiry > in7 &&
        !existingTypes.has(NotificationType.EXPIRING_30_DAYS)
      ) {
        newNotifications.push({
          document_id: doc.id,
          notification_type: NotificationType.EXPIRING_30_DAYS,
        });
      }

      // Cập nhật status trên document
      doc.status = this.computeStatus(expiry);
    }

    if (allDocs.length > 0) {
      await this.documentRepo.save(allDocs);
    }

    if (newNotifications.length > 0) {
      await this.notificationRepo.save(
        newNotifications.map((n) => this.notificationRepo.create(n)),
      );
    }

    return {
      status: 'success',
      message: `Tạo ${newNotifications.length} thông báo mới`,
      data: { created: newNotifications.length },
    };
  }

  async findNotifications(unreadOnly: boolean = false) {
    const where: any = {};
    if (unreadOnly) where.is_read = false;

    const notifications = await this.notificationRepo.find({
      where,
      relations: ['document', 'document.folder'],
      order: { created_at: 'DESC' },
    });

    return {
      status: 'success',
      message: `Tìm thấy ${notifications.length} thông báo`,
      data: notifications,
    };
  }

  async markNotificationRead(notificationId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException({
        status: 'error',
        message: 'Thông báo không tồn tại!',
        data: null,
      });
    }

    notification.is_read = true;
    await this.notificationRepo.save(notification);

    return { status: 'success', message: 'Đã đánh dấu đã đọc', data: null };
  }

  async markAllNotificationsRead() {
    await this.notificationRepo.update({ is_read: false }, { is_read: true });
    return {
      status: 'success',
      message: 'Đã đánh dấu tất cả đã đọc',
      data: null,
    };
  }

  // ── HELPERS ──

  private computeStatus(expiryDate: Date | null | undefined): DocumentStatus {
    if (!expiryDate) return DocumentStatus.VALID;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays <= 0) return DocumentStatus.EXPIRED;
    if (diffDays <= 30) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.VALID;
  }
}
