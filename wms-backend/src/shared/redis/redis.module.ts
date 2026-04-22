import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { IOREDIS } from './redis.constants';
import { RedisService } from './redis.service';

// Domain của các Redis provider chỉ nhận kết nối TLS (scheme rediss://).
// Nếu user lỡ set scheme `redis://` ta vẫn tự bật TLS để tránh reconnect loop.
const TLS_ONLY_HOST_PATTERNS = [
  /\.upstash\.io$/i,
  /\.redns\.redis-cloud\.com$/i,
];

function isTlsOnlyHost(host: string | undefined): boolean {
  if (!host) return false;
  return TLS_ONLY_HOST_PATTERNS.some((re) => re.test(host));
}

// Back-off retry để không spam Upstash khi có sự cố handshake.
// 500ms → 1s → 2s → … tối đa 10s; trả về null sẽ DỪNG hẳn.
function defaultRetryStrategy(times: number): number | null {
  if (times > 20) return null;
  return Math.min(500 * Math.pow(2, times - 1), 10_000);
}

const BASE_OPTS: RedisOptions = {
  maxRetriesPerRequest: null, // bắt buộc cho BullMQ
  enableReadyCheck: true,
  connectTimeout: 10_000,
  retryStrategy: defaultRetryStrategy,
};

export function buildRedisOptions(config: ConfigService): RedisOptions {
  const url = config.get<string>('REDIS_URL');
  const tlsEnv =
    (config.get<string>('REDIS_TLS') || 'false').toLowerCase() === 'true';
  if (url) {
    const parsed = parseUrl(url);
    const needsTls = tlsEnv || !!parsed.tls || isTlsOnlyHost(parsed.host);
    return {
      ...BASE_OPTS,
      ...(needsTls ? { tls: {} } : {}),
      ...parsed,
    };
  }
  const host = config.get<string>('REDIS_HOST');
  const needsTls = tlsEnv || isTlsOnlyHost(host);
  return {
    ...BASE_OPTS,
    host,
    port: Number(config.get<string>('REDIS_PORT') || 6379),
    password: config.get<string>('REDIS_PASSWORD'),
    ...(needsTls ? { tls: {} } : {}),
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
        // Dùng `ready` thay vì `connect` để chỉ log khi AUTH + handshake xong.
        // Connect TCP thành công nhưng TLS/AUTH fail không được coi là sẵn sàng.
        client.once('ready', () =>
          logger.log(
            `Redis ready (${client.options.host}:${client.options.port})`,
          ),
        );
        let lastErrAt = 0;
        client.on('error', (err) => {
          // Throttle log để tránh spam khi reconnect loop (tối đa 1 log/5s).
          const now = Date.now();
          if (now - lastErrAt > 5000) {
            logger.warn(`Redis error: ${err.message}`);
            lastErrAt = now;
          }
        });
        client.on('end', () => logger.warn('Redis connection đã đóng (end)'));
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
