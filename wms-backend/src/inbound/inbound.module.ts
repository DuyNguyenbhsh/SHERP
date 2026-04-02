import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboundReceipt } from './entities/inbound-receipt.entity';
import { InboundLine } from './entities/inbound-line.entity';
import { Location } from '../inventory/entities/location.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InboundReceipt,
      InboundLine,
      Location,
      InventoryItem,
    ]),
  ],
  controllers: [InboundController],
  providers: [InboundService],
  exports: [InboundService],
})
export class InboundModule {}
