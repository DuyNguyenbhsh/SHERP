import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { Privilege } from '../auth/enums/privilege.enum';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { AuditLogService } from '../common/audit/audit-log.service';

@ApiTags('Employees - Nhân sự')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@UseInterceptors(AuditInterceptor)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @ApiOperation({ summary: 'Danh sách nhân viên' })
  @RequirePrivilege(Privilege.VIEW_EMPLOYEES)
  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @ApiOperation({
    summary: 'Nhân viên chưa có tài khoản (cho Dropdown tạo tài khoản)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhân viên chưa được cấp tài khoản',
  })
  @RequirePrivilege(Privilege.MANAGE_USER)
  @Get('unlinked')
  findUnlinked() {
    return this.employeesService.findUnlinked();
  }

  // ── EXCEL ──

  @ApiOperation({ summary: 'Export nhân viên ra Excel' })
  @Get('excel/export')
  async exportExcel(
    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.employeesService.exportToExcel();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="NhanVien_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Tải file mẫu import nhân viên' })
  @Get('excel/template')
  async downloadTemplate(
    @Res({ passthrough: true }) res?: any,
  ): Promise<StreamableFile> {
    const buffer = await this.employeesService.getExcelTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="MauImport_NhanVien.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Import nhân viên từ Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @RequirePrivilege(Privilege.MANAGE_EMPLOYEE)
  @Post('excel/import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.employeesService.importFromExcel(file.buffer);
  }

  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePrivilege(Privilege.MANAGE_EMPLOYEE)
  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  @RequirePrivilege(Privilege.MANAGE_EMPLOYEE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @ApiOperation({
    summary: 'Thay đổi trạng thái nhân viên (Working/Suspended/Terminated)',
  })
  @RequirePrivilege(Privilege.MANAGE_EMPLOYEE)
  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.employeesService.changeStatus(id, dto);
  }

  @ApiOperation({
    summary: 'Xóa nhân viên (Soft Delete — kiểm tra ràng buộc trước)',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({
    status: 400,
    description: 'Không thể xóa — có liên kết dữ liệu',
  })
  @RequirePrivilege(Privilege.MANAGE_EMPLOYEE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @ApiOperation({ summary: 'Lịch sử thay đổi nhân viên (Audit Log Timeline)' })
  @RequirePrivilege(Privilege.VIEW_EMPLOYEES)
  @Get(':id/audit-logs')
  getAuditLogs(@Param('id') id: string) {
    return this.auditLogService.findByEntity('Employee', id);
  }

  @ApiOperation({
    summary:
      'Chuỗi phê duyệt (Approval Chain) — từ nhân viên lên các cấp quản lý',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách cấp quản lý từ thấp lên cao',
  })
  @RequirePrivilege(Privilege.VIEW_EMPLOYEES)
  @Get(':id/approval-chain')
  getApprovalChain(@Param('id') id: string) {
    return this.employeesService.getApprovalChain(id);
  }
}
