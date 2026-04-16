import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesQuote } from './entities/sales-quote.entity';
import { SalesQuoteLine } from './entities/sales-quote-line.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { Customer } from '../customers/entities/customer.entity';
import { SalesQuoteService } from './sales-quote.service';
import { SalesOrderService } from './sales-order.service';
import { SalesController } from './sales.controller';
import { CustomersModule } from '../customers/customers.module';
import { OutboundModule } from '../outbound/outbound.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesQuote,
      SalesQuoteLine,
      SalesOrder,
      SalesOrderLine,
      Customer,
    ]),
    CustomersModule,
    OutboundModule,
  ],
  controllers: [SalesController],
  providers: [SalesQuoteService, SalesOrderService],
  exports: [SalesQuoteService, SalesOrderService],
})
export class SalesModule {}
