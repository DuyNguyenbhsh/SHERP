import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { IncidentsService } from './incidents.service';
import { IncidentExportService } from './incident-export.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReopenRequestDto } from './dto/create-reopen-request.dto';
import { CreateAssigneeChangeRequestDto } from './dto/create-assignee-change-request.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { IncidentStatus } from './enums/incident.enum';

@ApiTags('Incidents - Sự cố / Hư hỏng')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller()
export class IncidentsController {
  constructor(
    private readonly service: IncidentsService,
    private readonly exporter: IncidentExportService,
  ) {}

  // ── Incident CRUD + state transitions ─────────────────
  @ApiOperation({ summary: 'Tạo sự cố mới — sinh mã IC-YYMMDD-XXX' })
  @ApiResponse({ status: 201 })
  @RequirePrivilege('REPORT_INCIDENT')
  @Post('incidents')
  create(@Body() dto: CreateIncidentDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.employeeId || req.user.userId);
  }

  @ApiOperation({ summary: 'Liệt kê sự cố (filter: project/status/assignee)' })
  @RequirePrivilege('VIEW_INCIDENT')
  @Get('incidents')
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: IncidentStatus,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.service.list({ projectId, status, assigneeId });
  }

  @ApiOperation({ summary: 'Chi tiết sự cố + ảnh + timeline comment' })
  @RequirePrivilege('VIEW_INCIDENT')
  @Get('incidents/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Giao việc (NEW → IN_PROGRESS)' })
  @RequirePrivilege('ASSIGN_INCIDENT')
  @Patch('incidents/:id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignIncidentDto) {
    return this.service.assign(id, dto);
  }

  @ApiOperation({
    summary:
      'Báo xong (IN_PROGRESS → RESOLVED) — BR-INC-05 cần AFTER_FIX photos',
  })
  @RequirePrivilege('RESOLVE_INCIDENT')
  @Post('incidents/:id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveIncidentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.resolve(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Đóng sự cố (RESOLVED → COMPLETED) — QLDA verify' })
  @RequirePrivilege('CLOSE_INCIDENT')
  @Post('incidents/:id/close')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  // ── Photos + Comments ────────────────────────────────
  @ApiOperation({
    summary: 'Upload ảnh bằng chứng (evidence / before / after)',
  })
  @RequirePrivilege('REPORT_INCIDENT')
  @Post('incidents/:id/photos')
  addPhoto(
    @Param('id') id: string,
    @Body() dto: UploadPhotoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.addPhoto(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Thêm comment vào timeline' })
  @RequirePrivilege('VIEW_INCIDENT')
  @Post('incidents/:id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.addComment(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  // ── Reopen sub-flow ──────────────────────────────────
  @ApiOperation({
    summary: 'Yêu cầu mở lại sự cố (COMPLETED → NEW cần approval)',
  })
  @RequirePrivilege('VIEW_INCIDENT')
  @Post('incidents/:id/reopen-requests')
  requestReopen(
    @Param('id') id: string,
    @Body() dto: CreateReopenRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.requestReopen(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Phê duyệt yêu cầu reopen' })
  @RequirePrivilege('APPROVE_INCIDENT_REOPEN')
  @Post('incident-reopen-requests/:id/approve')
  approveReopen(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.decideReopen(id, true, dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Từ chối yêu cầu reopen' })
  @RequirePrivilege('APPROVE_INCIDENT_REOPEN')
  @Post('incident-reopen-requests/:id/reject')
  rejectReopen(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.decideReopen(id, false, dto, req.user.userId);
  }

  // ── Assignee change sub-flow ─────────────────────────
  @ApiOperation({ summary: 'Yêu cầu đổi người phụ trách (cần approval)' })
  @RequirePrivilege('ASSIGN_INCIDENT')
  @Post('incidents/:id/assignee-change-requests')
  requestChange(
    @Param('id') id: string,
    @Body() dto: CreateAssigneeChangeRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.requestAssigneeChange(
      id,
      dto,
      req.user.employeeId || req.user.userId,
    );
  }

  @ApiOperation({ summary: 'Phê duyệt đổi assignee' })
  @RequirePrivilege('APPROVE_ASSIGNEE_CHANGE')
  @Post('incident-assignee-change-requests/:id/approve')
  approveChange(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.decideAssigneeChange(id, true, dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Từ chối đổi assignee' })
  @RequirePrivilege('APPROVE_ASSIGNEE_CHANGE')
  @Post('incident-assignee-change-requests/:id/reject')
  rejectChange(
    @Param('id') id: string,
    @Body() dto: DecideRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.decideAssigneeChange(id, false, dto, req.user.userId);
  }

  // ── Export .docx (BR-INC-06) ──────────────────────────
  @ApiOperation({ summary: 'Xuất báo cáo .docx cho 1 sự cố' })
  @RequirePrivilege('EXPORT_INCIDENT')
  @Get('incidents/:id/export')
  async export(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename, mimeType } = await this.exporter.exportToDocx(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
