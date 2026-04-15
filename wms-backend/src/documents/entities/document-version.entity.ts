import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ProjectDocument } from './project-document.entity';

@Entity('document_versions')
@Unique('UQ_DOCVER_SEQ', ['document_id', 'version_seq'])
@Index('IDX_DOCVER_CHECKSUM', ['checksum'])
@Index('IDX_DOCVER_DOCUMENT', ['document_id', 'version_seq'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProjectDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: ProjectDocument;

  @Column()
  document_id: string;

  @Column({ length: 10 })
  version_number: string;

  @Column({ type: 'int' })
  version_seq: number;

  @Column({ type: 'text' })
  file_url: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cloudinary_public_id: string;

  @Column({ length: 500 })
  file_name: string;

  @Column({ type: 'bigint' })
  file_size: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({ type: 'text' })
  change_note: string;

  @Column({ type: 'uuid', nullable: true })
  source_version_id: string | null;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @Column({ type: 'boolean', default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;
}
