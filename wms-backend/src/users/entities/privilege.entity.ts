// src/users/entities/privilege.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('privileges')
export class Privilege {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Mã code này PHẢI KHỚP 100% với thuộc tính 'key' trong cây Tree bên Frontend
  // VD: VIEW_PO, CREATE_PO, EXPORT_INVENTORY
  @Column({ unique: true, length: 100 })
  privilege_code: string;

  @Column({ length: 255 })
  privilege_name: string; // VD: Tạo mới Đơn mua hàng (PO)

  // Nhóm tính năng để dễ quản lý (PROCUREMENT, WMS, MASTER_DATA)
  @Column({ length: 100, nullable: true })
  module: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
