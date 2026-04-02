import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { Vehicle } from './entities/vehicle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle])], // <--- Nhớ dòng này
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
