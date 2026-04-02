import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ItemType,
  PlanningMethod,
  CostingMethod,
} from '../entities/product.entity';

export class CreateProductDto {
  // 1. Thông tin cơ bản
  @ApiProperty({ description: 'Mã hàng (SKU)', example: 'MB-ASUS-ROG-Z790' })
  @IsString()
  @IsNotEmpty({ message: 'Mã hàng (SKU) không được để trống' })
  @MaxLength(50, { message: 'SKU tối đa 50 ký tự' })
  sku: string;

  @ApiPropertyOptional({ description: 'Mã vạch', example: '8935001234567' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  barcode?: string;

  @ApiProperty({
    description: 'Tên hàng hóa',
    example: 'Mainboard Asus ROG Strix Z790',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên hàng không được để trống' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Tên gọi tắt' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  alias?: string;

  @IsUUID('4', { message: 'brand_id phải là UUID hợp lệ' })
  @IsOptional()
  brand_id?: string;

  @IsUUID('4', { message: 'category_id phải là UUID hợp lệ' })
  @IsOptional()
  category_id?: string;

  // 2. Phân loại & Thuộc tính
  @ApiPropertyOptional({
    description: 'Loại hàng',
    enum: ['GOODS', 'SERVICE', 'ASSET', 'COMBO'],
    example: 'GOODS',
  })
  @IsEnum(ItemType, {
    message: 'Loại hàng không hợp lệ (GOODS | SERVICE | ASSET | COMBO)',
  })
  @IsOptional()
  item_type?: ItemType;

  @ApiPropertyOptional({ description: 'Đơn vị tính', example: 'Cái' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  unit_of_measure?: string;

  @IsBoolean({ message: 'is_inventory_tracking phải là true/false' })
  @IsOptional()
  is_inventory_tracking?: boolean;

  @IsBoolean({ message: 'is_serial_tracking phải là true/false' })
  @IsOptional()
  is_serial_tracking?: boolean;

  @IsBoolean({ message: 'is_taxable phải là true/false' })
  @IsOptional()
  is_taxable?: boolean;

  // 3. Bảo hành
  @IsInt({ message: 'Số tháng bảo hành phải là số nguyên' })
  @Min(0)
  @IsOptional()
  warranty_months_vendor?: number;

  @IsInt({ message: 'Số tháng bảo hành phải là số nguyên' })
  @Min(0)
  @IsOptional()
  warranty_months_customer?: number;

  // 4. Giá cả
  @ApiPropertyOptional({ description: 'Giá nhập', example: 8500000 })
  @IsNumber({}, { message: 'Giá nhập phải là số' })
  @Min(0, { message: 'Giá nhập không được âm' })
  @IsOptional()
  purchase_price?: number;

  @ApiPropertyOptional({ description: 'Giá bán lẻ', example: 9500000 })
  @IsNumber({}, { message: 'Giá bán lẻ phải là số' })
  @Min(0)
  @IsOptional()
  retail_price?: number;

  @IsNumber({}, { message: 'Giá bán buôn phải là số' })
  @Min(0)
  @IsOptional()
  wholesale_price?: number;

  // 5. Lập kế hoạch (Planning)
  @IsEnum(PlanningMethod, {
    message: 'Phương pháp lập kế hoạch không hợp lệ (MIN_MAX | ROP | NONE)',
  })
  @IsOptional()
  planning_method?: PlanningMethod;

  @IsInt()
  @Min(0)
  @IsOptional()
  min_stock_level?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  max_stock_level?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  lead_time_days?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  safety_stock_qty?: number;

  @IsInt()
  @Min(1, { message: 'Bội số đặt hàng tối thiểu là 1' })
  @IsOptional()
  order_multiplier_qty?: number;

  // 6. Kế toán (Accounting)
  @IsEnum(CostingMethod, {
    message: 'Phương pháp tính giá không hợp lệ (AVERAGE | FIFO | SPECIFIC)',
  })
  @IsOptional()
  costing_method?: CostingMethod;

  @IsUUID('4')
  @IsOptional()
  inventory_account_id?: string;

  @IsUUID('4')
  @IsOptional()
  cogs_account_id?: string;

  @IsUUID('4')
  @IsOptional()
  revenue_account_id?: string;

  @IsUUID('4')
  @IsOptional()
  expense_account_id?: string;

  // 7. Mở rộng
  @IsObject({ message: 'dynamic_attributes phải là JSON object' })
  @IsOptional()
  dynamic_attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateProductDto extends CreateProductDto {
  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Biến cực kỳ quan trọng để xử lý tranh chấp dữ liệu (Optimistic Locking)
  @ApiPropertyOptional({
    description: 'Phiên bản (Optimistic Locking)',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  version?: number;
}
