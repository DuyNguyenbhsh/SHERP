import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  Req,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalConfigDto } from './dto/create-approval-config.dto';
import { ApproveStepDto } from './dto/approve-step.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';

@ApiTags('Approvals - Phe duyet da cap')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // ══ CONFIG CRUD ══

  @ApiOperation({ summary: 'Danh sach cau hinh phe duyet' })
  @Get('configs')
  findConfigs() {
    return this.approvalsService.findConfigs();
  }

  @ApiOperation({ summary: 'Chi tiet 1 cau hinh' })
  @Get('configs/:id')
  findConfigById(@Param('id') id: string) {
    return this.approvalsService.findConfigById(id);
  }

  @ApiOperation({ summary: 'Tao cau hinh phe duyet' })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Post('configs')
  createConfig(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateApprovalConfigDto,
  ) {
    return this.approvalsService.createConfig(dto, req.user?.username);
  }

  @ApiOperation({ summary: 'Cap nhat cau hinh phe duyet' })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Put('configs/:id')
  updateConfig(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateApprovalConfigDto,
  ) {
    return this.approvalsService.updateConfig(id, dto, req.user?.username);
  }

  @ApiOperation({ summary: 'Bat/tat cau hinh' })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Patch('configs/:id/toggle')
  toggleConfig(@Param('id') id: string) {
    return this.approvalsService.toggleConfig(id);
  }

  @ApiOperation({ summary: 'Xoa cau hinh phe duyet' })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Delete('configs/:id')
  removeConfig(@Param('id') id: string) {
    return this.approvalsService.removeConfig(id);
  }

  // ══ EXCEL ══

  @ApiOperation({ summary: 'Export quy trinh phe duyet ra Excel' })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Get('excel/export')
  async exportExcel(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.approvalsService.exportToExcel();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="QuyTrinhPheDuyet_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Tai file mau import quy trinh' })
  @Get('excel/template')
  async downloadTemplate(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.approvalsService.getExcelTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="MauImport_QuyTrinhPheDuyet.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Import quy trinh phe duyet tu Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @RequirePrivilege('MANAGE_APPROVALS')
  @Post('excel/import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.approvalsService.importFromExcel(file.buffer);
  }

  // ══ SUBMIT & PROCESS ══

  @ApiOperation({ summary: 'Gui yeu cau phe duyet' })
  @Post('submit')
  submitForApproval(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitApprovalDto,
  ) {
    const userId: string = req.user.userId;
    return this.approvalsService.submitForApproval(
      dto.entity_type,
      dto.entity_id,
      userId,
      dto.request_data || {},
      dto.amount,
    );
  }

  @ApiOperation({ summary: 'Danh sach phe duyet cho xu ly (cua toi)' })
  @Get('pending')
  findMyPending(@Req() req: AuthenticatedRequest) {
    return this.approvalsService.findPendingForUser(req.user.userId);
  }

  @ApiOperation({ summary: 'Ai la nguoi duyet tiep theo?' })
  @Get('requests/:requestId/next-approver')
  getNextApprover(@Param('requestId') id: string) {
    return this.approvalsService.getNextApprover(id);
  }

  @ApiOperation({ summary: 'Chi tiet yeu cau phe duyet' })
  @Get('requests/:requestId')
  getRequestStatus(@Param('requestId') id: string) {
    return this.approvalsService.getRequestStatus(id);
  }

  @ApiOperation({ summary: 'Tim yeu cau phe duyet theo doi tuong' })
  @ApiQuery({ name: 'entity_type', required: true })
  @ApiQuery({ name: 'entity_id', required: true })
  @Get('by-entity')
  findByEntity(
    @Query('entity_type') entityType: string,
    @Query('entity_id') entityId: string,
  ) {
    return this.approvalsService.findByEntity(entityType, entityId);
  }

  @ApiOperation({ summary: 'Phe duyet buoc hien tai' })
  @RequirePrivilege('APPROVE_REQUESTS')
  @Patch('steps/:stepId/approve')
  approveStep(
    @Param('stepId') stepId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ApproveStepDto,
  ) {
    return this.approvalsService.approveStep(
      stepId,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }

  @ApiOperation({ summary: 'Tu choi buoc hien tai' })
  @RequirePrivilege('APPROVE_REQUESTS')
  @Patch('steps/:stepId/reject')
  rejectStep(
    @Param('stepId') stepId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: ApproveStepDto,
  ) {
    return this.approvalsService.rejectStep(
      stepId,
      req.user.userId,
      req.user.username,
      dto.comment,
    );
  }
}
