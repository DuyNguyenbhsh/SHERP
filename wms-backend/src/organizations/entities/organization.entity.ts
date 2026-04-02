import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../users/entities/employee.entity';
import { OrgType } from '../enums/org-type.enum';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  organization_code: string;

  @Column()
  organization_name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 30, default: OrgType.CORPORATE_DEPT })
  org_type: OrgType;

  @Column({ length: 20, nullable: true })
  cost_center_code: string;

  // --- CÂY TỔ CHỨC ĐỆ QUY ---
  @ManyToOne(() => Organization, (org) => org.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Organization;

  @OneToMany(() => Organization, (org) => org.parent)
  children: Organization[];

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
