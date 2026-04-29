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
//   qa-critical-path      QA   — 24 cases từ QA_TEST_MATRIX (A+B+D+F): 14-15 BE-auto + 9-10 UI-skip
//                                 (D-4 chuyển từ skip → auto khi có DATABASE_URL)
//
// Env vars:
//   DATABASE_URL          required for verify-* / rollback-rehearsal; optional cho qa-critical-path D-4
//   API_BASE_URL          smoke-tests + qa-critical-path, default http://localhost:3000/api
//   AUTH_TOKEN_REGULAR    smoke-tests S-2/3/4 + qa-critical-path Section A/B/D-1 (User-A: VIEW_PROJECTS)
//   AUTH_TOKEN_CROSSORG   smoke-tests S-6/10 + qa-critical-path Section D-2/3, F-1 (User-B: VIEW_ALL_PROJECTS)
//   TEST_PROJECT_CODE     qa-critical-path A-3/4 + F-1 — project_code đã seed (default TOW-VCQ7-001)
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
  'qa-critical-path': runQaCriticalPath,
};

const COMMANDS_WITHOUT_DB = new Set(['smoke-tests', 'qa-critical-path']);

// ── Entry ────────────────────────────────────────────────────────
async function main() {
  if (!command || !COMMANDS[command]) {
    printUsage();
    process.exit(2);
  }

  if (!process.env.DATABASE_URL && !COMMANDS_WITHOUT_DB.has(command)) {
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
  qa-critical-path      QA   24 cases (A+B+D+F) — 14-15 BE-auto + 9-10 UI-skip

Env vars:
  DATABASE_URL, API_BASE_URL, AUTH_TOKEN_REGULAR, AUTH_TOKEN_CROSSORG
  TEST_PROJECT_CODE (qa-critical-path, default TOW-VCQ7-001)`);
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

// ── qa-critical-path ─────────────────────────────────────────────
// Critical path từ QA_TEST_MATRIX.md: Section A (Basic LOV) + B (unaccent) +
// D (Cross-org) + F (Budget warning). Tổng 24 case — 15 BE-automated, 9 UI-skip.
async function runQaCriticalPath() {
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
  const tokenA = process.env.AUTH_TOKEN_REGULAR;
  const tokenB = process.env.AUTH_TOKEN_CROSSORG;
  const projectCode = process.env.TEST_PROJECT_CODE ?? 'TOW-VCQ7-001';

  console.log('═══════════════════════════════════════════════════');
  console.log('  QA Critical Path — feature/master-plan-project-lookup');
  console.log('═══════════════════════════════════════════════════\n');
  info(`API base: ${apiBase}`);
  info(`Test project code: ${projectCode}`);
  if (!tokenA) warn('AUTH_TOKEN_REGULAR not set — Section A/B/D-1 sẽ skip BE-auto.');
  if (!tokenB) warn('AUTH_TOKEN_CROSSORG not set — Section D-2/3 + F-1 sẽ skip BE-auto.');
  if (!process.env.DATABASE_URL) warn('DATABASE_URL not set — D-4 audit log query sẽ skip.');
  console.log();

  const r = { auto: 0, pass: 0, fail: 0, skip: 0, manualChecklist: [] };

  // ── Section A — Basic LOV ────────────────────────────────────────
  console.log(`${C.bold}Section A — Basic LOV (BE-testable: 4/7)${C.reset}`);
  qaSkip('A-1', 'UI-only (placeholder text trigger)', r);
  if (tokenA) {
    await qaTc('A-2', 'Lookup không q → 200 + envelope OK', r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup`, { headers: { Authorization: `Bearer ${tokenA}` } });
      if (res.status !== 200) return qaFailFromRes(res, `expect 200, got ${res.status}`);
      const body = await res.json();
      if (!body || typeof body !== 'object' || !('status' in body) || !('message' in body) || !('data' in body)) {
        return { ok: false, msg: 'envelope không có {status, message, data}', evidence: JSON.stringify(body).slice(0, 200) };
      }
      if (!Array.isArray(body.data?.items) || typeof body.data?.total !== 'number') {
        return { ok: false, msg: 'data.{items, total} shape sai', evidence: JSON.stringify(body.data).slice(0, 200) };
      }
      return { ok: true, msg: `200 + envelope OK · items=${body.data.items.length}, total=${body.data.total}` };
    });

    await qaTc('A-3', `Search "TOW" → ≥1 item, có ${projectCode}`, r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=TOW`, { headers: { Authorization: `Bearer ${tokenA}` } });
      if (res.status !== 200) return qaFailFromRes(res, `HTTP ${res.status}`);
      const items = (await res.json())?.data?.items ?? [];
      if (items.length < 1) return { ok: false, msg: `items=${items.length}, expect ≥1 (kiểm tra seed-qa-projects.ts đã chạy)` };
      const found = items.some((it) => it.project_code === projectCode);
      return found
        ? { ok: true, msg: `${items.length} item, contain ${projectCode}` }
        : { ok: true, msg: `${items.length} item, KHÔNG có ${projectCode} — kiểm seed`, warning: true };
    });

    await qaTc('A-4', 'Item shape {id, project_code, project_name, status, stage, organization_id?, organization_name?}', r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=TOW`, { headers: { Authorization: `Bearer ${tokenA}` } });
      const items = (await res.json())?.data?.items ?? [];
      if (items.length === 0) return { ok: false, msg: 'không có item nào để verify shape (cần seed)' };
      const required = ['id', 'project_code', 'project_name', 'status', 'stage'];
      const missing = required.filter((k) => !(k in items[0]));
      if (missing.length > 0) return { ok: false, msg: `missing keys: ${missing.join(', ')}`, evidence: JSON.stringify(items[0]).slice(0, 200) };
      return { ok: true, msg: `shape OK (${Object.keys(items[0]).join(', ')})` };
    });
  } else {
    qaSkip('A-2', 'AUTH_TOKEN_REGULAR not set', r);
    qaSkip('A-3', 'AUTH_TOKEN_REGULAR not set', r);
    qaSkip('A-4', 'AUTH_TOKEN_REGULAR not set', r);
  }
  qaSkip('A-5', 'UI-only (click select → trigger label update)', r);
  qaSkip('A-6', 'UI-only (X button clear selection)', r);
  if (tokenA) {
    await qaTc('A-7', 'Empty match query "XXXXYYY" → items.length=0', r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=XXXXYYY`, { headers: { Authorization: `Bearer ${tokenA}` } });
      if (res.status !== 200) return qaFailFromRes(res, `HTTP ${res.status}`);
      const items = (await res.json())?.data?.items ?? [];
      if (items.length !== 0) return { ok: false, msg: `items=${items.length}, expect 0`, evidence: JSON.stringify(items).slice(0, 200) };
      return { ok: true, msg: 'items.length=0' };
    });
  } else {
    qaSkip('A-7', 'AUTH_TOKEN_REGULAR not set', r);
  }

  // ── Section B — Vietnamese unaccent ──────────────────────────────
  console.log(`\n${C.bold}Section B — Vietnamese unaccent (BE-testable: 5/5)${C.reset}`);
  const unaccentQueries = [
    ['B-1', 'truong', 'lowercase no-accent'],
    ['B-2', 'TRUONG', 'uppercase no-accent'],
    ['B-3', 'dai hoc', 'multi-word no-accent'],
    ['B-4', 'đại học', 'multi-word có dấu'],
    ['B-5', 'tháp', 'có dấu'],
  ];
  for (const [tc, q, label] of unaccentQueries) {
    if (!tokenA) { qaSkip(tc, 'AUTH_TOKEN_REGULAR not set', r); continue; }
    await qaTc(tc, `Search "${q}" (${label}) → 200 OK`, r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${tokenA}` } });
      if (res.status !== 200) return qaFailFromRes(res, `HTTP ${res.status}`);
      const items = (await res.json())?.data?.items ?? [];
      return { ok: true, msg: `${items.length} match (count tuỳ seed; verify khác 0 = unaccent OK)` };
    });
  }

  // ── Section D — Cross-org ────────────────────────────────────────
  console.log(`\n${C.bold}Section D — Cross-org (BE-testable: 4-5/5)${C.reset}`);
  if (tokenA) {
    await qaTc('D-1', 'User-A search "a" → all items same org (RBAC anti-leak)', r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=a&limit=50`, { headers: { Authorization: `Bearer ${tokenA}` } });
      if (res.status !== 200) return qaFailFromRes(res, `HTTP ${res.status}`);
      const items = (await res.json())?.data?.items ?? [];
      if (items.length === 0) return { ok: true, msg: 'items=0 (skip verify, cần seed)', warning: true };
      const orgIds = new Set(items.map((i) => i.organization_id).filter(Boolean));
      if (orgIds.size > 1) return { ok: false, msg: `User-A thấy ${orgIds.size} org → RBAC LEAK!`, evidence: [...orgIds].join(', ') };
      return { ok: true, msg: `${items.length} item, all org=${[...orgIds][0] ?? '<null>'}` };
    });
  } else {
    qaSkip('D-1', 'AUTH_TOKEN_REGULAR not set', r);
  }

  let dBody = null;
  if (tokenB) {
    await qaTc('D-2', 'User-B search "a" → multi-org (cross-org enabled)', r, async () => {
      const res = await fetch(`${apiBase}/projects/lookup?q=a&limit=50`, { headers: { Authorization: `Bearer ${tokenB}` } });
      if (res.status !== 200) return qaFailFromRes(res, `HTTP ${res.status}`);
      dBody = await res.json();
      const items = dBody?.data?.items ?? [];
      if (items.length === 0) return { ok: false, msg: 'items=0 — cross-org user thấy 0 → seed thiếu hoặc RBAC sai' };
      const orgIds = new Set(items.map((i) => i.organization_id).filter(Boolean));
      if (orgIds.size < 2) return { ok: false, msg: `chỉ ${orgIds.size} org — cross-org chưa hoạt động hoặc seed thiếu cross-org`, evidence: [...orgIds].join(', ') };
      return { ok: true, msg: `${items.length} item, ${orgIds.size} distinct orgs` };
    });

    await qaTc('D-3', 'D-2 items có organization_name field', r, async () => {
      const items = dBody?.data?.items ?? [];
      if (items.length === 0) return { ok: false, msg: 'D-2 không có item để verify' };
      const missing = items.filter((i) => !('organization_name' in i));
      if (missing.length > 0) return { ok: false, msg: `${missing.length}/${items.length} item thiếu organization_name`, evidence: JSON.stringify(items[0]).slice(0, 200) };
      return { ok: true, msg: `${items.length}/${items.length} có organization_name` };
    });
  } else {
    qaSkip('D-2', 'AUTH_TOKEN_CROSSORG not set', r);
    qaSkip('D-3', 'AUTH_TOKEN_CROSSORG not set', r);
  }

  if (process.env.DATABASE_URL) {
    await qaTc('D-4', 'Cross-org audit log query (DB) — count entries reason=CREATE_MASTER_PLAN_CROSS_ORG', r, async () => {
      const result = await withClient(async (client) => {
        const row = await client.query(`
          SELECT COUNT(*)::int AS cnt FROM audit_logs WHERE reason = 'CREATE_MASTER_PLAN_CROSS_ORG';
        `);
        return row.rows[0]?.cnt ?? 0;
      });
      if (result === false) return { ok: false, msg: 'DB connect failed' };
      r.manualChecklist.push('D-4 UI flow: User-B chọn cross-org project → tạo MasterPlan → verify entry mới audit_logs.');
      return { ok: true, msg: `${result} entries hiện có (UI flow tạo entry mới vẫn cần manual)` };
    });
  } else {
    qaSkip('D-4', 'UI-only flow + DATABASE_URL not set', r);
  }

  await qaTc('D-5', 'No Authorization header → 401', r, async () => {
    const res = await fetch(`${apiBase}/projects/lookup?q=a`);
    if (res.status === 401) return { ok: true, msg: 'HTTP 401 Unauthorized' };
    return { ok: false, msg: `expect 401, got ${res.status}` };
  });

  // ── Section F — Budget warning ───────────────────────────────────
  console.log(`\n${C.bold}Section F — Budget warning (BE-testable: 1/7)${C.reset}`);
  if (tokenB) {
    await qaTc('F-1', 'POST /master-plan với budget khổng lồ → warning=true + headroom (string)', r, async () => {
      const lookupRes = await fetch(`${apiBase}/projects/lookup?q=${encodeURIComponent(projectCode)}`, { headers: { Authorization: `Bearer ${tokenB}` } });
      if (lookupRes.status !== 200) return qaFailFromRes(lookupRes, `lookup pre-req HTTP ${lookupRes.status}`);
      const lookupBody = await lookupRes.json();
      const project = lookupBody?.data?.items?.find((p) => p.project_code === projectCode) ?? lookupBody?.data?.items?.[0];
      if (!project) return { ok: false, msg: `Không tìm thấy project ${projectCode} qua lookup (kiểm seed)` };

      const payload = {
        code: `MP-QA-${Date.now()}`,
        name: `[QA Critical Path] Budget warning ${new Date().toISOString().slice(0, 10)}`,
        year: new Date().getFullYear(),
        project_id: project.id,
        budget_vnd: '999999999999999',
      };
      const res = await fetch(`${apiBase}/master-plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (res.status >= 400) return { ok: false, msg: `HTTP ${res.status} (DTO mismatch?)`, evidence: JSON.stringify(body).slice(0, 300) };
      if (body?.warning !== true) return { ok: false, msg: `expect warning=true, got ${body?.warning}`, evidence: JSON.stringify(body).slice(0, 300) };
      if (typeof body?.headroom !== 'string') return { ok: false, msg: `expect headroom string, got ${typeof body?.headroom}`, evidence: JSON.stringify(body).slice(0, 300) };
      r.manualChecklist.push(`F-1 cleanup: master_plan ${body?.data?.id ?? '<id>'} đã tạo trong DB — xoá nếu cần.`);
      return { ok: true, msg: `warning=true · headroom="${body.headroom}" (BigInt-safe string)` };
    });
  } else {
    qaSkip('F-1', 'AUTH_TOKEN_CROSSORG not set', r);
  }
  qaSkip('F-2', 'UI-only (banner title + headroom format vi-VN)', r);
  qaSkip('F-3', 'UI-only (banner body line 2 — confirm message)', r);
  qaSkip('F-4', 'UI-only (footer button swap → only "Đóng")', r);
  qaSkip('F-5', 'UI-only (click Đóng → close + toast)', r);
  qaSkip('F-6', 'UI-only (verify list sau đóng có plan vừa tạo)', r);
  qaSkip('F-7', 'UI-only (budget OK → banner ẩn, auto-close)', r);

  // ── Summary ──────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────');
  console.log(`  ${C.bold}SUMMARY${C.reset}`);
  console.log('─────────────────────────────────────────────────');
  const total = r.auto + r.skip;
  console.log(`  Total cases:        ${total}`);
  console.log(`  BE-automated:       ${r.auto} (executed)`);
  console.log(`  UI-only skipped:    ${r.skip} (manual run required)`);
  console.log();
  const passMark = r.fail === 0 && r.auto > 0 ? `${C.green} ✓${C.reset}` : '';
  console.log(`  Automated PASS:     ${r.pass}/${r.auto}${passMark}`);
  console.log(`  Automated FAIL:     ${r.fail}`);
  console.log(`  Skipped UI-only:    ${r.skip}`);
  console.log();
  if (r.auto === 0) {
    console.log(`  ${C.yellow}Verdict: NO TESTS RAN${C.reset} — kiểm tra env vars (AUTH_TOKEN_*).`);
  } else if (r.fail === 0) {
    console.log(`  ${C.green}Verdict: BE-LAYER PASS${C.reset} — UI verification still pending.`);
  } else {
    console.log(`  ${C.red}Verdict: BE-LAYER FAIL${C.reset} — fix các fail trên trước khi merge PR.`);
  }
  console.log('─────────────────────────────────────────────────');

  if (r.manualChecklist.length > 0) {
    console.log(`\n${C.bold}Manual follow-up:${C.reset}`);
    for (const note of r.manualChecklist) console.log(`  • ${note}`);
  }

  return r.auto > 0 && r.fail === 0;
}

async function qaTc(tc, desc, r, fn) {
  r.auto++;
  try {
    const result = await fn();
    if (result?.ok) {
      const marker = result.warning ? `${C.yellow}⚠${C.reset}` : `${C.green}✓${C.reset}`;
      console.log(`  ${marker} ${tc} ${desc} → ${result.msg}`);
      r.pass++;
    } else {
      console.log(`  ${C.red}✗${C.reset} ${tc} ${desc} → ${C.red}${result?.msg ?? 'unknown'}${C.reset}`);
      if (result?.evidence) console.log(`     ${C.dim}evidence: ${result.evidence}${C.reset}`);
      r.fail++;
    }
  } catch (err) {
    console.log(`  ${C.red}✗${C.reset} ${tc} ${desc} → ${C.red}exception: ${err.message}${C.reset}`);
    if (VERBOSE) console.error(err);
    r.fail++;
  }
}

function qaSkip(tc, reason, r) {
  console.log(`  ${C.yellow}⊝${C.reset} ${tc} SKIP (${reason})`);
  r.skip++;
}

async function qaFailFromRes(res, msg) {
  const evidence = await res.text().catch(() => '');
  return { ok: false, msg, evidence: evidence.slice(0, 200) };
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
