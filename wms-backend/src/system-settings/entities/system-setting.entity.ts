import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_settings')
@Index('idx_setting_key', ['setting_key'], { unique: true })
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  setting_key: string;

  @Column({ type: 'text' })
  setting_value: string;

  @Column({ type: 'varchar', length: 50, default: 'STRING' })
  value_type: string; // STRING, NUMBER, BOOLEAN, JSON

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, default: 'GENERAL' })
  category: string; // GENERAL, FINANCE, HR, SYSTEM

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
