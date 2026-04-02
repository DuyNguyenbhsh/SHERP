import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { GoodsReceiptNote } from './entities/goods-receipt-note.entity';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { SerialNumber } from './entities/serial-number.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      GoodsReceiptNote,
      GoodsReceiptLine,
      SerialNumber,
    ]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
