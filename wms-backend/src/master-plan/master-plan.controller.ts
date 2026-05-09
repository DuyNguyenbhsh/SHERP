import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateMasterPlanDto } from './dto/create-master-plan.dto';
import { UpdateMasterPlanDto } from './dto/update-master-plan.dto';
import { CreateWbsNodeDto } from './dto/create-wbs-node.dto';
import { UpdateWbsNodeDto } from './dto/update-wbs-node.dto';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto';
import { MasterPlanService } from './master-plan.service';
import { AnnualGridService } from './annual-grid.service';
import { ExportXlsxService } from './export-xlsx.service';

@ApiTags('Master Plan - Cây WBS + recurrence')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('master-plan')
export class MasterPlanController {
  constructor(
    private readonly service: MasterPlanService,
    private readonly annualGridService: AnnualGridService,
    private readonly exportXlsxService: ExportXlsxService,
  ) {}

  // ── Master Plan ──────────────────────────────────────────
  @ApiOperation({ summary: 'Tạo Master Plan mới' })
  @ApiResponse({ status: 201 })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post()
  create(@Body() dto: CreateMasterPlanDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user);
  }

  @ApiOperation({ summary: 'Danh sách Master Plan' })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Chi tiết Master Plan' })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật Master Plan (chỉ DRAFT/ACTIVE)' })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMasterPlanDto) {
    return this.service.update(id, dto);
  }

  @ApiOperation({ summary: 'Phê duyệt Master Plan (DRAFT → ACTIVE)' })
  @RequirePrivilege('APPROVE_MASTER_PLAN')
  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.service.approve(id, req.user.userId);
  }

  @ApiOperation({ summary: 'Đóng Master Plan (stop recurrence)' })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.service.close(id);
  }

  // ── WBS Node ──────────────────────────────────────────────
  @ApiOperation({ summary: 'Thêm WBS node vào Master Plan' })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post(':planId/wbs-nodes')
  addWbsNode(@Param('planId') planId: string, @Body() dto: CreateWbsNodeDto) {
    return this.service.addWbsNode(planId, dto);
  }

  @ApiOperation({
    summary: 'Cây WBS đầy đủ (flat list, sort level + sort_order + wbs_code)',
  })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':planId/wbs-tree')
  getWbsTree(@Param('planId') planId: string) {
    return this.service.getWbsTree(planId);
  }

  @ApiOperation({
    summary: 'Cập nhật WBS node (name, budget, dates, responsible)',
  })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Patch(':planId/wbs-nodes/:nodeId')
  updateWbsNode(
    @Param('planId') planId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateWbsNodeDto,
  ) {
    return this.service.updateWbsNode(planId, nodeId, dto);
  }

  @ApiOperation({
    summary:
      'Archive WBS node (soft delete đệ quy + block khi có work_items NEW/IN_PROGRESS)',
  })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post(':planId/wbs-nodes/:nodeId/archive')
  archiveNode(
    @Param('planId') planId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.service.archiveWbsNode(planId, nodeId);
  }

  // ── Task Template ─────────────────────────────────────────
  @ApiOperation({ summary: 'Gắn Task Template vào WBS node lá' })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post('wbs-nodes/:nodeId/task-templates')
  addTemplate(
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateTaskTemplateDto,
  ) {
    return this.service.addTaskTemplate(nodeId, dto);
  }

  @ApiOperation({ summary: 'Preview 10 ngày sinh job kế tiếp từ RRULE' })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Post('task-templates/:id/preview')
  preview(@Param('id') id: string) {
    return this.service.previewTaskTemplate(id);
  }

  // ── Dashboard KPI + Task Templates aggregated ────────────
  @ApiOperation({ summary: 'KPI dashboard cho 1 plan' })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':planId/dashboard')
  dashboard(@Param('planId') planId: string) {
    return this.service.dashboard(planId);
  }

  @ApiOperation({
    summary: 'Danh sách Task Template theo plan (aggregated qua WBS)',
  })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':planId/task-templates')
  listTemplates(@Param('planId') planId: string) {
    return this.service.listTaskTemplatesByPlan(planId);
  }

  // ── Annual Grid + Export XLSX (Supplement 2026-04-20) ────
  @ApiOperation({
    summary:
      'Ma trận Annual Plan (48-53 cột tuần × N template) — planned từ freq_code/RRULE + actual từ work_items',
  })
  @ApiQuery({ name: 'year', type: Number, required: true })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':planId/annual-grid')
  annualGrid(
    @Param('planId') planId: string,
    @Query('year', ParseIntPipe) year: number,
  ) {
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('year phải trong khoảng 2000-2100');
    }
    return this.annualGridService.build(planId, year);
  }

  @ApiOperation({
    summary:
      'Xuất XLSX Annual Plan theo format O&M — A3 landscape, 2 dòng sign-off cuối',
  })
  @ApiQuery({ name: 'year', type: Number, required: true })
  @RequirePrivilege('VIEW_MASTER_PLAN')
  @Get(':planId/export-xlsx')
  async exportXlsx(
    @Param('planId') planId: string,
    @Query('year', ParseIntPipe) year: number,
    @Res() res: Response,
  ): Promise<void> {
    if (year < 2000 || year > 2100) {
      throw new BadRequestException('year phải trong khoảng 2000-2100');
    }
    const { buffer, filename } = await this.exportXlsxService.export(
      planId,
      year,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ── Admin: trigger daily scan thủ công ───────────────────
  @ApiOperation({ summary: '[Admin] Kích hoạt daily scan thủ công (enqueue)' })
  @RequirePrivilege('MANAGE_MASTER_PLAN')
  @Post('admin/trigger-daily-scan')
  triggerScan() {
    return this.service.triggerDailyScan();
  }
}
