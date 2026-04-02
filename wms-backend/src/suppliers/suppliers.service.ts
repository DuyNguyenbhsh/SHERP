import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// Import đúng đường dẫn từ các thư mục con
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
  ) {}

  // 1. LẤY DANH SÁCH (Chỉ lấy các NCC chưa bị xóa mềm)
  async findAll(showInactive: string = 'false') {
    // Nếu showInactive là 'true' thì lấy tất, nếu không thì chỉ lấy thằng đang active
    const whereCondition = showInactive === 'true' ? {} : { is_active: true };

    return await this.supplierRepo.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
    });
  }

  // 2. LẤY CHI TIẾT 1 NHÀ CUNG CẤP
  async findOne(id: string) {
    const supplier = await this.supplierRepo.findOne({
      where: { id, is_active: true },
    });
    if (!supplier)
      throw new NotFoundException(
        'Không tìm thấy Nhà cung cấp này trong hệ thống!',
      );
    return supplier;
  }

  // 3. TẠO MỚI NHÀ CUNG CẤP
  async create(dto: CreateSupplierDto) {
    // Kiểm tra trùng Mã NCC (Bắt buộc duy nhất)
    const existingCode = await this.supplierRepo.findOne({
      where: { supplier_code: dto.supplier_code },
    });
    if (existingCode)
      throw new BadRequestException(
        `Mã Nhà cung cấp ${dto.supplier_code} đã tồn tại!`,
      );

    // Kiểm tra trùng Mã số thuế (Để tránh Kế toán tạo đúp 1 công ty làm 2 mã)
    if (dto.tax_code) {
      const existingTax = await this.supplierRepo.findOne({
        where: { tax_code: dto.tax_code },
      });
      if (existingTax)
        throw new BadRequestException(
          `Mã số thuế ${dto.tax_code} đã được đăng ký cho NCC khác!`,
        );
    }

    const supplier = this.supplierRepo.create(dto);
    return await this.supplierRepo.save(supplier);
  }

  // 4. CẬP NHẬT THÔNG TIN NHÀ CUNG CẤP
  async update(id: string, dto: UpdateSupplierDto) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier)
      throw new NotFoundException('Không tìm thấy Nhà cung cấp để cập nhật!');

    // 🚀 BÍ KÍP CHỐNG GHI ĐÈ (Optimistic Locking)
    if (dto.version !== undefined && supplier.version !== dto.version) {
      throw new ConflictException(
        'Thông tin Nhà cung cấp này vừa bị thay đổi bởi một nhân sự khác! Vui lòng tải lại trang để cập nhật dữ liệu mới nhất trước khi lưu.',
      );
    }

    // Ghi đè dữ liệu mới
    Object.assign(supplier, dto);

    try {
      // Khi save, version trong DB sẽ tự động nhảy +1
      return await this.supplierRepo.save(supplier);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Lỗi không xác định';
      throw new BadRequestException('Lỗi cập nhật CSDL: ' + message);
    }
  }

  // 5. XÓA MỀM (SOFT DELETE)
  async softDelete(id: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier)
      throw new NotFoundException('Không tìm thấy Nhà cung cấp để xóa!');

    supplier.is_active = false; // Đánh dấu ẩn đi, giữ lại lịch sử cho PO cũ
    return await this.supplierRepo.save(supplier);
  }
}
