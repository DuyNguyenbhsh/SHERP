/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

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
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { ProjectWbsService } from './project-wbs.service';
import { ProjectBoqService } from './project-boq.service';
import { ProjectEvmService } from './project-evm.service';
import { ProjectSettlementService } from './project-settlement.service';
import { ProjectNcrService } from './project-ncr.service';
import { WorkItemService } from './work-item.service';
import { SubcontractorKpiService } from './subcontractor-kpi.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateCostCategoryDto } from './dto/create-cost-category.dto';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { CreateWbsDto } from './dto/create-wbs.dto';
import { UpdateWbsDto } from './dto/update-wbs.dto';
import { UpsertCbsDto } from './dto/upsert-cbs.dto';
import { CreateBoqItemDto } from './dto/create-boq-item.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import {
  CreateNcrDto,
  AssignNcrDto,
  ResolveNcrDto,
  VerifyNcrDto,
  UpdateNcrDto,
} from './dto/create-ncr.dto';
import { UpdateBidResultDto } from './dto/update-bid-result.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import {
  CreateWorkItemDto,
  UpdateWorkItemDto,
} from './dto/create-work-item.dto';
import { CreateSubcontractorKpiDto } from './dto/create-subcontractor-kpi.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { ProjectStatus, ProjectStage } from './enums/project.enum';
import { AuditInterceptor } from '../shared/audit/audit.interceptor';

