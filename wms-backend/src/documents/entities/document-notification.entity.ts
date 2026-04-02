import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ProjectDocument } from './project-document.entity';
import { NotificationType } from '../enums/document.enum';

@Entity('document_notifications')
export class DocumentNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectDocument, (doc) => doc.notifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: ProjectDocument;

  @Column()
  document_id: string;

  @Column({ type: 'varchar', length: 30 })
  notification_type: NotificationType;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
