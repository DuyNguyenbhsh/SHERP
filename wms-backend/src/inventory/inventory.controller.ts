import {
  Controller,
  Get,
  Post,
  Patch,
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
import { InventoryService } from './inventory.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/create-location.dto';
import {
  AdjustInventoryDto,
  TransferInventoryDto,
} from './dto/adjust-inventory.dto';
import { StockStatus } from './enums/inventory.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Inventory - Tồn kho & Vị trí')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ========== VỊ TRÍ KHO (Location) ==========

  @ApiOperation({ summary: 'Danh sách vị trí kho' })
  @ApiQuery({ name: 'warehouse_code', required: false })
  @ApiResponse({ status: 200, description: 'Trả về danh sách vị trí' })
  @Get('locations')
  findAllLocations(@Query('warehouse_code') warehouse_code?: string) {
    return this.inventoryService.findAllLocations(warehouse_code);
  }

  @ApiOperation({ summary: 'Chi tiết vị trí kho' })
  @Get('locations/:id')
  findOneLocation(@Param('id') id: string) {
    return this.inventoryService.findOneLocation(id);
  }

  @RequirePrivilege('MANAGE_INVENTORY')
  @ApiOperation({ summary: 'Tạo vị trí kho mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @Post('locations')
  createLocation(@Body() dto: CreateLocationDto) {
    return this.inventoryService.createLocation(dto);
  }

  @RequirePrivilege('MANAGE_INVENTORY')
  @ApiOperation({ summary: 'Cập nhật vị trí kho' })
  @Patch('locations/:id')
  updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.inventoryService.updateLocation(id, dto);
  }

  // ========== TỒN KHO (Stock) ==========

  @ApiOperation({ summary: 'Tra cứu tồn kho' })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'location_id', required: false })
  @ApiQuery({ name: 'warehouse_code', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'QUARANTINE', 'DAMAGED'],
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách tồn kho' })
  @Get('stock')
  findAllInventory(
    @Query('product_id') product_id?: string,
    @Query('location_id') location_id?: string,
    @Query('warehouse_code') warehouse_code?: string,
    @Query('status') status?: StockStatus,
  ) {
    return this.inventoryService.findAllInventory({
      product_id,
      location_id,
      warehouse_code,
      status,
    });
  }

  @ApiOperation({ summary: 'Tổng hợp tồn kho theo sản phẩm' })
  @Get('stock/summary/:productId')
  getSummaryByProduct(@Param('productId') productId: string) {
    return this.inventoryService.getSummaryByProduct(productId);
  }

  // Điều chỉnh tồn kho (kiểm kê, nhập/giảm thủ công)
  @RequirePrivilege('MANAGE_INVENTORY')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho (kiểm kê)' })
  @ApiResponse({ status: 201, description: 'Điều chỉnh thành công' })
  @Post('stock/adjust')
  adjustInventory(@Body() dto: AdjustInventoryDto) {
    return this.inventoryService.adjustInventory(dto);
  }

  // Chuyển kho nội bộ
  @RequirePrivilege('MANAGE_INVENTORY')
  @ApiOperation({ summary: 'Chuyển kho nội bộ (Transfer)' })
  @ApiResponse({ status: 201, description: 'Chuyển kho thành công' })
  @Post('stock/transfer')
  transferInventory(@Body() dto: TransferInventoryDto) {
    return this.inventoryService.transferInventory(dto);
  }
}