@ApiTags('Projects - Quản lý Dự án')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@UseInterceptors(AuditInterceptor)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly wbsService: ProjectWbsService,
    private readonly boqService: ProjectBoqService,
    private readonly evmService: ProjectEvmService,
    private readonly settlementService: ProjectSettlementService,
    private readonly ncrService: ProjectNcrService,
    private readonly workItemService: WorkItemService,
    private readonly kpiService: SubcontractorKpiService,
  ) {}

  // ══════════════════════════════════════════
  // PROJECT CRUD
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Danh sách dự án' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'stage', required: false, enum: ProjectStage })
  @Get()
  findAll(@Query('status') status?: string, @Query('stage') stage?: string) {
    return this.projectsService.findAll(status, stage);
  }

  @ApiOperation({ summary: 'Kiểm tra mã dự án tồn tại' })
  @Get('check-code/:code')
  checkCode(@Param('code') code: string) {
    return this.projectsService.checkCodeExists(code);
  }

  // ══════════════════════════════════════════
  // EXCEL EXPORT / IMPORT / TEMPLATE
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Export danh sách dự án ra Excel' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'stage', required: false, enum: ProjectStage })
  @Get('excel/export')
  async exportExcel(
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.projectsService.exportToExcel(status, stage);
    const fileName = `DuAn_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Tải file mẫu import dự án' })
  @Get('excel/template')
  async downloadTemplate(
    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.projectsService.getExcelTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="MauImport_DuAn.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Import dự án từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('excel/import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.projectsService.importFromExcel(file.buffer);
  }

  @ApiOperation({ summary: 'Luồng trạng thái cho phép' })
  @Get('status-transitions/:status')
  getTransitions(@Param('status') status: string) {
    return this.projectsService.getAllowedTransitions(status);
  }

  @ApiOperation({ summary: 'Chi tiết dự án' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @ApiOperation({ summary: 'Dashboard tổng hợp dự án (Summary)' })
  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.projectsService.getSummary(id);
  }

  @ApiOperation({ summary: 'Lịch sử thay đổi dự án' })
  @Get(':id/history')
  findHistory(@Param('id') id: string) {
    return this.projectsService.findHistory(id);
  }

  @ApiOperation({ summary: 'Tạo dự án mới' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật dự án' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa dự án' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  // ══════════════════════════════════════════
  // ASSIGNMENTS
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Tất cả phân công dự án' })
  @Get('assignments/all')
  findAllAssignments() {
    return this.projectsService.findAllAssignments();
  }

  @ApiOperation({ summary: 'Danh sách phân công của dự án' })
  @Get(':id/assignments')
  findAssignmentsByProject(@Param('id') id: string) {
    return this.projectsService.findAssignmentsByProject(id);
  }

  @ApiOperation({ summary: 'Phân công nhân viên vào dự án' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/assignments')
  createAssignment(@Param('id') id: string, @Body() dto: CreateAssignmentDto) {
    return this.projectsService.createAssignment(id, dto);
  }

  @ApiOperation({ summary: 'Xóa phân công' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('assignments/:assignmentId')
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.projectsService.removeAssignment(assignmentId);
  }

  // ══════════════════════════════════════════
  // COST CATEGORIES
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Danh sách loại chi phí' })
  @Get('cost-categories/all')
  findAllCategories() {
    return this.projectsService.findAllCategories();
  }

  @ApiOperation({ summary: 'Tạo loại chi phí' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('cost-categories')
  createCategory(@Body() dto: CreateCostCategoryDto) {
    return this.projectsService.createCategory(dto);
  }

  @ApiOperation({ summary: 'Xóa loại chi phí' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('cost-categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.projectsService.removeCategory(id);
  }

  // ══════════════════════════════════════════
  // BUDGETS
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Ngân sách dự án theo hạng mục' })
  @Get(':id/budgets')
  findBudgets(@Param('id') id: string) {
    return this.projectsService.findBudgets(id);
  }

  @ApiOperation({ summary: 'Tạo/Cập nhật dòng ngân sách' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/budgets')
  upsertBudget(@Param('id') id: string, @Body() dto: UpsertBudgetDto) {
    return this.projectsService.upsertBudget(id, dto);
  }

  @ApiOperation({ summary: 'Xóa dòng ngân sách' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('budgets/:budgetId')
  removeBudget(@Param('budgetId') budgetId: string) {
    return this.projectsService.removeBudget(budgetId);
  }

  // ══════════════════════════════════════════
  // TRANSACTIONS & COST
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Tổng hợp chi phí dự án (realtime)' })
  @Get(':id/cost-summary')
  getCostSummary(@Param('id') id: string) {
    return this.projectsService.getCostSummary(id);
  }

  @ApiOperation({ summary: 'Danh sách giao dịch chi phí' })
  @Get(':id/transactions')
  findTransactions(@Param('id') id: string) {
    return this.projectsService.findTransactions(id);
  }

  @ApiOperation({ summary: 'Tạo giao dịch chi phí' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/transactions')
  createTransaction(
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.projectsService.createTransaction(id, dto);
  }

  @ApiOperation({ summary: 'Xóa giao dịch chi phí' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('transactions/:transactionId')
  removeTransaction(@Param('transactionId') transactionId: string) {
    return this.projectsService.removeTransaction(transactionId);
  }

  // ══════════════════════════════════════════
  // WBS — Work Breakdown Structure
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Cây WBS của dự án' })
  @Get(':id/wbs')
  findWbsTree(@Param('id') id: string) {
    return this.wbsService.findTree(id);
  }

  @ApiOperation({ summary: 'Tạo hạng mục WBS' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/wbs')
  createWbs(@Param('id') id: string, @Body() dto: CreateWbsDto) {
    return this.wbsService.create(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật hạng mục WBS' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('wbs/:wbsId')
  updateWbs(@Param('wbsId') wbsId: string, @Body() dto: UpdateWbsDto) {
    return this.wbsService.update(wbsId, dto);
  }

  @ApiOperation({ summary: 'Cập nhật tiến độ WBS' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('wbs/:wbsId/progress')
  updateWbsProgress(
    @Param('wbsId') wbsId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.wbsService.update(wbsId, {
      progress_percent: dto.progress_percent,
    });
  }

  @ApiOperation({ summary: 'Xóa hạng mục WBS' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('wbs/:wbsId')
  removeWbs(@Param('wbsId') wbsId: string) {
    return this.wbsService.remove(wbsId);
  }

  // ── CBS ──

  @ApiOperation({ summary: 'CBS theo hạng mục WBS' })
  @Get('wbs/:wbsId/cbs')
  findCbs(@Param('wbsId') wbsId: string) {
    return this.wbsService.findCbs(wbsId);
  }

  @ApiOperation({ summary: 'Tạo/Cập nhật CBS' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/cbs')
  upsertCbs(@Param('id') id: string, @Body() dto: UpsertCbsDto) {
    return this.wbsService.upsertCbs(id, dto);
  }

  // ══════════════════════════════════════════
  // BOQ — Bill of Quantities
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Danh sách hạng mục BOQ' })
  @ApiQuery({ name: 'wbs_id', required: false })
  @Get(':id/boq')
  findBoqItems(@Param('id') id: string, @Query('wbs_id') wbsId?: string) {
    return this.boqService.findItems(id, wbsId);
  }

  @ApiOperation({ summary: 'Tạo hạng mục BOQ' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/boq')
  createBoqItem(@Param('id') id: string, @Body() dto: CreateBoqItemDto) {
    return this.boqService.createItem(id, dto);
  }

  @ApiOperation({ summary: 'Xóa hạng mục BOQ' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('boq/:boqId')
  removeBoqItem(@Param('boqId') boqId: string) {
    return this.boqService.removeItem(boqId);
  }

  @ApiOperation({ summary: 'Import BOQ từ Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/boq/import')
  @UseInterceptors(FileInterceptor('file'))
  importBoq(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.boqService.importFromExcel(id, file);
  }

  @ApiOperation({ summary: 'Lịch sử import BOQ' })
  @Get(':id/boq/imports')
  findBoqImportHistory(@Param('id') id: string) {
    return this.boqService.findImportHistory(id);
  }

  // ══════════════════════════════════════════
  // EVM — Earned Value Management
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Phân tích Earned Value (Lời/Lỗ thời gian thực)' })
  @Get(':id/earned-value')
  getEarnedValueAnalysis(@Param('id') id: string) {
    return this.evmService.getEarnedValueAnalysis(id);
  }

  // ══════════════════════════════════════════
  // SETTLEMENT — Quyết toán vật tư
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Preview đối chiếu vật tư' })
  @Get(':id/reconciliation/preview')
  previewReconciliation(@Param('id') id: string) {
    return this.settlementService.previewReconciliation(id);
  }

  @ApiOperation({ summary: 'Danh sách biên bản quyết toán' })
  @Get(':id/settlements')
  findSettlements(@Param('id') id: string) {
    return this.settlementService.findAll(id);
  }

  @ApiOperation({ summary: 'Tạo biên bản quyết toán' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/settlements')
  createSettlement(@Param('id') id: string, @Body() dto: CreateSettlementDto) {
    return this.settlementService.createSettlement(id, dto);
  }

  @ApiOperation({ summary: 'Chi tiết biên bản quyết toán' })
  @Get('settlements/:settlementId')
  findSettlement(@Param('settlementId') id: string) {
    return this.settlementService.findOne(id);
  }

  @ApiOperation({ summary: 'Chốt biên bản quyết toán' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('settlements/:settlementId/finalize')
  finalizeSettlement(@Param('settlementId') id: string) {
    return this.settlementService.finalize(id);
  }

  // ══════════════════════════════════════════
  // BID RESULT & CONTRACT
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Ghi nhận kết quả đấu thầu (WON_BID / LOST_BID)' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/bid-result')
  updateBidResult(@Param('id') id: string, @Body() dto: UpdateBidResultDto) {
    return this.projectsService.update(id, {
      status: dto.result as unknown as ProjectStatus,
      bid_result_date: dto.bid_result_date,
      lost_bid_reason: dto.lost_bid_reason,
    });
  }

  @ApiOperation({ summary: 'Cập nhật thông tin hợp đồng CĐT' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/contract')
  updateContract(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.projectsService.update(id, dto);
  }

  // ══════════════════════════════════════════
  // NCR — Non-Conformance Reports
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Danh sách NCR theo dự án' })
  @Get(':id/ncrs')
  findNcrs(@Param('id') projectId: string) {
    return this.ncrService.findByProject(projectId);
  }

  @ApiOperation({ summary: 'Tạo NCR mới' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post(':id/ncrs')
  createNcr(
    @Param('id') projectId: string,
    @Body() dto: CreateNcrDto,
    @Req() req: any,
  ) {
    return this.ncrService.create(projectId, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Chi tiết NCR' })
  @Get(':id/ncrs/:ncrId')
  findNcr(@Param('ncrId') ncrId: string) {
    return this.ncrService.findOne(ncrId);
  }

  @ApiOperation({ summary: 'Cập nhật NCR' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/ncrs/:ncrId')
  updateNcr(@Param('ncrId') ncrId: string, @Body() dto: UpdateNcrDto) {
    return this.ncrService.update(ncrId, dto);
  }

  @ApiOperation({ summary: 'Phân công người xử lý NCR' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/ncrs/:ncrId/assign')
  assignNcr(
    @Param('ncrId') ncrId: string,
    @Body() dto: AssignNcrDto,
    @Req() req: any,
  ) {
    return this.ncrService.assign(ncrId, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Ghi nhận đã xử lý NCR' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/ncrs/:ncrId/resolve')
  resolveNcr(@Param('ncrId') ncrId: string, @Body() dto: ResolveNcrDto) {
    return this.ncrService.resolve(ncrId, dto);
  }

  @ApiOperation({ summary: 'Kiểm tra chấp nhận NCR' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/ncrs/:ncrId/verify')
  verifyNcr(
    @Param('ncrId') ncrId: string,
    @Body() dto: VerifyNcrDto,
    @Req() req: any,
  ) {
    return this.ncrService.verify(ncrId, dto, req.user.sub);
  }

  @ApiOperation({ summary: 'Mở lại NCR đã đóng' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch(':id/ncrs/:ncrId/reopen')
  reopenNcr(@Param('ncrId') ncrId: string) {
    return this.ncrService.reopen(ncrId);
  }

  @ApiOperation({ summary: 'Thống kê NCR theo dự án' })
  @Get(':id/ncrs/summary')
  getNcrSummary(@Param('id') projectId: string) {
    return this.ncrService.getSummary(projectId);
  }

  // ══════════════════════════════════════════
  // WORK ITEM MASTER — Công tác
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Danh sách công tác' })
  @Get('work-items/list')
  findWorkItems(
    @Query('search') search?: string,
    @Query('group') group?: string,
  ) {
    return this.workItemService.findAll(search, group);
  }

  @ApiOperation({ summary: 'Tạo công tác mới' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('work-items')
  createWorkItem(@Body() dto: CreateWorkItemDto) {
    return this.workItemService.create(dto);
  }

  @ApiOperation({ summary: 'Chi tiết công tác' })
  @Get('work-items/:itemId')
  findWorkItem(@Param('itemId') id: string) {
    return this.workItemService.findOne(id);
  }

  @ApiOperation({ summary: 'Cập nhật công tác' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('work-items/:itemId')
  updateWorkItem(@Param('itemId') id: string, @Body() dto: UpdateWorkItemDto) {
    return this.workItemService.update(id, dto);
  }

  @ApiOperation({ summary: 'Vô hiệu hóa công tác' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Delete('work-items/:itemId')
  removeWorkItem(@Param('itemId') id: string) {
    return this.workItemService.remove(id);
  }

  // ══════════════════════════════════════════
  // SUBCONTRACTOR KPI — Đánh giá NCC/NTP
  // ══════════════════════════════════════════

  @ApiOperation({ summary: 'Tạo đánh giá KPI cho NCC/NTP' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Post('suppliers/:supplierId/kpis')
  createKpi(
    @Param('supplierId') supplierId: string,
    @Body() dto: CreateSubcontractorKpiDto,
  ) {
    return this.kpiService.create(supplierId, dto);
  }

  @ApiOperation({ summary: 'Lịch sử đánh giá KPI của NCC/NTP' })
  @Get('suppliers/:supplierId/kpis')
  findKpis(@Param('supplierId') supplierId: string) {
    return this.kpiService.findBySupplierId(supplierId);
  }

  @ApiOperation({ summary: 'Đánh giá KPI gần nhất' })
  @Get('suppliers/:supplierId/kpis/latest')
  findLatestKpi(@Param('supplierId') supplierId: string) {
    return this.kpiService.findLatest(supplierId);
  }

  @ApiOperation({ summary: 'Duyệt đánh giá KPI' })
  @RequirePrivilege('MANAGE_PROJECTS')
  @Patch('kpis/:kpiId/approve')
  approveKpi(@Param('kpiId') kpiId: string, @Req() req: any) {
    return this.kpiService.approve(kpiId, req.user.sub);
  }

  @ApiOperation({ summary: 'DS NCC/NTP không đạt KPI' })
  @Get('kpis/failed')
  findFailedKpis() {
    return this.kpiService.findFailed();
  }
}
