import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IOREDIS, KEY_PREFIXES } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly envPrefix: string;

  constructor(
    @Inject(IOREDIS) private readonly client: Redis,
    config: ConfigService,
  ) {
    const env = config.get<string>('NODE_ENV') || 'development';
    this.envPrefix = `sherp:${env}`;
  }

  getClient(): Redis {
    return this.client;
  }

  keyFor(purpose: keyof typeof KEY_PREFIXES, ...parts: string[]): string {
    return [this.envPrefix, KEY_PREFIXES[purpose], ...parts].join(':');
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; version?: string }> {
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      const info = await this.client.info('server');
      const version = info
        .split('\n')
        .find((l) => l.startsWith('redis_version'))
        ?.split(':')[1]
        ?.trim();
      return { ok: pong === 'PONG', latencyMs: Date.now() - start, version };
    } catch (err) {
      this.logger.warn(`Redis ping thất bại: ${(err as Error).message}`);
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ── CACHE helpers ─────────────────────────────────────────────────
  async cacheGet<T>(key: string): Promise<T | undefined> {
    const full = this.keyFor('CACHE', key);
    const raw = await this.client.get(full);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async cacheSet(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    const full = this.keyFor('CACHE', key);
    await this.client.set(full, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async cacheDel(key: string): Promise<void> {
    await this.client.del(this.keyFor('CACHE', key));
  }

  async cacheGetOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.cacheGet<T>(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    await this.cacheSet(key, value, ttlSeconds);
    return value;
  }
}
