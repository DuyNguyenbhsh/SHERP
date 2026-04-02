// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Employee } from './employee.entity';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  username: string; // Email công ty hoặc tên đăng nhập

  @Column()
  password_hash: string; // Đã băm bằng bcrypt

  @Column({ default: true })
  is_active: boolean;

  // ── Security fields (Lockout + Password Policy) ──
  @Column({ type: 'int', default: 0 })
  failed_login_count: number;

  @Column({ type: 'timestamp', nullable: true })
  locked_until: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  password_changed_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  password_history: string[] | null;

  // Bản đồ 1-1 nối với Nhân sự (Nullable để cấp tài khoản cho Đối tác/Hệ thống khác)
  @OneToOne(() => Employee, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  // Quan hệ 1-Nhiều với bảng Phân quyền
  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
