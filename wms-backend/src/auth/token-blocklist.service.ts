import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../shared/redis';

@Injectable()
export class TokenBlocklistService {
  private readonly logger = new Logger(TokenBlocklistService.name);

  constructor(private readonly redis: RedisService) {}

  async revoke(jti: string, expUnix: number): Promise<void> {
    const ttl = Math.max(1, expUnix - Math.floor(Date.now() / 1000));
    const key = this.redis.keyFor('AUTH_BLOCKLIST', jti);
    await this.redis.getClient().set(key, '1', 'EX', ttl);
  }

  async isRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    try {
      const key = this.redis.keyFor('AUTH_BLOCKLIST', jti);
      const val = await this.redis.getClient().get(key);
      return val !== null;
    } catch (err) {
      // Fail-open: Redis down không được lockout toàn hệ thống
      this.logger.warn(
        `Blocklist check failed, fail-open: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
