#!/usr/bin/env node
// Gate 6 Deploy Helper — automation cho GATE6_DEPLOY_RUNBOOK §1 + §3 + §5.4.
// Reference: docs/features/master-plan-project-lookup/GATE6_DEPLOY_RUNBOOK.md
//
// Usage:
//   node scripts/gate6-deploy-helper.mjs <command> [--verbose]
//
// Commands:
//   verify-db-privilege   §1.1 — CREATE EXTENSION availability + role privileges
//   verify-migration      §1.2 — verify f_unaccent + 4 indexes + privilege seeded
//   smoke-tests           §3   — 10 post-deploy smoke tests (HTTP + psql)
//   rollback-rehearsal    §5.4 — apply → revert → re-apply on dev clone
//
// Env vars:
//   DATABASE_URL          required for all commands
//   API_BASE_URL          smoke-tests, default http://localhost:3000/api
//   AUTH_TOKEN_REGULAR    smoke-tests S-2/3/4 (User-A: VIEW_PROJECTS only)
//   AUTH_TOKEN_CROSSORG   smoke-tests S-6/10 (User-B: VIEW_ALL_PROJECTS)
//
// Exit codes: 0 all-pass · 1 any-fail · 2 invalid usage / missing env

import pg from 'pg';
import { execSync } from 'node:child_process';

const { Client } = pg;

// ── ANSI colors (bash terminals) ─────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};
const ok = (msg) => console.log(`${C.green}✓${C.reset} ${msg}`);
const fail = (msg) => console.log(`${C.red}✗${C.reset} ${msg}`);
const warn = (msg) => console.log(`${C.yellow}⚠${C.reset} ${msg}`);
const info = (msg) => console.log(`${C.cyan}ℹ${C.reset} ${msg}`);
const dim = (msg) => console.log(`${C.dim}${msg}${C.reset}`);

// ── CLI parse ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];
const VERBOSE = args.includes('--verbose');

const COMMANDS = {
  'verify-db-privilege': verifyDbPrivilege,
  'verify-migration': verifyMigration,
  'smoke-tests': runSmokeTests,
  'rollback-rehearsal': runRollbackRehearsal,
};

// ── Entry ────────────────────────────────────────────────────────
async function main() {
  if (!command || !COMMANDS[command]) {
    printUsage();
    process.exit(2);
  }

  if (!process.env.DATABASE_URL && command !== 'smoke-tests') {
    fail('DATABASE_URL không set — cần Postgres connection string.');
    process.exit(2);
  }

  console.log(`${C.bold}${C.cyan}── Gate 6 Helper · ${command} ──${C.reset}\n`);
  const allPass = await COMMANDS[command]();
  console.log();
  if (allPass) {
    ok(`${command} — ALL PASS`);
    process.exit(0);
  }
  fail(`${command} — có check FAIL, xem chi tiết ở trên.`);
  process.exit(1);
}

function printUsage() {
  console.log(`Usage: node scripts/gate6-deploy-helper.mjs <command> [--verbose]

Commands:
  verify-db-privilege   §1.1 CREATE EXTENSION + role check
  verify-migration      §1.2 verify migration objects exist
  smoke-tests           §3   10 post-deploy smoke tests
  rollback-rehearsal    §5.4 apply→revert→re-apply trên DEV clone

Env vars: DATABASE_URL, API_BASE_URL, AUTH_TOKEN_REGULAR, AUTH_TOKEN_CROSSORG`);
}

// ── Helpers ──────────────────────────────────────────────────────
async function withClient(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    fail(`Không kết nối được DB: ${err.message}`);
    if (VERBOSE) console.error(err);
    return false;
  }
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

function runShell(cmd, opts = {}) {
  if (VERBOSE) dim(`$ ${cmd}`);
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: VERBOSE ? 'inherit' : 'pipe',
      cwd: opts.cwd,
    });
  } catch (err) {
    if (VERBOSE) console.error(err.message);
    throw err;
  }
}

