import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';
import { FacilityCatalogService } from './facility-catalog.service';
import { CreateFacilitySystemDto } from './dto/create-facility-system.dto';
import { UpdateFacilitySystemDto } from './dto/update-facility-system.dto';
import { CreateFacilityEquipmentItemDto } from './dto/create-facility-equipment-item.dto';
import { UpdateFacilityEquipmentItemDto } from './dto/update-facility-equipment-item.dto';

@ApiTags('Facility Catalog - Danh mục hệ thống/thiết bị toà nhà')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('master-data')
export class FacilityCatalogController {
  constructor(private readonly service: FacilityCatalogService) {}

  // ── Systems (cấp 1) ─────────────────────────────────────
  @ApiOperation({ summary: 'List danh mục hệ thống (is_active=true)' })
  @Get('facility-systems')
  listSystems() {
    return this.service.listSystems();
  }

  @ApiOperation({ summary: 'Tạo hệ thống mới' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Post('facility-systems')
  createSystem(@Body() dto: CreateFacilitySystemDto) {
    return this.service.createSystem(dto);
  }

  @ApiOperation({ summary: 'Cập nhật hệ thống (không đổi code)' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Patch('facility-systems/:id')
  updateSystem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilitySystemDto,
  ) {
    return this.service.updateSystem(id, dto);
  }

  @ApiOperation({ summary: 'Vô hiệu hệ thống (soft delete)' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Delete('facility-systems/:id')
  deactivateSystem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivateSystem(id);
  }

  // ── Equipment Items (cấp 2) ─────────────────────────────
  @ApiOperation({
    summary: 'List thiết bị thuộc hệ thống (filter qua query system_id nếu có)',
  })
  @Get('facility-equipment-items')
  listItems(@Query('system_id') systemId?: string) {
    return this.service.listEquipmentItems(systemId);
  }

  @ApiOperation({ summary: 'Tạo hạng mục thiết bị mới' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Post('facility-equipment-items')
  createItem(@Body() dto: CreateFacilityEquipmentItemDto) {
    return this.service.createEquipmentItem(dto);
  }

  @ApiOperation({ summary: 'Cập nhật hạng mục thiết bị' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Patch('facility-equipment-items/:id')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityEquipmentItemDto,
  ) {
    return this.service.updateEquipmentItem(id, dto);
  }

  @ApiOperation({ summary: 'Vô hiệu hạng mục thiết bị' })
  @RequirePrivilege('MANAGE_FACILITY_CATALOG')
  @Delete('facility-equipment-items/:id')
  deactivateItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivateEquipmentItem(id);
  }
}
