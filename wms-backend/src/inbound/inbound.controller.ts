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
import { InboundService } from './inbound.service';
import { CreateInboundReceiptDto } from './dto/create-inbound-receipt.dto';
import {
  UpdateInboundStatusDto,
  UpdateQcResultDto,
  PutawayDto,
} from './dto/update-inbound-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../auth/guards/privilege.guard';
import { RequirePrivilege } from '../auth/decorators/require-privilege.decorator';

@ApiTags('Inbound - Nhập kho (Dock-to-Stock)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  // Xem danh sách phiếu nhập kho (filter theo status nếu cần)
  @ApiOperation({ summary: 'Danh sách phiếu nhập kho' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'INSPECTING', 'PUTAWAY', 'COMPLETED', 'REJECTED'],
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách phiếu nhập' })
  @Get()
  findAll(@Query('status') status?: string) {
    return this.inboundService.findAll(status);
  }

  // Xem chi tiết phiếu nhập kho
  @ApiOperation({ summary: 'Chi tiết phiếu nhập kho' })
  @ApiResponse({ status: 200, description: 'Trả về chi tiết phiếu nhập' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inboundService.findOne(id);
  }

  // Tạo phiếu nhập kho mới
  @RequirePrivilege('MANAGE_INBOUND')
  @ApiOperation({ summary: 'Tạo phiếu nhập kho mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @Post()
  create(@Body() dto: CreateInboundReceiptDto) {
    return this.inboundService.create(dto);
  }

  // Chuyển trạng thái phiếu (PENDING → INSPECTING → PUTAWAY → COMPLETED)
  @RequirePrivilege('MANAGE_INBOUND')
  @ApiOperation({ summary: 'Chuyển trạng thái phiếu nhập' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInboundStatusDto) {
    return this.inboundService.updateStatus(id, dto);
  }

  // Cập nhật kết quả QC cho 1 dòng hàng
  @RequirePrivilege('MANAGE_INBOUND')
  @ApiOperation({ summary: 'Cập nhật kết quả QC cho dòng hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật QC thành công' })
  @Patch('line/:lineId/qc')
  updateQcResult(
    @Param('lineId') lineId: string,
    @Body() dto: UpdateQcResultDto,
  ) {
    return this.inboundService.updateQcResult(lineId, dto);
  }

  // Xác nhận Putaway — gán vị trí kệ cho 1 dòng hàng đã đạt QC
  @RequirePrivilege('MANAGE_INBOUND')
  @ApiOperation({ summary: 'Xác nhận Putaway — lên kệ cho dòng hàng' })
  @ApiResponse({ status: 200, description: 'Putaway thành công' })
  @Patch('line/:lineId/putaway')
  putaway(@Param('lineId') lineId: string, @Body() dto: PutawayDto) {
    return this.inboundService.putaway(lineId, dto);
  }
}
