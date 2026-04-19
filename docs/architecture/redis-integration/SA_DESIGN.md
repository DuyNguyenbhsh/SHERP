# SA_DESIGN — Redis Integration (SHERP Backend)

**Phạm vi:** Tích hợp Redis (Upstash managed) vào `wms-backend` phục vụ 4 nhóm chức năng:
1. Response Cache
2. Background Queue (BullMQ)
3. Rate Limiting (Throttler storage)
4. JWT Token Blocklist (logout/revoke)

**Ngày:** 2026-04-18 · **Provider:** Upstash (`eager-wren-85799.upstash.io:6379`, TLS bắt buộc → scheme `rediss://`)

---

## 1. Ràng buộc hiện có

- NestJS 11, TypeORM 0.3, PostgreSQL (Neon), `@nestjs/throttler 6.5` đang chạy **storage in-memory**.
- JWT payload hiện: `{ sub, username, privileges, employee_id?, contexts? }` — **chưa có `jti`**. Phải bổ sung `jti` để blocklist.
- Upstash Free tier: ~10.000 commands/ngày, 256 MB, single region. BullMQ polling sẽ tiêu command nhanh → cảnh báo dưới §6.

## 2. Kiến trúc

```
┌────────── AppModule ─────────────────────────────────────┐
│                                                           │
│  RedisModule (Global)                                     │
│    └─ IOREDIS token  ─── ioredis.Redis instance (1x)      │
│    └─ RedisService   ─── helper (ping, keyFor, health)    │
│                                                           │
│  RedisService.cache API         ← get/set/del + namespaced │
│  ThrottlerModule.forRootAsync   ← storage: ThrottlerStorageRedisService │
│  BullModule.forRootAsync        ← connection: ioredis opts │
│                                                           │
│  AuthModule                                               │
│    └─ TokenBlocklistService     ← ioredis (SET jti EX)    │
│    └─ JwtStrategy (kiểm blocklist trong validate())       │
│    └─ AuthService (sign JWT với jti = uuidv4)             │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Single connection policy:** Chỉ tạo **một** `new Redis()` duy nhất (trong `RedisModule`). Mọi module khác nhận lại qua DI token `IOREDIS` hoặc factory. Lý do: Upstash tính theo connection, và nhiều connection gây waste + thrashing TLS handshake.

## 3. Key Namespace (bắt buộc)

Format: `sherp:{env}:{purpose}:{rest}`

| Purpose | Prefix | TTL chuẩn | Ghi chú |
|---|---|---|---|
| Cache response | `sherp:{env}:cache:*` | 60s (GET list), 300s (master data) | Invalidate trên mutation |
| BullMQ | `sherp:{env}:bull:{queueName}:*` | theo job | Dùng `prefix` option của BullMQ |
| Throttler | `sherp:{env}:throttle:*` | theo ttl throttle | Tự động từ library |
| Auth blocklist | `sherp:{env}:authbl:{jti}` | = remaining TTL của access token (≤15m) | SET với `EX` |

`{env}` lấy từ `NODE_ENV` (`development` / `staging` / `production`) để tránh xung đột dữ liệu khi dev/staging chia sẻ cùng Redis instance.

## 4. File Layout (mới)

```
src/
├── shared/
│   └── redis/
│       ├── redis.module.ts       # @Global, provide IOREDIS + RedisService
│       ├── redis.service.ts      # ping, keyFor(), getClient()
│       ├── redis.constants.ts    # IOREDIS_TOKEN, KEY_PREFIXES
│       └── index.ts
└── auth/
    ├── token-blocklist.service.ts  # revoke(jti, expSec), isRevoked(jti)
    └── (sửa) jwt.strategy.ts, auth.service.ts, auth.controller.ts
```

## 5. Thay đổi API / DTO

| Endpoint | Thay đổi | Lý do |
|---|---|---|
| `POST /auth/login` | Response giữ nguyên; JWT payload thêm `jti` | Server-side logout |
| `POST /auth/refresh` | JWT payload thêm `jti` | idem |
| `POST /auth/logout` (mới nếu chưa có) | Revoke `jti` + `is_revoked` refresh token | Logout tức thì, không chờ token hết hạn |

**Không** phá backward compat frontend — payload chỉ **thêm** field, không đổi tên.

## 6. Rủi ro & Mitigation

| Rủi ro | Mitigation |
|---|---|
| Upstash Free hết quota command vì BullMQ poll | Set `BULL_ENABLED=false` trong `.env` dev, bật chỉ khi cần. Monitor Upstash dashboard. Production → Upstash Pay-as-you-go hoặc self-hosted. |
| Redis down làm sập toàn bộ API | Cache: degrade gracefully (cache-manager fallback). Throttler Redis: fallback in-memory. Blocklist: **fail-closed** cho logout, **fail-open** cho validate (log warning) — tránh lockout toàn hệ. |
| Key collision giữa env | Namespace `sherp:{env}:*` bắt buộc. |
| Secret lộ | `.env` gitignored; rotate token Upstash nếu push nhầm. |

## 7. Test Plan (cho Gate 5 QA)

- [ ] `GET /health/redis` trả về `{ status: 'ok', latency_ms, redis_version }`
- [ ] Cache: gọi endpoint list master-data 2 lần → lần 2 không log query SQL
- [ ] Throttler: gọi `POST /auth/login` sai 6 lần → lần 6 nhận `429 Too Many Requests`
- [ ] Blocklist: login → logout → gọi API bằng token cũ → nhận `401`
- [ ] BullMQ (nếu enabled): enqueue job gửi email → worker nhận và thực thi

## 8. Rollout

1. Tạo `RedisModule` + `RedisService`, endpoint `/health/redis`.
2. Migrate ThrottlerModule sang Redis storage (có feature flag `THROTTLE_STORE=redis|memory`).
3. Cache qua `RedisService.cache.getOrSet(key, ttl, loader)` — KHÔNG dùng `@nestjs/cache-manager` (conflict version). Apply cho master-data trước.
4. Blocklist: thêm `jti` vào payload, thêm endpoint `POST /auth/logout`.
5. BullMQ **tắt mặc định** (`BULL_ENABLED=false`). Bật khi có use case thực (email queue, export report).
