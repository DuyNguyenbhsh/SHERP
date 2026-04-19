import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnergyMeter } from './entities/energy-meter.entity';
import { EnergyInspection } from './entities/energy-inspection.entity';
import { EnergyReading } from './entities/energy-reading.entity';
import { EnergyInspectionController } from './energy-inspection.controller';
import { EnergyInspectionService } from './energy-inspection.service';
import { WorkItemsModule } from '../work-items/work-items.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergyMeter, EnergyInspection, EnergyReading]),
    WorkItemsModule,
  ],
  controllers: [EnergyInspectionController],
  providers: [EnergyInspectionService],
  exports: [EnergyInspectionService],
})
export class EnergyInspectionModule {}
