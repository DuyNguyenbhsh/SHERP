import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsController } from './products.controller';
import { ProductService } from './products.service';

@Module({
  // Nạp Entity vào để TypeORM tự động tạo/quản lý bảng `products`
  imports: [TypeOrmModule.forFeature([Product])],

  controllers: [ProductsController],
  providers: [ProductService],

  // RẤT QUAN TRỌNG: Phải export ProductService ra ngoài.
  // Vì sau này Module Nhập Kho (Inbound) sẽ cần mượn ProductService để check xem mặt hàng đó có bắt quét Serial hay không.
  exports: [ProductService],
})
export class ProductsModule {}
