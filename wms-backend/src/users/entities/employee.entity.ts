import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Position } from '../../organizations/entities/position.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  employee_code: string;

  @Column({ length: 100 })
  full_name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  job_title: string;

  @Column({ type: 'varchar', length: 50, default: 'WORKING' })
  status: string; // WORKING, SUSPENDED, TERMINATED

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'department_id' })
  department: Organization;

  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @Column({ type: 'date', nullable: true })
  hire_date: Date;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: Employee;

  @Column({ type: 'jsonb', nullable: true })
  document_refs: Record<string, unknown>; // Future: Hồ sơ giấy tờ (CMND, hợp đồng, bằng cấp, v.v.)

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
