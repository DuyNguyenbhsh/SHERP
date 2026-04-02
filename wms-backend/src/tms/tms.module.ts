import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TmsService } from './tms.service';
import { TmsController } from './tms.controller';
import { Waybill } from './entities/waybill.entity';
import { OutboundOrder } from '../outbound/entities/outbound-order.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Waybill, OutboundOrder, Vehicle])],
  controllers: [TmsController],
  providers: [TmsService],
  exports: [TmsService],
})
export class TmsModule {}
