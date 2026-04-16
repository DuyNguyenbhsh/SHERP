import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Patch,
  UseGuards,
  Req,
  Res,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
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
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { Privilege } from '../auth/enums/privilege.enum';

@ApiTags('Users - Tai khoan')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Danh sach tai khoan' })
  @RequirePrivilege(Privilege.VIEW_USERS)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // ── EXCEL ──

  @ApiOperation({ summary: 'Export tai khoan ra Excel' })
  @RequirePrivilege(Privilege.VIEW_USERS)
  @Get('excel/export')
  async exportExcel(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.usersService.exportToExcel();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="TaiKhoan_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Tai file mau import tai khoan' })
  @RequirePrivilege(Privilege.VIEW_USERS)
  @Get('excel/template')
  async downloadTemplate(
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const buffer = await this.usersService.getExcelTemplate();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="MauImport_TaiKhoan.xlsx"',
    });
    return new StreamableFile(buffer);
  }

  @ApiOperation({ summary: 'Import tai khoan tu Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @RequirePrivilege(Privilege.MANAGE_USER)
  @Post('excel/import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.usersService.importFromExcel(file.buffer);
  }

  @ApiOperation({ summary: 'Tao tai khoan moi' })
  @ApiResponse({ status: 201, description: 'Tao thanh cong' })
  @ApiResponse({
    status: 400,
    description: 'Du lieu khong hop le hoac username trung',
  })
  @RequirePrivilege(Privilege.MANAGE_USER)
  @Post()
  create(@Body() body: CreateUserDto) {
    return this.usersService.create(body);
  }

  @ApiOperation({ summary: 'Xoa tai khoan' })
  @RequirePrivilege(Privilege.MANAGE_USER)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.usersService.remove(id, req.user?.userId);
  }

  @ApiOperation({ summary: 'Cap nhat tai khoan' })
  @RequirePrivilege(Privilege.MANAGE_USER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateUserDto>,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, updateData, req.user?.userId);
  }
}
