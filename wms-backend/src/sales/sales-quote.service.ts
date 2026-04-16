import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan } from 'typeorm';
import { SalesQuote } from './entities/sales-quote.entity';
import { SalesQuoteLine } from './entities/sales-quote-line.entity';
import { QuoteStatus } from './enums/sales.enum';
import { Customer } from '../customers/entities/customer.entity';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteLineDto,
} from './dto/create-quote.dto';
import {
  calculateLine,
  calculateQuote,
} from './domain/logic/pricing.calculator';

@Injectable()
export class SalesQuoteService {
  constructor(
    @InjectRepository(SalesQuote) private quoteRepo: Repository<SalesQuote>,
    @InjectRepository(SalesQuoteLine)
    private lineRepo: Repository<SalesQuoteLine>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private dataSource: DataSource,
  ) {}

  private async generateCode(): Promise<string> {
    const today = new Date();
    const prefix = `QT-${today.getFullYear().toString().slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await this.quoteRepo.count();
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  private buildLines(dtos: QuoteLineDto[]): Partial<SalesQuoteLine>[] {
    return dtos.map((l) => {
      // BR-SALES-03: VAT 10% mặc định khi user không chỉ định
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
        unit_price: l.unit_price,
        discount_percent,
        tax_percent,
        ...breakdown,
        notes: l.notes,
      };
    });
  }

  async create(dto: CreateQuoteDto) {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customer_id },
    });
    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }
    if (!customer.is_active) {
      throw new BadRequestException('Khách hàng đã bị vô hiệu hóa');
    }
    if (customer.is_blacklisted) {
      throw new ForbiddenException('Khách hàng đang trong danh sách đen');
    }

    const quote_number = await this.generateCode();
    const lines = this.buildLines(dto.lines);
    const totals = calculateQuote(
      lines.map((l) => ({
        line_subtotal: l.line_subtotal!,
        line_discount: l.line_discount!,
        line_tax: l.line_tax!,
        line_total: l.line_total!,
      })),
    );

    const quote = this.quoteRepo.create({
      quote_number,
      customer_id: dto.customer_id,
      effective_date: dto.effective_date,
      expiry_date: dto.expiry_date,
      sales_rep_id: dto.sales_rep_id,
      notes: dto.notes,
      status: QuoteStatus.DRAFT,
      ...totals,
      lines,
    });

    const saved = await this.quoteRepo.save(quote);
    return {
      status: 'success',
      message: `Tạo báo giá ${quote_number} thành công`,
      data: saved,
    };
  }

  async findAll(filter: { status?: string; customer_id?: string }) {
    const qb = this.quoteRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.customer', 'c')
      .leftJoinAndSelect('q.lines', 'l')
      .orderBy('q.created_at', 'DESC');
    if (
      filter.status &&
      Object.values(QuoteStatus).includes(filter.status as QuoteStatus)
    ) {
      qb.andWhere('q.status = :status', { status: filter.status });
    }
    if (filter.customer_id) {
      qb.andWhere('q.customer_id = :cid', { cid: filter.customer_id });
    }
    const quotes = await qb.getMany();
    return {
      status: 'success',
      message: `Tìm thấy ${quotes.length} báo giá`,
      data: quotes,
    };
  }

  async findOne(id: string) {
    const quote = await this.quoteRepo.findOne({
      where: { id },
      relations: ['customer', 'lines'],
    });
    if (!quote) {
      throw new NotFoundException('Báo giá không tồn tại');
    }
    return { status: 'success', message: 'OK', data: quote };
  }

  async update(id: string, dto: UpdateQuoteDto) {
    return this.dataSource.transaction(async (manager) => {
      const quote = await manager.findOne(SalesQuote, {
        where: { id },
        relations: ['lines'],
      });
      if (!quote) throw new NotFoundException('Báo giá không tồn tại');
      if (quote.status !== QuoteStatus.DRAFT) {
        throw new BadRequestException(
          'Chỉ sửa được báo giá ở trạng thái DRAFT',
        );
      }

      // Cập nhật header
      if (dto.effective_date) quote.effective_date = dto.effective_date;
      if (dto.expiry_date) quote.expiry_date = dto.expiry_date;
      if (dto.sales_rep_id !== undefined) quote.sales_rep_id = dto.sales_rep_id;
      if (dto.notes !== undefined) quote.notes = dto.notes;

      // Nếu có lines mới → xoá cũ và thay thế
      if (dto.lines) {
        await manager.delete(SalesQuoteLine, { quote_id: id });
        const newLines = this.buildLines(dto.lines).map((l) => ({
          ...l,
          quote_id: id,
        }));
        await manager.save(
          SalesQuoteLine,
          newLines.map((l) => manager.create(SalesQuoteLine, l)),
        );
        const totals = calculateQuote(
          newLines.map((l) => ({
            line_subtotal: l.line_subtotal!,
            line_discount: l.line_discount!,
            line_tax: l.line_tax!,
            line_total: l.line_total!,
          })),
        );
        Object.assign(quote, totals);
      }

      const saved = await manager.save(SalesQuote, quote);
      return {
        status: 'success',
        message: `Cập nhật ${quote.quote_number}`,
        data: saved,
      };
    });
  }

  async transitionStatus(id: string, next: QuoteStatus) {
    const quote = await this.quoteRepo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Báo giá không tồn tại');

    const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
      DRAFT: [QuoteStatus.SENT],
      SENT: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      ACCEPTED: [],
      REJECTED: [],
      EXPIRED: [],
    };

    if (!ALLOWED_TRANSITIONS[quote.status].includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển ${quote.status} → ${next}`,
      );
    }

    quote.status = next;
    const saved = await this.quoteRepo.save(quote);
    return {
      status: 'success',
      message: `${quote.quote_number} → ${next}`,
      data: saved,
    };
  }

  send(id: string) {
    return this.transitionStatus(id, QuoteStatus.SENT);
  }
  accept(id: string) {
    return this.transitionStatus(id, QuoteStatus.ACCEPTED);
  }
  reject(id: string) {
    return this.transitionStatus(id, QuoteStatus.REJECTED);
  }

  async cancel(id: string) {
    const quote = await this.quoteRepo.findOne({ where: { id } });
    if (!quote) throw new NotFoundException('Báo giá không tồn tại');
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Chỉ hủy được báo giá ở trạng thái DRAFT');
    }
    await this.quoteRepo.delete(id);
    return {
      status: 'success',
      message: `Đã hủy ${quote.quote_number}`,
      data: null,
    };
  }

  /** Cron daily: EXPIRED cho Quote SENT quá hạn. */
  async markExpired(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.quoteRepo
      .createQueryBuilder()
      .update(SalesQuote)
      .set({ status: QuoteStatus.EXPIRED })
      .where('status = :status', { status: QuoteStatus.SENT })
      .andWhere('expiry_date < :today', { today })
      .execute();
    return result.affected ?? 0;
  }
}
