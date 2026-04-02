import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { Employee } from '../../users/entities/employee.entity';
import { AssignmentRole } from '../enums/assignment-role.enum';

@Entity('project_assignments')
@Unique(['project', 'employee'])
export class ProjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column()
  employee_id: string;

  @Column({ type: 'varchar', length: 30, default: AssignmentRole.MEMBER })
  role: AssignmentRole;

  @Column({ type: 'timestamp', nullable: true })
  assigned_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  released_at: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
