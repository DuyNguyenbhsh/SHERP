import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

// ============================================================================
// CÁC ENUM ĐỊNH NGHĨA NGHIỆP VỤ LÕI (Master Data Rules)
// ============================================================================

export enum ItemType {
  GOODS = 'GOODS', // Hàng hóa thương mại (Có tồn kho - VD: Màn hình, Chuột)
  SERVICE = 'SERVICE', // Dịch vụ (Không tồn kho - VD: Cài Win, Vệ sinh PC)
  ASSET = 'ASSET', // Tài sản nội bộ (Trang thiết bị quán Star Gaming)
  COMBO = 'COMBO', // Bộ sản phẩm/PC Build (Cấu thành từ nhiều linh kiện)
}

export enum PlanningMethod {
  MIN_MAX = 'MIN_MAX', // Lập kế hoạch theo tồn kho Min/Max (Phổ biến nhất)
  REORDER_POINT = 'ROP', // Lập kế hoạch theo điểm đặt hàng lại
  NOT_PLANNED = 'NONE', // Không lập kế hoạch (Mua đứt bán đoạn / Order theo yêu cầu)
}

export enum CostingMethod {
  MOVING_AVERAGE = 'AVERAGE', // Bình quân gia quyền (Dùng cho phụ kiện, dây cáp)
  FIFO = 'FIFO', // Nhập trước xuất trước
  SPECIFIC = 'SPECIFIC', // Đích danh (BẮT BUỘC cho CPU, Mainboard, Laptop có Serial)
}

// ============================================================================
// THỰC THỂ SẢN PHẨM (PRODUCT ENTITY)
// ============================================================================

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. THÔNG TIN CƠ BẢN (Basic Identity) ---
  @Column({ unique: true, length: 50 })
  sku: string; // Mã hàng nội bộ (VD: CPU-I5-13400F)

  @Column({ unique: true, nullable: true, length: 100 })
  barcode: string; // Mã vạch Code128 (Phục vụ máy quét PDA Mobile)

  @Column({ length: 255 })
  name: string; // Tên hiển thị chuẩn của mặt hàng

  @Column({ nullable: true, length: 255 })
  alias: string; // Tên viết tắt hoặc tên gọi tắt để search cho nhanh

  @Column({ nullable: true })
  brand_id: string; // ID Thương hiệu (Intel, Asus, Logitech...)

  @Column({ nullable: true })
  category_id: string; // ID Nhóm hàng hóa (Mainboard, CPU, RAM...)

  // --- 2. PHÂN LOẠI & THUỘC TÍNH (Item Attributes) ---
  @Column({ type: 'enum', enum: ItemType, default: ItemType.GOODS })
  item_type: ItemType;

  @Column({ default: 'Cái', length: 50 })
  unit_of_measure: string; // Đơn vị tính cơ bản (Cái, Thùng, Bộ...)

  @Column({ default: true })
  is_inventory_tracking: boolean; // Cờ (Flag): Có quản lý tồn kho không?

  @Column({ default: false })
  is_serial_tracking: boolean; // Cờ (Flag): Có bắt buộc quét Serial/IMEI lúc nhập/xuất kho không?

  @Column({ default: true })
  is_taxable: boolean; // Cờ (Flag): Mặt hàng này có chịu thuế VAT không?

  // --- 3. BẢO HÀNH (Warranty - Sống còn với ngành IT) ---
  @Column({ type: 'int', default: 0 })
  warranty_months_vendor: number; // Số tháng bảo hành từ NCC (Bảo hành mua)

  @Column({ type: 'int', default: 0 })
  warranty_months_customer: number; // Số tháng bảo hành cho Khách (Bảo hành bán)

  // --- 4. GIÁ CẢ TẠM TÍNH (Pricing Defaults) ---
  // Lưu ý: Chuẩn ERP sẽ có bảng Price List riêng, đây chỉ là giá cơ sở mặc định
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchase_price: number; // Giá nhập dự kiến (Gợi ý lúc lên PO)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  retail_price: number; // Giá bán lẻ (Gợi ý lúc lên Đơn hàng POS)

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  wholesale_price: number; // Giá bán buôn/Khách sỉ

  // --- 5. LẬP KẾ HOẠCH CUNG ỨNG (Supply Chain Planning) ---
  @Column({
    type: 'enum',
    enum: PlanningMethod,
    default: PlanningMethod.MIN_MAX,
  })
  planning_method: PlanningMethod;

  @Column({ type: 'int', nullable: true })
  min_stock_level: number; // Điểm chạm đáy (Hệ thống cảnh báo đỏ yêu cầu mua thêm)

  @Column({ type: 'int', nullable: true })
  max_stock_level: number; // Điểm chạm trần (Ngăn Kế toán/Thu mua nhập quá tay giam vốn)

  @Column({ type: 'int', default: 0 })
  lead_time_days: number; // Thời gian chờ hàng (Từ lúc chốt PO đến lúc hàng về kho)

  @Column({ type: 'int', default: 0 })
  safety_stock_qty: number; // Tồn kho an toàn dự trữ

  @Column({ type: 'int', default: 1 })
  order_multiplier_qty: number; // Bội số đặt hàng (Ví dụ phải đặt lô chẵn 50, 100)

  // --- 6. ĐỊNH KHOẢN KẾ TOÁN (Accounting & Costing Mapping) ---
  @Column({
    type: 'enum',
    enum: CostingMethod,
    default: CostingMethod.MOVING_AVERAGE,
  })
  costing_method: CostingMethod; // Cách tính giá xuất kho

  @Column({ nullable: true })
  inventory_account_id: string; // Mapping -> TK Tài sản/Tồn kho (VD: 1561)

  @Column({ nullable: true })
  cogs_account_id: string; // Mapping -> TK Giá vốn (VD: 632)

  @Column({ nullable: true })
  revenue_account_id: string; // Mapping -> TK Doanh thu (VD: 5111)

  @Column({ nullable: true })
  expense_account_id: string; // Mapping -> TK Chi phí xuất dùng nội bộ (VD: 642)

  // --- 7. HỆ THỐNG MỞ RỘNG & KIỂM SOÁT (System & Flexfields) ---
  @Column({ type: 'jsonb', nullable: true })
  dynamic_attributes: Record<string, any>; // Flexfields: Cánh cửa mở rộng lưu thông số kỹ thuật (Socket, RAM Bus...) mà không cần sửa DB

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú nội bộ

  @Column({ default: true })
  is_active: boolean; // Cờ Xóa mềm (Soft Delete)

  // --- 8. LỊCH SỬ & CHỐNG XUNG ĐỘT (Audit & Optimistic Locking) ---
  @CreateDateColumn()
  created_at: Date; // Dấu vết: Ngày tạo

  @UpdateDateColumn()
  updated_at: Date; // Dấu vết: Ngày cập nhật cuối

  @VersionColumn()
  version: number; // Khóa chặn: Tăng lên 1 mỗi lần update để ngăn 2 người sửa cùng lúc đè dữ liệu nhau
}
