import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

// ============================================================================
// ENUM NGHIỆP VỤ (Học theo chuẩn Oracle Procurement)
// ============================================================================

export enum SupplierType {
  DISTRIBUTOR = 'DISTRIBUTOR', // Nhà phân phối (FPT, PSD, Viết Sơn...)
  MANUFACTURER = 'MANUFACTURER', // Hãng sản xuất (Asus, Gigabyte - nhập trực tiếp)
  SERVICE = 'SERVICE', // NCC Dịch vụ (Viettel, Giao Hàng Nhanh...)
  INTERNAL = 'INTERNAL', // NCC Nội bộ (Giao dịch giữa Star Computer & Star Gaming)
}

export enum PaymentTerm {
  COD = 'COD', // Giao hàng thu tiền ngay
  NET15 = 'NET15', // Công nợ 15 ngày
  NET30 = 'NET30', // Công nợ 30 ngày (Phổ biến nhất)
  EOM = 'EOM', // End of Month (Chốt công nợ cuối tháng)
  PREPAYMENT = 'PREPAY', // Phải thanh toán trước mới giao hàng
}

// ============================================================================
// THỰC THỂ NHÀ CUNG CẤP (SUPPLIER ENTITY)
// ============================================================================

@Entity('suppliers')
@Index(['is_active', 'supplier_type']) // Tối ưu khi Kế toán lọc danh sách NCC theo loại
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- 1. ĐỊNH DANH PHÁP LÝ (Tương đương HZ_PARTIES của Oracle) ---
  @Index({ unique: true })
  @Column({ length: 50 })
  supplier_code: string; // Mã NCC (VD: SUP-FPT) - Sinh tự động theo quy tắc

  @Index()
  @Column({ length: 255 })
  name: string; // Tên pháp nhân đầy đủ (VD: Công ty Cổ phần FPT)

  @Column({ length: 100, nullable: true })
  short_name: string; // Tên gọi tắt (VD: FPT) để hiển thị cho gọn trên Table

  @Index({ unique: true })
  @Column({ length: 50, nullable: true })
  tax_code: string; // Mã số thuế (Bắt buộc cho Kế toán xuất/nhận hóa đơn)

  @Column({
    type: 'enum',
    enum: SupplierType,
    default: SupplierType.DISTRIBUTOR,
  })
  supplier_type: SupplierType;

  // --- 2. THÔNG TIN LIÊN HỆ & SITE (Tương đương POZ_SUPPLIER_SITES_ALL) ---
  @Column({ length: 255, nullable: true })
  contact_person: string; // Tên người phụ trách (Sale của bên NCC)

  @Column({ length: 50, nullable: true })
  primary_phone: string; // SĐT liên hệ

  @Column({ length: 150, nullable: true })
  primary_email: string; // Email (Dùng để hệ thống tự động bắn PO PDF sang khi được Duyệt)

  // Tách bạch 2 loại địa chỉ theo chuẩn Oracle
  @Column({ type: 'text', nullable: true })
  billing_address: string; // Địa chỉ xuất Hóa đơn (Pay Site)

  @Column({ type: 'text', nullable: true })
  shipping_address: string; // Địa chỉ kho lấy hàng / Đổi trả bảo hành (Purchasing/RMA Site)

  // --- 3. CẤU HÌNH KẾ TOÁN & THANH TOÁN (Financial Terms) ---
  @Column({ type: 'enum', enum: PaymentTerm, default: PaymentTerm.NET30 })
  payment_term: PaymentTerm; // Điều khoản thanh toán mặc định khi tạo PO

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debt_limit: number; // Hạn mức công nợ tối đa (Ngăn Kế toán mua quá tay nếu NCC cấm)

  @Column({ nullable: true })
  liability_account_id: string; // Mapping -> TK Công nợ Phải trả (VD: 331)

  @Column({ nullable: true })
  prepayment_account_id: string; // Mapping -> TK Ứng trước cho NCC (VD: 3312)

  // --- 4. HỆ THỐNG MỞ RỘNG (DFF Flexfields & System Controls) ---
  @Column({ type: 'jsonb', nullable: true })
  dynamic_attributes: Record<string, any>; // Nơi lưu thêm STK Ngân hàng, Tên ngân hàng...

  @Column({ type: 'text', nullable: true })
  notes: string; // Ghi chú lịch sử làm việc

  @Column({ default: true })
  is_active: boolean; // Xóa mềm (Tuyệt đối không xóa cứng để giữ lịch sử PO)

  // --- 5. LỊCH SỬ & CHỐNG XUNG ĐỘT ---
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @VersionColumn()
  version: number; // Optimistic Locking
}
