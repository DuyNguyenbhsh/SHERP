import { ConfigService } from '@nestjs/config';
import { buildRedisOptions } from './redis.module';

function cfg(values: Record<string, string>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('buildRedisOptions', () => {
  it('parse URL rediss://… chuẩn có TLS', () => {
    const opts = buildRedisOptions(
      cfg({
        REDIS_URL: 'rediss://default:secret@host.example.com:6380',
      }),
    );
    expect(opts.host).toBe('host.example.com');
    expect(opts.port).toBe(6380);
    expect(opts.password).toBe('secret');
    expect((opts as { tls?: object }).tls).toBeDefined();
  });

  it('strip prefix "redis-cli --tls -u " (Upstash snippet) — extract URL', () => {
    const opts = buildRedisOptions(
      cfg({
        REDIS_URL:
          'redis-cli --tls -u redis://default:abc@eager-wren-85799.upstash.io:6379',
      }),
    );
    expect(opts.host).toBe('eager-wren-85799.upstash.io');
    expect(opts.password).toBe('abc');
  });

  it('input toàn noise → throw lỗi nói rõ phải sửa env', () => {
    expect(() =>
      buildRedisOptions(cfg({ REDIS_URL: 'totally not a url' })),
    ).toThrow(/REDIS_URL không hợp lệ/);
  });

  it('fallback về REDIS_HOST khi không có REDIS_URL', () => {
    const opts = buildRedisOptions(
      cfg({ REDIS_HOST: 'localhost', REDIS_PORT: '6379' }),
    );
    expect(opts.host).toBe('localhost');
    expect(opts.port).toBe(6379);
  });
});
