import {
  Controller,
  Get,
  Post,
  Patch,
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
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ProjectPlansService } from './project-plans.service';
import { CreatePlanDto, PlanActionDto } from './dto/create-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Project Plans - Kế hoạch Thi công (PROJ1)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('project-plans')
export class ProjectPlansController {
  constructor(private readonly service: ProjectPlansService) {}

  // ── STATIC ROUTES (trước :id) ──

  @ApiOperation({ summary: 'Thông báo kế hoạch cho user hiện tại' })
  @Get('notifications')
  findNotifications(@Req() req: AuthenticatedRequest) {
    return this.service.findNotifications(req.user.userId);
  }

  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  @Patch('notifications/:notifId/read')
  markRead(@Param('notifId') notifId: string) {
    return this.service.markNotificationRead(notifId);
  }

  @ApiOperation({ summary: 'Danh sách kế hoạch theo dự án' })
  @ApiQuery({ name: 'project_id', required: true })
  @Get()
  findByProject(@Query('project_id') projectId: string) {
    return this.service.findByProject(projectId);
  }

  @ApiOperation({ summary: 'Tạo kế hoạch thi công mới' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post()
  create(@Body() dto: CreatePlanDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.userId, req.user.username);
  }

  // ── PARAM ROUTES ──

  @ApiOperation({ summary: 'Chi tiết kế hoạch + lịch sử phê duyệt' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật kế hoạch (chỉ khi DRAFT)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Export kế hoạch ra Excel (để in/lưu hồ sơ)' })
  @Get(':id/excel/export')
  async exportExcel(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.service.exportPlanToExcel(id);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="KeHoach_${id.slice(0, 8)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  // ── WORKFLOW ACTIONS ──

  @ApiOperation({
    summary: 'Trình duyệt kế hoạch (DRAFT → SUBMITTED) — Khóa dữ liệu',
  })
  @Patch(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: PlanActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.submitPlan(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({
    summary: 'Xem xét kế hoạch (SUBMITTED → REVIEWED) — PM review',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Body() dto: PlanActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.reviewPlan(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({
    summary:
      'Phê duyệt cuối cùng (REVIEWED → APPROVED) — Set Baseline + Freeze vĩnh viễn',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() dto: PlanActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.approvePlan(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({
    summary: 'Từ chối kế hoạch — Auto clone version++ để sửa lại',
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: PlanActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.rejectPlan(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }
}
