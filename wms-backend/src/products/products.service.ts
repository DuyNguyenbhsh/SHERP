import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // 1. LẤY DANH SÁCH (Chỉ lấy hàng chưa bị xóa mềm)
  async findAll(showInactive: string = 'false') {
    const whereCondition = showInactive === 'true' ? {} : { is_active: true };
    return await this.productRepo.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
    });
  }

  // 2. XEM CHI TIẾT 1 MẶT HÀNG
  async findOne(id: string) {
    const product = await this.productRepo.findOne({
      where: { id, is_active: true },
    });
    if (!product)
      throw new NotFoundException('Không tìm thấy mã hàng này trong hệ thống!');
    return product;
  }

  // 3. TẠO MẶT HÀNG MỚI
  async create(dto: CreateProductDto) {
    // 3.1 Chặn trùng SKU (Mã hàng)
    const existingSku = await this.productRepo.findOne({
      where: { sku: dto.sku },
    });
    if (existingSku)
      throw new BadRequestException(`Mã hàng (SKU) ${dto.sku} đã tồn tại!`);

    // 3.2 Chặn trùng Barcode (Nếu có nhập)
    if (dto.barcode) {
      const existingBarcode = await this.productRepo.findOne({
        where: { barcode: dto.barcode },
      });
      if (existingBarcode)
        throw new BadRequestException(
          `Mã vạch ${dto.barcode} đã được sử dụng cho mặt hàng khác!`,
        );
    }

    const product = this.productRepo.create(dto);
    return await this.productRepo.save(product);
  }

  // 4. CẬP NHẬT (SỬA) MẶT HÀNG
  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product)
      throw new NotFoundException('Không tìm thấy mã hàng để cập nhật!');

    // 🚀 BÍ KÍP CỦA ORACLE: Kiểm tra tranh chấp dữ liệu (Optimistic Locking)
    // Nếu Giao diện web gửi lên version cũ hơn version đang có trong Database -> Có người khác đã sửa trước đó!
    if (dto.version !== undefined && product.version !== dto.version) {
      throw new ConflictException(
        'Dữ liệu mặt hàng này vừa bị thay đổi bởi một nhân viên khác! Vui lòng tải lại trang để tránh ghi đè dữ liệu.',
      );
    }

    // Đổ dữ liệu mới đè lên dữ liệu cũ
    Object.assign(product, dto);

    try {
      // Khi gọi save(), TypeORM sẽ tự động cộng cột `version` lên +1
      return await this.productRepo.save(product);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi không xác định';
      throw new BadRequestException('Lỗi cập nhật CSDL: ' + message);
    }
  }

  // 5. XÓA MỀM (SOFT DELETE)
  async softDelete(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy mã hàng để xóa!');

    product.is_active = false; // Chỉ đánh dấu ẩn, không bao giờ dùng lệnh DELETE FROM
    return await this.productRepo.save(product);
  }
}