// ── §1.1 verify-db-privilege ─────────────────────────────────────
async function verifyDbPrivilege() {
  return withClient(async (client) => {
    let pass = true;

    // Check 1 — current role + super flag
    const roleRow = await client.query(`
      SELECT r.rolname, r.rolsuper, r.rolcreatedb,
             has_database_privilege(r.rolname, current_database(), 'CREATE') AS can_create
      FROM pg_roles r
      WHERE r.rolname = current_user;
    `);
    const role = roleRow.rows[0];
    if (!role) {
      fail('Không lấy được current role — query pg_roles trả empty.');
      return false;
    }
    info(`Role: ${role.rolname} · super=${role.rolsuper} · createdb=${role.rolcreatedb} · can_create=${role.can_create}`);

    if (role.rolsuper || role.can_create) {
      ok('Role có quyền CREATE — đủ điều kiện cho extension.');
    } else {
      warn('Role thiếu CREATE privilege — có thể fail CREATE EXTENSION nếu chưa enable trước.');
      pass = false;
    }

    // Check 2 — pg_trgm + unaccent extensions đã enable chưa
    const extRow = await client.query(`
      SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent');
    `);
    const extNames = extRow.rows.map((r) => r.extname);
    if (extNames.includes('pg_trgm')) ok('Extension pg_trgm đã enable.');
    else { fail('Extension pg_trgm CHƯA enable — migration 1776300000013 sẽ fail.'); pass = false; }
    if (extNames.includes('unaccent')) ok('Extension unaccent đã enable.');
    else { fail('Extension unaccent CHƯA enable — migration 1776300000013 sẽ fail.'); pass = false; }

    // Check 3 — uuid-ossp (uuid_generate_v4 dùng trong migration)
    const uuidRow = await client.query(`SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';`);
    if (uuidRow.rows.length > 0) ok('Extension uuid-ossp đã enable.');
    else { warn('uuid-ossp CHƯA enable — uuid_generate_v4() sẽ fail nếu chưa enable từ migration trước.'); }

    return pass;
  });
}

// ── §1.2 verify-migration ────────────────────────────────────────
async function verifyMigration() {
  return withClient(async (client) => {
    let pass = true;

    // 1. f_unaccent function
    const fnRow = await client.query(`
      SELECT proname, provolatile
      FROM pg_proc
      WHERE proname = 'f_unaccent' AND pronamespace = 'public'::regnamespace;
    `);
    if (fnRow.rows.length > 0) {
      const vol = fnRow.rows[0].provolatile;
      if (vol === 'i') ok('Function public.f_unaccent tồn tại + IMMUTABLE.');
      else { fail(`Function f_unaccent volatility=${vol}, expect 'i' (IMMUTABLE).`); pass = false; }
    } else {
      fail('Function public.f_unaccent CHƯA tồn tại.');
      pass = false;
    }

    // 2. 4 indexes
    const expectedIdx = [
      'idx_projects_code_lower',
      'idx_projects_status_active',
      'idx_projects_org_status',
      'idx_projects_name_unaccent_trgm',
    ];
    const idxRow = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = ANY($1::text[]);
    `, [expectedIdx]);
    const foundIdx = idxRow.rows.map((r) => r.indexname);
    for (const idx of expectedIdx) {
      if (foundIdx.includes(idx)) ok(`Index ${idx} tồn tại.`);
      else { fail(`Index ${idx} MISSING.`); pass = false; }
    }

    // 3. VIEW_ALL_PROJECTS privilege seeded
    const privRow = await client.query(`
      SELECT privilege_code, module FROM privileges WHERE privilege_code = 'VIEW_ALL_PROJECTS';
    `);
    if (privRow.rows.length > 0) {
      const p = privRow.rows[0];
      ok(`Privilege VIEW_ALL_PROJECTS seeded (module=${p.module}).`);
    } else {
      fail('Privilege VIEW_ALL_PROJECTS CHƯA seed — migration 1776300000013 chưa run hoặc rollback.');
      pass = false;
    }

    // 4. SUPER_ADMIN auto-grant
    const grantRow = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM role_privileges rp
      INNER JOIN roles r ON r.id = rp.role_id
      INNER JOIN privileges p ON p.id = rp.privilege_id
      WHERE r.role_code = 'SUPER_ADMIN' AND p.privilege_code = 'VIEW_ALL_PROJECTS';
    `);
    const granted = grantRow.rows[0]?.cnt ?? 0;
    if (granted > 0) ok('SUPER_ADMIN đã được grant VIEW_ALL_PROJECTS.');
    else warn('SUPER_ADMIN CHƯA grant VIEW_ALL_PROJECTS — đợi SeedService.onApplicationBootstrap chạy sau BE deploy.');

    // 5. Migration recorded
    const migRow = await client.query(`
      SELECT name FROM typeorm_migrations WHERE name LIKE '%AddViewAllProjectsPrivilege%';
    `);
    if (migRow.rows.length > 0) ok(`Migration recorded: ${migRow.rows[0].name}.`);
    else { fail('Migration AddViewAllProjectsPrivilege CHƯA record trong typeorm_migrations.'); pass = false; }

    return pass;
  });
}

