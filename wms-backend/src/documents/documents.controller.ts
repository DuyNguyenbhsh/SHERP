import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { DocumentVersionsService } from './services/document-versions.service';
import { DocumentApprovalService } from './services/document-approval.service';
import { DocumentAuditService } from './services/document-audit.service';
import { DocumentSearchService } from './services/document-search.service';
import { DocumentVersion } from './entities/document-version.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadVersionDto } from './dto/upload-version.dto';
import { RollbackVersionDto } from './dto/rollback-version.dto';
import { SubmitDocumentApprovalDto } from './dto/submit-approval.dto';
import { DocumentSearchDto } from './dto/document-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';

@ApiTags('Documents - Quản lý Tài liệu Dự án')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly versionsService: DocumentVersionsService,
    private readonly approvalService: DocumentApprovalService,
    private readonly auditService: DocumentAuditService,
    private readonly searchService: DocumentSearchService,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
  ) {}

  // ── FOLDERS ──

  @ApiOperation({ summary: 'Danh sách thư mục của dự án' })
  @Get('projects/:projectId/folders')
  findFolders(@Param('projectId') projectId: string) {
    return this.documentsService.findFolders(projectId);
  }

  // ── DOCUMENTS ──

  @ApiOperation({ summary: 'Tất cả tài liệu của dự án' })
  @Get('projects/:projectId/documents')
  findAllByProject(@Param('projectId') projectId: string) {
    return this.documentsService.findAllDocumentsByProject(projectId);
  }

  @ApiOperation({ summary: 'Tài liệu trong thư mục' })
  @Get('projects/:projectId/folders/:folderId/documents')
  findByFolder(@Param('folderId') folderId: string) {
    return this.documentsService.findDocumentsByFolder(folderId);
  }

  @ApiOperation({ summary: 'Tạo tài liệu mới trong thư mục' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('projects/:projectId/folders/:folderId/documents')
  createDocument(
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.createDocument(projectId, folderId, dto);
  }

  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('documents/:documentId')
  updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(documentId, dto);
  }

  @ApiOperation({ summary: 'Xóa tài liệu' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('documents/:documentId')
  removeDocument(@Param('documentId') documentId: string) {
    return this.documentsService.removeDocument(documentId);
  }

  // ── EXPIRY ──

  @ApiOperation({ summary: 'Tài liệu sắp/đã hết hạn' })
  @ApiQuery({
    name: 'days',
    required: false,
    example: 30,
    description: 'Số ngày tới hạn',
  })
  @Get('documents/expiring')
  findExpiring(@Query('days') days?: string) {
    return this.documentsService.findExpiringDocuments(
      days ? parseInt(days, 10) : 30,
    );
  }

  // ── NOTIFICATIONS ──

  @ApiOperation({ summary: 'Tạo thông báo hết hạn (chạy thủ công hoặc cron)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('documents/notifications/generate')
  generateNotifications() {
    return this.documentsService.generateNotifications();
  }

  @ApiOperation({ summary: 'Danh sách thông báo' })
  @ApiQuery({ name: 'unread', required: false, enum: ['true', 'false'] })
  @Get('documents/notifications')
  findNotifications(@Query('unread') unread?: string) {
    return this.documentsService.findNotifications(unread === 'true');
  }

  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  @Patch('documents/notifications/:notificationId/read')
  markRead(@Param('notificationId') notificationId: string) {
    return this.documentsService.markNotificationRead(notificationId);
  }

  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  @Patch('documents/notifications/read-all')
  markAllRead() {
    return this.documentsService.markAllNotificationsRead();
  }

  // ── VERSIONS (Document Control v2.1 — Sprint 1) ──

  @ApiOperation({ summary: 'Upload phiên bản mới cho tài liệu' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'change_note'],
      properties: {
        file: { type: 'string', format: 'binary' },
        change_note: {
          type: 'string',
          minLength: 10,
          example: 'Cập nhật BOQ theo yêu cầu CĐT',
        },
      },
    },
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('documents/:documentId/versions')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVersion(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const version = await this.versionsService.uploadNewVersion(
      documentId,
      file,
      dto.change_note,
      req.user.userId,
    );
    return {
      status: 'success',
      message: `Tải lên phiên bản ${version.version_number} thành công`,
      data: version,
    };
  }

  @ApiOperation({ summary: 'Danh sách phiên bản của tài liệu' })
  @Get('documents/:documentId/versions')
  async listVersions(@Param('documentId') documentId: string) {
    const versions = await this.versionsService.findVersions(documentId);
    return {
      status: 'success',
      message: 'Lấy danh sách phiên bản thành công',
      data: versions,
    };
  }

  @ApiOperation({ summary: 'Chi tiết một phiên bản tài liệu' })
  @Get('documents/:documentId/versions/:versionId')
  async getVersion(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.versionsService.findVersionById(
      documentId,
      versionId,
    );
    return {
      status: 'success',
      message: 'Lấy phiên bản thành công',
      data: version,
    };
  }

  // ── Sprint 2: Rollback & Archive ──

  @ApiOperation({ summary: 'Rollback về phiên bản này (tạo phiên bản mới)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('documents/:documentId/versions/:versionId/rollback')
  async rollback(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Body() dto: RollbackVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const version = await this.versionsService.rollbackToVersion(
      documentId,
      versionId,
      dto.reason,
      req.user.userId,
    );
    return {
      status: 'success',
      message: `Rollback thành công sang phiên bản ${version.version_number}`,
      data: version,
    };
  }

  @ApiOperation({ summary: 'Đánh dấu phiên bản là archived' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('documents/:documentId/versions/:versionId/archive')
  async archiveVersion(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.versionsService.archiveVersion(
      documentId,
      versionId,
    );
    return {
      status: 'success',
      message: 'Đã archive phiên bản',
      data: version,
    };
  }

  // ── Sprint 3: Link với Approvals ──

  @ApiOperation({ summary: 'Gửi phiên bản tài liệu đi phê duyệt' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('documents/:documentId/versions/:versionId/submit-approval')
  async submitApproval(
    @Param('documentId') documentId: string,
    @Param('versionId') versionId: string,
    @Body() dto: SubmitDocumentApprovalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.approvalService.submitForApproval(
      documentId,
      versionId,
      req.user.userId,
      dto.note,
    );
    return result;
  }

  @ApiOperation({
    summary: 'Trạng thái phê duyệt hiện tại của tài liệu (auto-sync)',
  })
  @Get('documents/:documentId/approval-status')
  async getApprovalStatus(@Param('documentId') documentId: string) {
    const data = await this.approvalService.getApprovalStatus(documentId);
    return {
      status: 'success',
      message: 'Lấy trạng thái phê duyệt thành công',
      data,
    };
  }

  // ── Sprint 4: Search & Audit ──

  @ApiOperation({ summary: 'Tìm kiếm tài liệu (full-text + filter)' })
  @Get('documents/search')
  async searchDocuments(@Query() dto: DocumentSearchDto) {
    const { total, items } = await this.searchService.search(dto);
    return {
      status: 'success',
      message: `Tìm thấy ${total} tài liệu`,
      data: { total, items, limit: dto.limit ?? 20, offset: dto.offset ?? 0 },
    };
  }

  @ApiOperation({
    summary: 'Nhật ký hoạt động của tài liệu (document + all versions)',
  })
  @RequirePrivilege('VIEW_AUDIT')
  @Get('documents/:documentId/audit-logs')
  async getDocumentAuditLogs(@Param('documentId') documentId: string) {
    const versions = await this.versionRepo.find({
      where: { document_id: documentId },
      select: ['id'],
    });
    const versionIds = versions.map((v) => v.id);
    const logs = await this.auditService.findByDocumentAggregated(
      documentId,
      versionIds,
    );
    return {
      status: 'success',
      message: 'Lấy nhật ký hoạt động thành công',
      data: logs,
    };
  }
}
