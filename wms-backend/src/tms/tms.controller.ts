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
import { TmsService } from './tms.service';
import { CreateWaybillDto } from './dto/create-tm.dto';
import { UpdateWaybillDto } from './dto/update-tm.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('TMS - Quản lý Vận tải (Dock-to-Door)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('tms')
export class TmsController {
  constructor(private readonly tmsService: TmsService) {}

  // Danh sách phiếu xuất sẵn sàng gom vào vận đơn
  @ApiOperation({ summary: 'Danh sách phiếu xuất sẵn sàng giao' })
  @ApiResponse({
    status: 200,
    description: 'Trả về phiếu xuất PICKED/PACKED chưa gán vận đơn',
  })
  @Get('pending-outbound')
  getPendingOrders() {
    return this.tmsService.getPendingOutboundOrders();
  }

  // Danh sách vận đơn
  @ApiOperation({ summary: 'Danh sách vận đơn' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'READY_TO_PICK', 'IN_TRANSIT', 'DELIVERED', 'CANCELED'],
  })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.tmsService.findAll(status);
  }

  // Chi tiết vận đơn
  @ApiOperation({ summary: 'Chi tiết vận đơn' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tmsService.findOne(id);
  }

  // Tạo vận đơn mới (gom nhiều phiếu xuất)
  @ApiOperation({ summary: 'Tạo vận đơn — gom phiếu xuất vào chuyến xe' })
  @ApiResponse({ status: 201, description: 'Tạo vận đơn thành công' })
  @RequirePrivilege('MANAGE_TMS')
  @Post()
  createWaybill(@Body() dto: CreateWaybillDto) {
    return this.tmsService.createWaybill(dto);
  }

  // Cập nhật vận đơn
  @ApiOperation({ summary: 'Cập nhật vận đơn' })
  @RequirePrivilege('MANAGE_TMS')
  @Patch(':id')
  updateWaybill(@Param('id') id: string, @Body() dto: UpdateWaybillDto) {
    return this.tmsService.updateWaybill(id, dto);
  }

  // Xác nhận giao hàng thành công (POD) — Transaction ACID
  @ApiOperation({ summary: 'Xác nhận giao hàng thành công (POD)' })
  @ApiResponse({
    status: 200,
    description: 'Giao hàng thành công — Waybill & OutboundOrders → DELIVERED',
  })
  @RequirePrivilege('MANAGE_TMS')
  @Patch(':id/deliver')
  completeDelivery(@Param('id') id: string) {
    return this.tmsService.completeDelivery(id);
  }
}
