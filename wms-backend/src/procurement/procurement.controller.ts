import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { CreatePoDto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Procurement - Mua hàng (S2P)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procService: ProcurementService) {}

  // Xem danh sách PO: Yêu cầu quyền VIEW_PO
  @ApiOperation({ summary: 'Danh sách Purchase Orders' })
  @RequirePrivilege('VIEW_PO')
  @Get('po')
  getAllPOs() {
    return this.procService.getAllPOs();
  }

  // Tạo PO mới: Yêu cầu quyền CREATE_PO
  @ApiOperation({ summary: 'Tạo Purchase Order mới' })
  @ApiResponse({ status: 201, description: 'Tạo PO thành công' })
  @RequirePrivilege('CREATE_PO')
  @Post('po')
  createPO(@Body() dto: CreatePoDto) {
    return this.procService.createPO(dto);
  }

  // Nhập kho: Yêu cầu quyền RECEIVE_INBOUND (chỉ Thủ kho mới có)
  @ApiOperation({ summary: 'Nhập kho — Nhận hàng từ PO' })
  @ApiResponse({ status: 201, description: 'Nhận hàng thành công' })
  @RequirePrivilege('RECEIVE_INBOUND')
  @Post('receive')
  receiveGoods(@Body() dto: ReceiveGoodsDto) {
    return this.procService.receiveGoods(dto);
  }
}
