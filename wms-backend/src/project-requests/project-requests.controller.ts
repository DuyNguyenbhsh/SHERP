import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectRequestsService } from './project-requests.service';
import { CreateProjectRequestDto } from './dto/create-project-request.dto';
import { UpdateProjectRequestDto } from './dto/update-project-request.dto';
import { ActionRequestDto } from './dto/action-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { ProjectRequestStatus } from './enums/request-status.enum';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';

@ApiTags('Project Requests - Yêu cầu & Phê duyệt Dự án')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('project-requests')
export class ProjectRequestsController {
  constructor(private readonly service: ProjectRequestsService) {}

  // ── STATIC ROUTES (phải đặt TRƯỚC :id) ──

  @ApiOperation({ summary: 'Danh sách yêu cầu dự án' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectRequestStatus })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @ApiOperation({ summary: 'Export danh sách yêu cầu ra Excel' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectRequestStatus })
  @Get('excel/export')
  async exportExcel(
    @Query('status') status?: string,

    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.service.exportToExcel(status);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ToTrinh_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Tạo yêu cầu dự án mới' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post()
  create(
    @Body() dto: CreateProjectRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.service.create(dto, user.userId, user.username);
  }

  @ApiOperation({ summary: 'Sửa yêu cầu (chỉ khi DRAFT)' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Xóa yêu cầu (soft delete, chỉ khi DRAFT)' })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.userId);
  }

  // ── PARAM ROUTES ──

  @ApiOperation({ summary: 'Chi tiết yêu cầu + lịch sử workflow' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Lịch sử hoạt động tờ trình (timeline)' })
  @Get(':id/activity-log')
  getActivityLog(@Param('id') id: string) {
    return this.service.getActivityLog(id);
  }

  @ApiOperation({ summary: 'Export tờ trình chi tiết (để in ký đóng dấu)' })
  @Get(':id/excel/export')
  async exportSingle(
    @Param('id') id: string,

    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.service.exportSingleToExcel(id);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ToTrinh_${id.slice(0, 8)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  // ── WORKFLOW ACTIONS ──

  @ApiOperation({ summary: 'Bước 1: Gửi đề xuất (DRAFT → SUBMITTED)' })
  @Patch(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.submit(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({
    summary: 'Bước 2: Trưởng bộ phận duyệt (SUBMITTED → DEPT_APPROVED)',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/approve-dept')
  approveDept(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.approveDept(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({
    summary:
      'Bước 3: Ban điều hành duyệt → Auto tạo Project (DEPT_APPROVED → DEPLOYED)',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/approve-exec')
  approveExec(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.approveExec(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({ summary: 'Từ chối yêu cầu' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.reject(
      id,
      req.user.userId,
      req.user.username,
      req.user.role,
      dto.comment,
    );
  }

  @ApiOperation({
    summary:
      'Yêu cầu bổ sung thông tin (SUBMITTED/DEPT_APPROVED → PENDING_INFO)',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/request-info')
  requestInfo(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.requestInfo(
      id,
      req.user.userId,
      req.user.username,
      req.user.role,
      dto.comment,
    );
  }

  @ApiOperation({
    summary: 'Cập nhật và gửi lại sau khi bổ sung (PENDING_INFO → SUBMITTED)',
  })
  @Patch(':id/resubmit')
  resubmit(
    @Param('id') id: string,
    @Body() dto: UpdateProjectRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.resubmit(id, dto, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Đính kèm file cho yêu cầu' })
  @Post(':id/attachments')
  addAttachment(
    @Param('id') requestId: string,
    @Body()
    body: {
      file_url: string;
      file_name: string;
      file_size?: number;
      uploaded_by_role?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.addAttachment(
      requestId,
      body.file_url,
      body.file_name,
      body.file_size ?? 0,
      body.uploaded_by_role ?? 'PROPOSER',
      req.user.userId,
      req.user.username,
    );
  }

  @ApiOperation({ summary: 'Xóa file đính kèm' })
  @Delete('attachments/:attId')
  removeAttachment(@Param('attId') attId: string) {
    return this.service.removeAttachment(attId);
  }

  @ApiOperation({ summary: 'Hủy yêu cầu' })
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: ActionRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.cancel(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }
}
