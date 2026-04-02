import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthLog, AuthEvent } from './entities/auth-log.entity';

@Injectable()
export class AuthLogService {
  constructor(
    @InjectRepository(AuthLog) private logRepo: Repository<AuthLog>,
  ) {}

  async log(params: {
    userId?: string;
    usernameInput: string;
    event: AuthEvent;
    ip?: string;
    userAgent?: string;
    failureReason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.logRepo.save({
      user_id: params.userId,
      username_input: params.usernameInput,
      event: params.event,
      ip_address: params.ip,
      user_agent: params.userAgent,
      failure_reason: params.failureReason,
      metadata: params.metadata,
    });
  }
}
