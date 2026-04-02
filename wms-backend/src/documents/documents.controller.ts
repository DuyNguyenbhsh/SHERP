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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Documents - Quản lý Tài liệu Dự án')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

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
}
