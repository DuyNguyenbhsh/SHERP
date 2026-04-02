import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Suppliers - Nhà cung cấp')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({ summary: 'Danh sách nhà cung cấp' })
  @ApiQuery({ name: 'showInactive', required: false })
  @Get()
  findAll(@Query('showInactive') showInactive: string) {
    return this.suppliersService.findAll(showInactive);
  }

  @ApiOperation({ summary: 'Chi tiết nhà cung cấp' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePrivilege('MANAGE_SUPPLIER')
  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  @RequirePrivilege('MANAGE_SUPPLIER')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @ApiOperation({ summary: 'Kích hoạt lại NCC đã ngừng' })
  @RequirePrivilege('MANAGE_SUPPLIER')
  @Put(':id/restore')
  restore(@Param('id') id: string) {
    return this.suppliersService.update(id, { is_active: true } as any);
  }

  @ApiOperation({ summary: 'Ngừng hợp tác NCC (Soft Delete)' })
  @RequirePrivilege('MANAGE_SUPPLIER')
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.suppliersService.softDelete(id);
  }
}
