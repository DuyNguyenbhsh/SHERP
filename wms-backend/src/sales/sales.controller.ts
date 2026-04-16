import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrivilegeGuard } from '../common/guards/privilege.guard';
import { RequirePrivilege } from '../common/decorators/require-privilege.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { SalesQuoteService } from './sales-quote.service';
import { SalesOrderService } from './sales-order.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/create-quote.dto';
import {
  CreateSalesOrderDto,
  CancelSalesOrderDto,
} from './dto/create-sales-order.dto';

@ApiTags('Sales - Bán hàng (O2C)')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, PrivilegeGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly quoteService: SalesQuoteService,
    private readonly orderService: SalesOrderService,
  ) {}

  // ═══════════════════ QUOTES ═══════════════════

  @ApiOperation({ summary: 'Danh sách báo giá' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  @Get('quotes')
  listQuotes(
    @Query('status') status?: string,
    @Query('customer_id') customer_id?: string,
  ) {
    return this.quoteService.findAll({ status, customer_id });
  }

  @ApiOperation({ summary: 'Chi tiết báo giá' })
  @Get('quotes/:id')
  getQuote(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @ApiOperation({ summary: 'Tạo báo giá' })
  @RequirePrivilege('CREATE_SALES', 'MANAGE_SALES')
  @Post('quotes')
  createQuote(@Body() dto: CreateQuoteDto) {
    return this.quoteService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật báo giá (chỉ DRAFT)' })
  @RequirePrivilege('MANAGE_SALES')
  @Patch('quotes/:id')
  updateQuote(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quoteService.update(id, dto);
  }

  @ApiOperation({ summary: 'Gửi báo giá: DRAFT → SENT' })
  @RequirePrivilege('MANAGE_SALES')
  @Post('quotes/:id/send')
  sendQuote(@Param('id') id: string) {
    return this.quoteService.send(id);
  }

  @ApiOperation({ summary: 'Khách chấp nhận: SENT → ACCEPTED' })
  @RequirePrivilege('MANAGE_SALES')
  @Post('quotes/:id/accept')
  acceptQuote(@Param('id') id: string) {
    return this.quoteService.accept(id);
  }

  @ApiOperation({ summary: 'Khách từ chối: SENT → REJECTED' })
  @RequirePrivilege('MANAGE_SALES')
  @Post('quotes/:id/reject')
  rejectQuote(@Param('id') id: string) {
    return this.quoteService.reject(id);
  }

  @ApiOperation({ summary: 'Hủy báo giá (chỉ DRAFT)' })
  @RequirePrivilege('MANAGE_SALES')
  @Delete('quotes/:id')
  cancelQuote(@Param('id') id: string) {
    return this.quoteService.cancel(id);
  }

  // ═══════════════════ SALES ORDERS ═══════════════════

  @ApiOperation({ summary: 'Danh sách Sales Order' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  @Get('orders')
  listOrders(
    @Query('status') status?: string,
    @Query('customer_id') customer_id?: string,
  ) {
    return this.orderService.findAll({ status, customer_id });
  }

  @ApiOperation({ summary: 'Chi tiết Sales Order' })
  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @ApiOperation({
    summary: 'Tạo Sales Order + auto create Outbound + credit check',
  })
  @RequirePrivilege('CREATE_SALES', 'MANAGE_SALES')
  @Post('orders')
  createOrder(
    @Body() dto: CreateSalesOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.orderService.create(dto, {
      userId: req.user.userId,
      privileges: req.user.privileges ?? [],
    });
  }

  @ApiOperation({
    summary: 'Hủy Sales Order (chỉ khi Outbound chưa PICKED)',
  })
  @RequirePrivilege('MANAGE_SALES')
  @Patch('orders/:id/cancel')
  cancelOrder(@Param('id') id: string, @Body() dto: CancelSalesOrderDto) {
    return this.orderService.cancel(id, dto);
  }

  @ApiOperation({ summary: 'KPI Sales (total bookings, revenue, AOV)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @RequirePrivilege('VIEW_SALES', 'MANAGE_SALES')
  @Get('kpi')
  getKpi(@Query('from') from?: string, @Query('to') to?: string) {
    return this.orderService.getKpi(from, to);
  }
}
