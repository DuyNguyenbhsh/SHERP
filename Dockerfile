# ============================================================
# SH-GROUP ERP — Multi-stage Production Dockerfile
# Strategy: Single container serves both API + Frontend static
# NestJS (ServeStaticModule) handles SPA fallback for React
# ============================================================

# ── Stage 1: DEPS — Install ALL dependencies (dev + prod) ──
FROM node:22-alpine AS deps

WORKDIR /app

# Copy workspace root + both package.json for Docker layer caching
COPY package.json package-lock.json ./
COPY wms-backend/package.json ./wms-backend/
COPY wms-frontend/package.json ./wms-frontend/

RUN npm ci


# ── Stage 2: BUILD-FRONTEND — Compile React/Vite ──
FROM deps AS build-frontend

WORKDIR /app

COPY wms-frontend/ ./wms-frontend/

RUN npm run build:frontend


# ── Stage 3: BUILD-BACKEND — Compile NestJS ──
FROM deps AS build-backend

WORKDIR /app

COPY wms-backend/ ./wms-backend/

RUN npm run build:backend


# ── Stage 4: PROD-DEPS — Production node_modules only ──
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY wms-backend/package.json ./wms-backend/
COPY wms-frontend/package.json ./wms-frontend/

RUN npm ci --omit=dev --ignore-scripts


# ── Stage 5: RUNNER — Minimal production image ──
FROM node:22-alpine AS runner

# Security: non-root user
RUN addgroup -S erp && adduser -S erp -G erp

WORKDIR /app

# Production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/wms-backend/node_modules ./wms-backend/node_modules

# Compiled backend (includes typeorm-data-source.prod.js + migrations/*.js + entities/*.js)
COPY --from=build-backend /app/wms-backend/dist ./wms-backend/dist
COPY --from=build-backend /app/wms-backend/package.json ./wms-backend/package.json

# Frontend build (NestJS ServeStaticModule serves from ../wms-frontend/dist)
COPY --from=build-frontend /app/wms-frontend/dist ./wms-frontend/dist

ENV NODE_ENV=production
ENV PORT=3000

USER erp

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api || exit 1

# Run migrations (compiled JS — no ts-node needed) then start app
CMD ["sh", "-c", "cd wms-backend && node ../node_modules/typeorm/cli.js migration:run -d dist/typeorm-data-source.prod.js && node dist/main.js"]
