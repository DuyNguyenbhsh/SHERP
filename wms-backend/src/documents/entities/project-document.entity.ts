import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectFolder } from './project-folder.entity';
import { DocumentNotification } from './document-notification.entity';
import { DocumentStatus } from '../enums/document.enum';

@Entity('project_documents')
export class ProjectDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectFolder, (folder) => folder.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'folder_id' })
  folder: ProjectFolder;

  @Column()
  folder_id: string;

  @Column()
  project_id: string;

  @Column({ length: 255 })
  document_name: string;

  @Column({ type: 'text', nullable: true })
  file_url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @Column({ type: 'varchar', length: 30, default: DocumentStatus.VALID })
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => DocumentNotification, (n) => n.document)
  notifications: DocumentNotification[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
