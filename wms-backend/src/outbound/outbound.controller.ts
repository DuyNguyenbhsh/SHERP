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
import { OutboundService } from './outbound.service';
import { CreateOutboundOrderDto } from './dto/create-outbound-order.dto';
import { UpdateOutboundStatusDto, PickItemDto } from './dto/pick-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Outbound - Xuất kho (Order-to-Fulfillment)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('outbound')
export class OutboundController {
  constructor(private readonly outboundService: OutboundService) {}

  // Danh sách phiếu xuất kho
  @ApiOperation({ summary: 'Danh sách phiếu xuất kho' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'PENDING',
      'ALLOCATED',
      'PICKING',
      'PICKED',
      'PACKING',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'CANCELED',
    ],
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phiếu xuất' })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.outboundService.findAll(status);
  }

  // Chi tiết phiếu xuất kho
  @ApiOperation({ summary: 'Chi tiết phiếu xuất kho' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outboundService.findOne(id);
  }

  // Tạo phiếu xuất kho mới
  @ApiOperation({ summary: 'Tạo phiếu xuất kho mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @RequirePrivilege('MANAGE_OUTBOUND')
  @Post()
  create(@Body() dto: CreateOutboundOrderDto) {
    return this.outboundService.create(dto);
  }

  // Chuyển trạng thái phiếu xuất
  @ApiOperation({ summary: 'Chuyển trạng thái phiếu xuất' })
  @RequirePrivilege('MANAGE_OUTBOUND')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOutboundStatusDto) {
    return this.outboundService.updateStatus(id, dto);
  }

  // Pick hàng — Picker quét vị trí kệ + xác nhận số lượng lấy
  @ApiOperation({
    summary: 'Pick hàng — Picker quét vị trí kệ + xác nhận số lượng',
  })
  @ApiResponse({ status: 200, description: 'Pick thành công, trừ tồn kho' })
  @RequirePrivilege('MANAGE_OUTBOUND')
  @Patch('line/:lineId/pick')
  pickItem(@Param('lineId') lineId: string, @Body() dto: PickItemDto) {
    return this.outboundService.pickItem(lineId, dto);
  }
}
