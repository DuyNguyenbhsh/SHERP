import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { ProjectDocument } from './project-document.entity';

@Entity('project_folders')
@Unique(['project_id', 'folder_code'])
export class ProjectFolder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @Column({ length: 50 })
  folder_code: string;

  @Column({ length: 100 })
  folder_name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @OneToMany(() => ProjectDocument, (doc) => doc.folder)
  documents: ProjectDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
