import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilitySystem } from './entities/facility-system.entity';
import { FacilityEquipmentItem } from './entities/facility-equipment-item.entity';
import { FacilityCatalogService } from './facility-catalog.service';
import { FacilityCatalogController } from './facility-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FacilitySystem, FacilityEquipmentItem])],
  providers: [FacilityCatalogService],
  controllers: [FacilityCatalogController],
  exports: [FacilityCatalogService, TypeOrmModule],
})
export class FacilityCatalogModule {}
