import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { IOREDIS } from './redis.constants';
import { RedisService } from './redis.service';

export function buildRedisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');
  const tls =
    (config.get<string>('REDIS_TLS') || 'false').toLowerCase() === 'true';
  if (url) {
    const opts: RedisOptions = {
      maxRetriesPerRequest: null, // bắt buộc cho BullMQ
      enableReadyCheck: true,
    };
    return { ...opts, ...(tls ? { tls: {} } : {}), ...parseUrl(url) };
  }
  return {
    host: config.get<string>('REDIS_HOST'),
    port: Number(config.get<string>('REDIS_PORT') || 6379),
    password: config.get<string>('REDIS_PASSWORD'),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(tls ? { tls: {} } : {}),
  };
}

function parseUrl(url: string): Partial<RedisOptions> {
  // Upstash "Connect with redis-cli" snippet có prefix `redis-cli --tls -u <URL>`.
  // Khi user copy nguyên cả dòng thì URL không parse được → trích redis[s]:// substring.
  const match = url.match(/redis[s]?:\/\/\S+/i);
  const cleaned = match ? match[0] : url.trim();
  let u: URL;
  try {
    u = new URL(cleaned);
  } catch {
    throw new Error(
      `REDIS_URL không hợp lệ (không parse được thành URL). Cleaned="${cleaned.slice(0, 40)}...". Hãy kiểm tra env trên Render/.env, chỉ dán URL dạng "redis[s]://user:pass@host:port" — không kèm prefix "redis-cli --tls -u ".`,
    );
  }
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: decodeURIComponent(u.password || '') || undefined,
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: IOREDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const client = new Redis(buildRedisOptions(config));
        client.on('connect', () => logger.log('Redis đã kết nối'));
        client.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
        return client;
      },
    },
    RedisService,
  ],
  exports: [IOREDIS, RedisService],
})
export class RedisModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    // ioredis tự cleanup khi process exit; giữ hook để future graceful shutdown
  }
}
