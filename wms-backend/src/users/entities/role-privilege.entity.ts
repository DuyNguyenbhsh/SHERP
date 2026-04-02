// src/users/entities/role-privilege.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Privilege } from './privilege.entity';

@Entity('role_privileges')
export class RolePrivilege {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Liên kết với bảng Roles (Xóa Role thì tự động xóa quyền đi kèm - CASCADE)
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  // Liên kết với bảng Privileges
  @ManyToOne(() => Privilege, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'privilege_id' })
  privilege: Privilege;

  @CreateDateColumn()
  assigned_at: Date;
}
