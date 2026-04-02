import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { LinkType } from '../enums/schedule.enum';

@Entity('task_links')
@Index('idx_tl_project', ['project_id'])
@Unique(['project_id', 'predecessor_id', 'successor_id'])
export class TaskLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  project_id: string;

  /** Task tiền nhiệm (phải hoàn thành trước) */
  @Column()
  predecessor_id: string;

  /** Task kế nhiệm (phải chờ predecessor xong) */
  @Column()
  successor_id: string;

  /** Loại mối quan hệ: FS (Finish-to-Start) */
  @Column({ type: 'varchar', length: 5, default: LinkType.FS })
  link_type: LinkType;

  /** Thời gian chờ (Lag) tính bằng ngày. Âm = Lead. */
  @Column({ type: 'int', default: 0 })
  lag_days: number;

  @CreateDateColumn()
  created_at: Date;
}
