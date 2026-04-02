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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectMonitoringService } from './project-monitoring.service';
import {
  CreateProgressReportDto,
  ReportActionDto,
  CreateVODto,
  VOActionDto,
} from './dto/monitoring.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Project Monitoring - Theo dõi & Điều chỉnh (PROJ2)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('project-monitoring')
export class ProjectMonitoringController {
  constructor(private readonly service: ProjectMonitoringService) {}

  // ── PROJECT HEALTH ──

  @ApiOperation({ summary: 'Tính toán sức khỏe dự án (SPI/CPI)' })
  @Get('health/:projectId')
  getHealth(@Param('projectId') projectId: string) {
    return this.service.calculateProjectHealth(projectId);
  }

  @ApiOperation({ summary: 'Dữ liệu S-Curve (PV, EV, AC theo thời gian)' })
  @Get('s-curve/:projectId')
  getSCurve(@Param('projectId') projectId: string) {
    return this.service.getSCurveData(projectId);
  }

  // ── PROGRESS REPORTS ──

  @ApiOperation({ summary: 'Danh sách báo cáo tiến độ' })
  @Get('reports')
  @ApiQuery({ name: 'project_id', required: true })
  findReports(@Query('project_id') projectId: string) {
    return this.service.findReports(projectId);
  }

  @ApiOperation({ summary: 'Chi tiết báo cáo tiến độ' })
  @Get('reports/:id')
  findReport(@Param('id') id: string) {
    return this.service.findReport(id);
  }

  @ApiOperation({ summary: 'Tạo báo cáo tiến độ (cập nhật sản lượng)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('reports')
  createReport(@Body() dto: CreateProgressReportDto, @Req() req: any) {
    return this.service.createReport(dto, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Gửi báo cáo (BẮT BUỘC ảnh hiện trường)' })
  @Patch('reports/:id/submit')
  submitReport(@Param('id') id: string, @Req() req: any) {
    return this.service.submitReport(id, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Duyệt báo cáo tiến độ' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('reports/:id/approve')
  approveReport(@Param('id') id: string, @Req() req: any) {
    return this.service.approveReport(id, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Từ chối báo cáo tiến độ' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('reports/:id/reject')
  rejectReport(
    @Param('id') id: string,
    @Body() dto: ReportActionDto,
    @Req() req: any,
  ) {
    return this.service.rejectReport(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  // ── VARIATION ORDERS ──

  @ApiOperation({ summary: 'Danh sách Yêu cầu Thay đổi (VO)' })
  @Get('vo')
  @ApiQuery({ name: 'project_id', required: true })
  findVOs(@Query('project_id') projectId: string) {
    return this.service.findVOs(projectId);
  }

  @ApiOperation({ summary: 'Chi tiết VO' })
  @Get('vo/:id')
  findVO(@Param('id') id: string) {
    return this.service.findVO(id);
  }

  @ApiOperation({ summary: 'Tạo Yêu cầu Thay đổi (VO)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('vo')
  createVO(@Body() dto: CreateVODto, @Req() req: any) {
    return this.service.createVO(dto, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Gửi VO để duyệt' })
  @Patch('vo/:id/submit')
  submitVO(@Param('id') id: string) {
    return this.service.submitVO(id);
  }

  @ApiOperation({ summary: 'Duyệt VO → Auto cập nhật budget/timeline dự án' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('vo/:id/approve')
  approveVO(@Param('id') id: string, @Req() req: any) {
    return this.service.approveVO(id, req.user.userId, req.user.username);
  }

  @ApiOperation({ summary: 'Từ chối VO' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('vo/:id/reject')
  rejectVO(@Param('id') id: string, @Body() dto: VOActionDto, @Req() req: any) {
    return this.service.rejectVO(
      id,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }
}
