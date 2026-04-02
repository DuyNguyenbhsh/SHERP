import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataService } from './master-data.service';
import { MasterDataController } from './master-data.controller';

// 1. Import đủ 7 Entity (5 cũ + 2 mới)
import { DeliveryProvider } from './entities/delivery-provider.entity';
import { DeliveryType } from './entities/delivery-type.entity';
import { TransportStatus } from './entities/transport-status.entity';
import { TransportRoute } from './entities/transport-route.entity';
import { CargoType } from './entities/cargo-type.entity';
import { Province } from './entities/province.entity'; // <--- MỚI
import { Commune } from './entities/commune.entity'; // <--- MỚI

@Module({
  imports: [
    // 2. Đăng ký đủ 7 bảng vào đây
    TypeOrmModule.forFeature([
      DeliveryProvider,
      DeliveryType,
      TransportStatus,
      TransportRoute,
      CargoType,
      Province, // <--- Nhớ dòng này
      Commune, // <--- Nhớ dòng này
    ]),
  ],
  controllers: [MasterDataController],
  providers: [MasterDataService],
})
export class MasterDataModule {}
