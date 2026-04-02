import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuthEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

@Entity('auth_logs')
export class AuthLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  user_id: string;

  @Column({ length: 100 })
  username_input: string;

  @Column({ type: 'varchar', length: 30 })
  event: AuthEvent;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failure_reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