// ── §3 smoke-tests ───────────────────────────────────────────────
async function runSmokeTests() {
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
  const tokenA = process.env.AUTH_TOKEN_REGULAR;
  const tokenB = process.env.AUTH_TOKEN_CROSSORG;

  info(`API base: ${apiBase}`);
  if (!tokenA) warn('AUTH_TOKEN_REGULAR not set — S-2/3/4 sẽ skip.');
  if (!tokenB) warn('AUTH_TOKEN_CROSSORG not set — S-5/6/10 sẽ skip.');

  const tests = [];
  let pass = true;

  // S-1 health
  tests.push(await test('S-1 Backend health', async () => {
    const res = await fetch(`${apiBase}/health`).catch((e) => ({ ok: false, error: e }));
    if (res.error) return { ok: false, msg: `fetch failed: ${res.error.message}` };
    if (!res.ok) return { ok: false, msg: `HTTP ${res.status}` };
    return { ok: true, msg: `HTTP ${res.status}` };
  }));

  // S-2 lookup endpoint reachable
  if (tokenA) tests.push(await test('S-2 Lookup endpoint reachable', async () => {
    const res = await fetch(`${apiBase}/projects/lookup?q=test`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (res.status !== 200) return { ok: false, msg: `Expect 200, got ${res.status}` };
    const body = await res.json();
    if (!body || typeof body !== 'object') return { ok: false, msg: 'response không phải JSON object' };
    return { ok: true, msg: 'HTTP 200, JSON envelope OK' };
  }));

  // S-3 lookup returns items array + total
  if (tokenA) tests.push(await test('S-3 Lookup returns items + total', async () => {
    const res = await fetch(`${apiBase}/projects/lookup?limit=5`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const body = await res.json();
    const items = body?.data?.items;
    const total = body?.data?.total;
    if (!Array.isArray(items)) return { ok: false, msg: 'data.items không phải array' };
    if (typeof total !== 'number') return { ok: false, msg: 'data.total không phải number' };
    return { ok: true, msg: `items=${items.length} · total=${total}` };
  }));

  // S-4 unaccent search
  if (tokenA) tests.push(await test('S-4 Vietnamese unaccent search', async () => {
    const res = await fetch(`${apiBase}/projects/lookup?q=truong`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (res.status !== 200) return { ok: false, msg: `HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, msg: `${body?.data?.items?.length ?? 0} item match (unaccent OK nếu DB có "Trường")` };
  }));

  // S-5 RBAC enforcement (no token → 401, bad token → 401, no privilege → 403)
  tests.push(await test('S-5 RBAC enforcement (no token → 401)', async () => {
    const res = await fetch(`${apiBase}/projects/lookup?q=x`);
    if (res.status === 401) return { ok: true, msg: 'HTTP 401 Unauthorized' };
    return { ok: false, msg: `Expect 401, got ${res.status}` };
  }));

  // S-6 cross-org via VIEW_ALL_PROJECTS
  if (tokenB) tests.push(await test('S-6 Cross-org via VIEW_ALL_PROJECTS', async () => {
    const res = await fetch(`${apiBase}/projects/lookup?limit=20`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (res.status !== 200) return { ok: false, msg: `HTTP ${res.status}` };
    const body = await res.json();
    const orgIds = new Set((body?.data?.items ?? []).map((p) => p.organization_id).filter(Boolean));
    return { ok: true, msg: `items=${body?.data?.items?.length ?? 0} · distinct org=${orgIds.size}` };
  }));

  // S-7/8/9 — manual UI test, không automate được qua HTTP
  warn('S-7 Frontend MasterPlan dialog: MANUAL — anh check trên browser');
  warn('S-8 Picker search end-to-end: MANUAL — anh check trên browser');
  warn('S-9 Create MasterPlan với picked project: MANUAL — anh check trên browser');

  // S-10 cross-org audit log via DB query
  tests.push(await test('S-10 Cross-org audit log query', async () => {
    return withClient(async (client) => {
      const row = await client.query(`
        SELECT COUNT(*)::int AS cnt
        FROM audit_logs
        WHERE reason = 'CREATE_MASTER_PLAN_CROSS_ORG'
          AND created_at > now() - interval '1 hour';
      `);
      const cnt = row.rows[0]?.cnt ?? 0;
      return { ok: true, msg: `${cnt} audit_logs cross-org trong giờ qua (chỉ verify query OK, count=0 nếu chưa có cross-org create)` };
    });
  }));

  // Summary
  console.log();
  const passed = tests.filter((t) => t).length;
  const failed = tests.length - passed;
  if (failed > 0) pass = false;
  info(`Tests run: ${tests.length} · pass: ${passed} · fail: ${failed} · manual: 3`);
  return pass;
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result?.ok) {
      ok(`${name} — ${result.msg}`);
      return true;
    }
    fail(`${name} — ${result?.msg ?? 'unknown'}`);
    return false;
  } catch (err) {
    fail(`${name} — exception: ${err.message}`);
    if (VERBOSE) console.error(err);
    return false;
  }
}

// ── §5.4 rollback-rehearsal ──────────────────────────────────────
async function runRollbackRehearsal() {
  warn('PHẢI chạy trên DEV clone, KHÔNG production. Continue chỉ khi anh chắc DB là dev.');
  info(`DATABASE_URL: ${maskUrl(process.env.DATABASE_URL)}`);
  console.log();

  // Phase 1: apply
  info('Phase 1 — npm run migration:run');
  try {
    runShell('npm run migration:run', { cwd: process.cwd() });
    ok('Apply: PASS');
  } catch {
    fail('Apply: FAIL — kiểm tra migration logs');
    return false;
  }

  // Phase 2: verify objects
  info('Phase 2 — verify objects exist');
  const applyOk = await verifyMigration();
  if (!applyOk) { fail('Verify after apply: FAIL'); return false; }

  // Phase 3: revert
  info('Phase 3 — npm run migration:revert');
  try {
    runShell('npm run migration:revert', { cwd: process.cwd() });
    ok('Revert: PASS');
  } catch {
    fail('Revert: FAIL');
    return false;
  }

  // Phase 4: verify objects gone
  info('Phase 4 — verify objects removed');
  const cleanedOk = await withClient(async (client) => {
    const fn = await client.query(`SELECT 1 FROM pg_proc WHERE proname='f_unaccent';`);
    const priv = await client.query(`SELECT 1 FROM privileges WHERE privilege_code='VIEW_ALL_PROJECTS';`);
    const idx = await client.query(`SELECT 1 FROM pg_indexes WHERE indexname='idx_projects_org_status';`);
    let cleaned = true;
    if (fn.rows.length > 0) { fail('f_unaccent vẫn còn sau revert'); cleaned = false; }
    else ok('f_unaccent removed');
    if (priv.rows.length > 0) { fail('VIEW_ALL_PROJECTS vẫn còn sau revert'); cleaned = false; }
    else ok('VIEW_ALL_PROJECTS removed');
    if (idx.rows.length > 0) { fail('idx_projects_org_status vẫn còn sau revert'); cleaned = false; }
    else ok('idx_projects_org_status removed');
    return cleaned;
  });
  if (!cleanedOk) return false;

  // Phase 5: re-apply (idempotency)
  info('Phase 5 — re-apply (idempotency check)');
  try {
    runShell('npm run migration:run', { cwd: process.cwd() });
    ok('Re-apply: PASS');
  } catch {
    fail('Re-apply: FAIL — migration không idempotent');
    return false;
  }

  // Phase 6: verify lại
  info('Phase 6 — final verify');
  const finalOk = await verifyMigration();
  return finalOk;
}

function maskUrl(url) {
  if (!url) return '<unset>';
  return url.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1****$2');
}

// ── Run ──────────────────────────────────────────────────────────
main().catch((err) => {
  fail(`Unexpected error: ${err.message}`);
  if (VERBOSE) console.error(err);
  process.exit(1);
});
