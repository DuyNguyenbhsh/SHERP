import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../users/entities/role.entity';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  position_code: string;

  @Column({ length: 100 })
  position_name: string;

  @Column({ type: 'varchar', length: 10, default: 'SITE' })
  scope: 'SITE' | 'CENTRAL';

  @Column({ type: 'varchar', length: 50, nullable: true })
  department_type: string;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_role_id' })
  default_role: Role;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
