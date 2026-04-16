import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { SalesQuote } from './entities/sales-quote.entity';
import { SalesOrderStatus, QuoteStatus } from './enums/sales.enum';
import { Customer } from '../customers/entities/customer.entity';
import {
  CreateSalesOrderDto,
  CancelSalesOrderDto,
} from './dto/create-sales-order.dto';
import { QuoteLineDto } from './dto/create-quote.dto';
import {
  calculateLine,
  calculateQuote,
} from './domain/logic/pricing.calculator';
import { checkCredit } from './domain/logic/credit.checker';
import { CustomersService } from '../customers/customers.service';
import { OutboundService } from '../outbound/outbound.service';
import { OutboundType } from '../outbound/enums/outbound.enum';

@Injectable()
export class SalesOrderService {
  private readonly logger = new Logger(SalesOrderService.name);

  constructor(
    @InjectRepository(SalesOrder) private orderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private lineRepo: Repository<SalesOrderLine>,
    @InjectRepository(SalesQuote) private quoteRepo: Repository<SalesQuote>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private dataSource: DataSource,
    private customersService: CustomersService,
    private outboundService: OutboundService,
  ) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const prefix = `SO-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.orderRepo.count();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  private buildLines(dtos: QuoteLineDto[]): Partial<SalesOrderLine>[] {
    return dtos.map((l) => {
      // BR-SALES-03: VAT 10% mặc định — pass explicit vào calculator (pure function)
      const discount_percent = l.discount_percent ?? 0;
      const tax_percent = l.tax_percent ?? 10;
      const breakdown = calculateLine({
        qty: l.qty,
        unit_price: l.unit_price,
        discount_percent,
        tax_percent,
      });
      return {
        product_id: l.product_id,
        qty: l.qty,
        qty_fulfilled: 0,
        unit_price: l.unit_price,
        discount_percent,
        tax_percent,
        ...breakdown,
        notes: l.notes,
      };
    });
  }

  /**
   * Tạo SO từ scratch hoặc convert từ Quote.
   * - Credit check (BR-SALES-06) — bypass chỉ khi user có privilege + reason
   * - Tạo OutboundOrder tự động (BR-SALES-05 — US-SALES-05)
   * - Update customer.current_debt
   */
  async create(
    dto: CreateSalesOrderDto,
    user: { userId: string; privileges: string[] },
  ) {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customer_id },
    });
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại');
    if (!customer.is_active) {
      throw new BadRequestException('Khách hàng đã bị vô hiệu hóa');
    }
    if (customer.is_blacklisted) {
      throw new ForbiddenException('Khách hàng trong danh sách đen');
    }

    // Nếu convert từ Quote — verify ACCEPTED + chưa convert
    let quote: SalesQuote | null = null;
    if (dto.quote_id) {
      quote = await this.quoteRepo.findOne({ where: { id: dto.quote_id } });
      if (!quote) throw new NotFoundException('Báo giá không tồn tại');
      if (quote.status !== QuoteStatus.ACCEPTED) {
        throw new BadRequestException('Chỉ convert được Quote đã ACCEPTED');
      }
      if (quote.converted_to_so_id) {
        throw new BadRequestException(
          `Quote ${quote.quote_number} đã convert sang SO ${quote.converted_to_so_id}`,
        );
      }
    }

    // Tính tổng tiền
    const lines = this.buildLines(dto.lines);
    const totals = calculateQuote(
      lines.map((l) => ({
        line_subtotal: l.line_subtotal!,
        line_discount: l.line_discount!,
        line_tax: l.line_tax!,
        line_total: l.line_total!,
      })),
    );

    // Credit check
    const hasBypass = user.privileges.includes('BYPASS_CREDIT_LIMIT');
    const credit = checkCredit({
      current_debt: Number(customer.current_debt),
      credit_limit: Number(customer.credit_limit),
      new_order_amount: totals.grand_total,
      has_bypass_privilege: hasBypass,
      bypass_reason: dto.bypass_reason,
    });

    if (!credit.allowed) {
      throw new BadRequestException({
        status: 'error',
        message: credit.message,
        data: {
          shortfall: credit.shortfall,
          requires_bypass: credit.requires_bypass,
        },
      });
    }

    // Transaction: SO + Outbound + Debt
    return this.dataSource.transaction(async (manager) => {
      const order_number = await this.generateCode();

      const order = manager.create(SalesOrder, {
        order_number,
        customer_id: dto.customer_id,
        quote_id: dto.quote_id,
        status: SalesOrderStatus.CONFIRMED,
        required_delivery_date: dto.required_delivery_date,
        ship_to_address:
          dto.ship_to_address ?? customer.shipping_address ?? undefined,
        payment_term: dto.payment_term ?? customer.payment_term,
        sales_rep_id: dto.sales_rep_id,
        notes: dto.notes,
        is_credit_bypassed: credit.requires_bypass,
        bypass_reason: credit.requires_bypass ? dto.bypass_reason : undefined,
        ...totals,
        lines: lines as SalesOrderLine[],
      } as Partial<SalesOrder>);

      const savedOrder = await manager.save(SalesOrder, order);

      // Tạo Outbound qua service (không dùng manager vì Outbound có logic BOQ/Budget)
      const outboundResult = await this.outboundService.create({
        order_type: OutboundType.SALES_ORDER,
        customer_name: customer.name,
        customer_phone: customer.primary_phone ?? undefined,
        delivery_address: savedOrder.ship_to_address ?? undefined,
        reference_code: savedOrder.order_number,
        required_date: dto.required_delivery_date,
        lines: dto.lines.map((l) => ({
          product_id: l.product_id,
          requested_qty: l.qty,
          notes: l.notes,
        })),
      } as any);
      const outboundOrder = (outboundResult as any).data;

      savedOrder.outbound_order_id = outboundOrder.id;
      await manager.save(SalesOrder, savedOrder);

      // Link Quote → SO (nếu có)
      if (quote) {
        quote.converted_to_so_id = savedOrder.id;
        await manager.save(SalesQuote, quote);
      }

      // Update customer debt
      customer.current_debt =
        Number(customer.current_debt) + totals.grand_total;
      await manager.save(Customer, customer);

      this.logger.log(
        `SO ${order_number} created: customer=${customer.customer_code}, total=${totals.grand_total}, outbound=${outboundOrder.order_number}`,
      );

      return {
        status: 'success',
        message: `Tạo Sales Order ${order_number} thành công`,
        data: {
          ...savedOrder,
          outbound_order_number: outboundOrder.order_number,
        },
      };
    });
  }

  async findAll(filter: { status?: string; customer_id?: string }) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'c')
      .leftJoinAndSelect('o.lines', 'l')
      .orderBy('o.order_date', 'DESC');
    if (
      filter.status &&
      Object.values(SalesOrderStatus).includes(
        filter.status as SalesOrderStatus,
      )
    ) {
      qb.andWhere('o.status = :status', { status: filter.status });
    }
    if (filter.customer_id) {
      qb.andWhere('o.customer_id = :cid', { cid: filter.customer_id });
    }
    const orders = await qb.getMany();
    return {
      status: 'success',
      message: `Tìm thấy ${orders.length} đơn bán`,
      data: orders,
    };
  }

  async findOne(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'lines'],
    });
    if (!order) throw new NotFoundException('Sales Order không tồn tại');
    return { status: 'success', message: 'OK', data: order };
  }

  async cancel(id: string, dto: CancelSalesOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(SalesOrder, { where: { id } });
      if (!order) throw new NotFoundException('Sales Order không tồn tại');
      if (
        order.status !== SalesOrderStatus.CONFIRMED &&
        order.status !== SalesOrderStatus.FULFILLING
      ) {
        throw new BadRequestException(
          `Không thể hủy SO ở trạng thái ${order.status}`,
        );
      }

      // Check Outbound — chỉ cancel được nếu Outbound chưa PICKED
      if (order.outbound_order_id) {
        const obResult = await this.outboundService.findOne(
          order.outbound_order_id,
        );
        const ob = (obResult as any).data;
        if (!['PENDING', 'ALLOCATED'].includes(ob.status)) {
          throw new BadRequestException(
            `Không thể hủy: Outbound đã ở trạng thái ${ob.status}`,
          );
        }
      }

      order.status = SalesOrderStatus.CANCELED;
      order.notes = [order.notes, `[CANCELED] ${dto.reason}`]
        .filter(Boolean)
        .join('\n');
      await manager.save(SalesOrder, order);

      // Giảm debt
      const customer = await manager.findOne(Customer, {
        where: { id: order.customer_id },
      });
      if (customer) {
        customer.current_debt = Math.max(
          0,
          Number(customer.current_debt) - Number(order.grand_total),
        );
        await manager.save(Customer, customer);
      }

      return {
        status: 'success',
        message: `Đã hủy ${order.order_number}`,
        data: order,
      };
    });
  }

  async getKpi(from?: string, to?: string) {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (from) qb.andWhere('o.order_date >= :from', { from });
    if (to) qb.andWhere('o.order_date <= :to', { to });

    const allOrders = await qb.getMany();
    const totalBookings = allOrders
      .filter((o) => o.status !== SalesOrderStatus.CANCELED)
      .reduce((s, o) => s + Number(o.grand_total), 0);
    const revenueDelivered = allOrders
      .filter((o) => o.status === SalesOrderStatus.DELIVERED)
      .reduce((s, o) => s + Number(o.grand_total), 0);
    const avg = allOrders.length > 0 ? totalBookings / allOrders.length : 0;

    return {
      status: 'success',
      data: {
        total_orders: allOrders.length,
        total_bookings: totalBookings,
        revenue_delivered: revenueDelivered,
        avg_order_value: Math.round(avg),
      },
    };
  }
}
