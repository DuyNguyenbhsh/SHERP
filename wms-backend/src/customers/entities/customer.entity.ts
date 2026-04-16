import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';
import {
  CustomerType,
  CustomerPaymentTerm,
} from '../../sales/enums/sales.enum';

@Entity('customers')
@Index(['is_active', 'customer_type'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mã khách (auto CUS-YYMMDD-XXX)
  @Index({ unique: true })
  @Column({ length: 50 })
  customer_code: string;

  // Tên pháp nhân / cá nhân
  @Index()
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  short_name: string;

  @Index({ unique: true, where: '"tax_code" IS NOT NULL' })
  @Column({ length: 50, nullable: true })
  tax_code: string;

  @Column({ type: 'enum', enum: CustomerType, default: CustomerType.RETAIL })
  customer_type: CustomerType;

  // Liên hệ
  @Column({ length: 255, nullable: true })
  primary_contact: string;

  @Column({ length: 50, nullable: true })
  primary_phone: string;

  @Column({ length: 150, nullable: true })
  primary_email: string;

  @Column({ type: 'text', nullable: true })
  billing_address: string;

  @Column({ type: 'text', nullable: true })
  shipping_address: string;

  // Thanh toán & tín dụng
  @Column({
    type: 'enum',
    enum: CustomerPaymentTerm,
    default: CustomerPaymentTerm.COD,
  })
  payment_term: CustomerPaymentTerm;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit_limit: number;

  // Công nợ hiện tại — denormalized, update khi SO confirm/paid
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  current_debt: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_blacklisted: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @VersionColumn()
  version: number;
}
