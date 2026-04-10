import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ProjectRequest } from './project-request.entity';

@Entity('request_attachments')
export class RequestAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectRequest, (r) => r.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request: ProjectRequest;

  @Index()
  @Column()
  request_id: string;

  @Column({ length: 500 })
  file_url: string;

  @Column({ length: 255 })
  file_name: string;

  @Column({ nullable: true })
  file_size: number;

  /** Ai upload: PROPOSER (người đề xuất) hoặc APPROVER (người duyệt bổ sung) */
  @Column({ length: 30, default: 'PROPOSER' })
  uploaded_by_role: string;

  @Column({ nullable: true })
  uploaded_by: string;

  @Column({ length: 100, nullable: true })
  uploaded_by_name: string;

  @CreateDateColumn()
  uploaded_at: Date;
}
