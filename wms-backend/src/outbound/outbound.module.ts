import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundOrder } from './entities/outbound-order.entity';
import { OutboundLine } from './entities/outbound-line.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { Location } from '../inventory/entities/location.entity';
import { OutboundController } from './outbound.controller';
import { OutboundService } from './outbound.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboundOrder,
      OutboundLine,
      InventoryItem,
      Location,
    ]),
    ProjectsModule,
  ],
  controllers: [OutboundController],
  providers: [OutboundService],
  exports: [OutboundService],
})
export class OutboundModule {}
