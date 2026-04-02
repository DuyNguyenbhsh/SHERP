import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Put,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { Privilege } from '../auth/enums/privilege.enum';

@ApiTags('Roles - Vai trò & Phân quyền')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ══ STATIC ROUTES (phải đặt trước :id) ══

  @ApiOperation({ summary: 'Danh sách vai trò' })
  @RequirePrivilege(Privilege.VIEW_ROLES)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @ApiOperation({ summary: 'Danh sách tất cả quyền hạn (privileges)' })
  @RequirePrivilege(Privilege.VIEW_ROLES)
  @Get('privileges/all')
  getAllPrivileges() {
    return this.rolesService.getAllPrivileges();
  }

  @ApiOperation({ summary: 'Xuất Excel danh sách vai trò' })
  @RequirePrivilege(Privilege.VIEW_ROLES)
  @Get('excel/export')
  async exportExcel(@Res() res: Response) {
    const buffer = await this.rolesService.exportToExcel();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="roles-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @ApiOperation({ summary: 'Tải file mẫu Import vai trò' })
  @RequirePrivilege(Privilege.VIEW_ROLES)
  @Get('excel/template')
  async getTemplate(@Res() res: Response) {
    const buffer = await this.rolesService.getExcelTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="roles-template.xlsx"',
    });
    res.send(buffer);
  }

  @ApiOperation({ summary: 'Import vai trò từ Excel' })
  @ApiConsumes('multipart/form-data')
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Post('excel/import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.rolesService.importFromExcel(file.buffer);
  }

  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Post()
  createRole(
    @Body()
    body: {
      role_code: string;
      role_name: string;
      description?: string;
    },
  ) {
    return this.rolesService.createRole(body);
  }

  // ══ PARAMETERIZED ROUTES (:id) ══

  @ApiOperation({ summary: 'Cập nhật vai trò' })
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Patch(':id')
  updateRole(
    @Param('id') id: string,
    @Body() body: { role_name?: string; description?: string },
  ) {
    return this.rolesService.updateRole(id, body);
  }

  @ApiOperation({ summary: 'Tạm dừng / Kích hoạt vai trò' })
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.rolesService.toggleStatus(id);
  }

  @ApiOperation({ summary: 'Xóa vai trò' })
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Delete(':id')
  removeRole(@Param('id') id: string) {
    return this.rolesService.removeRole(id);
  }

  @ApiOperation({ summary: 'Xem danh sách quyền của vai trò' })
  @RequirePrivilege(Privilege.VIEW_ROLES)
  @Get(':id/privileges')
  getRolePrivileges(@Param('id') roleId: string) {
    return this.rolesService.getPrivilegesForRole(roleId);
  }

  @ApiOperation({ summary: 'Gán quyền cho vai trò' })
  @RequirePrivilege(Privilege.MANAGE_ROLE)
  @Put(':id/privileges')
  updateRolePrivileges(
    @Param('id') roleId: string,
    @Body('privilegeCodes') privilegeCodes: string[],
  ) {
    return this.rolesService.assignPrivilegesToRole(roleId, privilegeCodes);
  }
}
