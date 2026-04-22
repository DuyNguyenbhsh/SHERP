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

  it('auto-enable TLS khi host là *.upstash.io dù scheme redis://', () => {
    const opts = buildRedisOptions(
      cfg({
        REDIS_URL: 'redis://default:abc@eager-wren-85799.upstash.io:6379',
      }),
    );
    expect((opts as { tls?: object }).tls).toBeDefined();
  });

  it('retryStrategy back-off exponential, dừng sau 20 lần', () => {
    const opts = buildRedisOptions(
      cfg({ REDIS_URL: 'rediss://h:1@example:6379' }),
    );
    const strat = opts.retryStrategy as (n: number) => number | null;
    expect(strat(1)).toBe(500);
    expect(strat(2)).toBe(1000);
    expect(strat(5)).toBe(8000);
    expect(strat(10)).toBe(10000); // capped
    expect(strat(21)).toBeNull(); // stop
  });
});
