#!/usr/bin/env node
/**
 * Verify Document Control v2.1 migration — Gate 4 §3.2 + Gate 5 §2.4
 *
 * Chạy SAU KHI `npm run migration:run` thành công:
 *   cd D:/SHERP/SHERP
 *   node scripts/verify-document-control.mjs
 *
 * Yêu cầu: DATABASE_URL trong wms-backend/.env (tái sử dụng deps của wms-backend)
 */
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'module';

// Tái sử dụng pg + dotenv từ wms-backend/node_modules — không cần install thêm
const require = createRequire(resolve(process.cwd(), 'wms-backend/package.json'));
const { config } = require('dotenv');
const { Client } = require('pg');

// Load .env từ wms-backend
const envPath = resolve(process.cwd(), 'wms-backend/.env');
if (!existsSync(envPath)) {
  console.error('❌ Không tìm thấy wms-backend/.env — hãy copy từ .env.example và điền DATABASE_URL');
  process.exit(1);
}
config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL chưa set trong wms-backend/.env');
  process.exit(1);
}

const SSL = process.env.DATABASE_URL.includes('neon.tech') || process.env.DB_SSL === 'true';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: SSL ? { rejectUnauthorized: false } : false,
});

const checks = [
  {
    name: '[1] Số document_versions V1.0 = số project_documents có file_url',
    query: `
      SELECT
        (SELECT COUNT(*) FROM project_documents WHERE file_url IS NOT NULL AND file_url <> '') AS docs_with_file,
        (SELECT COUNT(*) FROM document_versions WHERE version_seq = 1) AS v1_created
    `,
    verify: (rows) => {
      const { docs_with_file, v1_created } = rows[0];
      return {
        pass: docs_with_file === v1_created,
        detail: `docs_with_file=${docs_with_file}, v1_created=${v1_created}`,
      };
    },
  },
  {
    name: '[2] Mỗi document có file_url đều có current_version_id',
    query: `
      SELECT COUNT(*) AS orphan FROM project_documents
      WHERE file_url IS NOT NULL AND file_url <> ''
        AND current_version_id IS NULL
    `,
    verify: (rows) => ({
      pass: rows[0].orphan === '0' || rows[0].orphan === 0,
      detail: `orphan documents: ${rows[0].orphan}`,
    }),
  },
  {
    name: '[3] search_vector không null cho mọi row',
    query: `SELECT COUNT(*) AS null_count FROM project_documents WHERE search_vector IS NULL`,
    verify: (rows) => ({
      pass: rows[0].null_count === '0' || rows[0].null_count === 0,
      detail: `null search_vector rows: ${rows[0].null_count}`,
    }),
  },
  {
    name: '[4] Extensions pg_trgm + unaccent đã cài',
    query: `SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm', 'unaccent') ORDER BY extname`,
    verify: (rows) => ({
      pass: rows.length === 2,
      detail: `extensions: ${rows.map((r) => r.extname).join(', ') || 'none'}`,
    }),
  },
  {
    name: '[5] Function f_unaccent tồn tại',
    query: `SELECT proname FROM pg_proc WHERE proname = 'f_unaccent'`,
    verify: (rows) => ({
      pass: rows.length >= 1,
      detail: `found ${rows.length} function(s)`,
    }),
  },
  {
    name: '[6] Indexes mới đã tạo (≥ 7)',
    query: `
      SELECT indexname FROM pg_indexes
      WHERE tablename IN ('document_versions', 'document_audit_logs', 'project_documents')
        AND (indexname LIKE 'IDX_DOC%' OR indexname LIKE 'UQ_DOC%')
      ORDER BY indexname
    `,
    verify: (rows) => ({
      pass: rows.length >= 7,
      detail: `${rows.length} indexes: ${rows.map((r) => r.indexname).join(', ')}`,
    }),
  },
  {
    name: '[7] Privilege VIEW_AUDIT đã seed',
    query: `SELECT privilege_code, module FROM privileges WHERE privilege_code = 'VIEW_AUDIT'`,
    verify: (rows) => ({
      pass: rows.length === 1 && rows[0].module === 'DOCUMENT',
      detail: rows.length === 1 ? `module=${rows[0].module}` : 'NOT FOUND — chạy backend ít nhất 1 lần để trigger SeedService',
    }),
  },
  {
    name: '[8] SUPER_ADMIN có privilege VIEW_AUDIT',
    query: `
      SELECT r.role_code
      FROM roles r
      JOIN role_privileges rp ON rp.role_id = r.id
      JOIN privileges p ON p.id = rp.privilege_id
      WHERE p.privilege_code = 'VIEW_AUDIT' AND r.role_code = 'SUPER_ADMIN'
    `,
    verify: (rows) => ({
      pass: rows.length >= 1,
      detail: rows.length >= 1 ? 'assigned' : 'NOT assigned — chạy backend lần đầu sẽ auto gán',
    }),
  },
  {
    name: '[9] document_audit_logs có BRIN index trên created_at',
    query: `
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'document_audit_logs'
        AND indexdef ILIKE '%brin%'
    `,
    verify: (rows) => ({
      pass: rows.length >= 1,
      detail: rows.length >= 1 ? rows[0].indexname : 'BRIN index missing',
    }),
  },
];

(async () => {
  console.log('🔍 Document Control v2.1 — DB Verification\n');
  console.log(`DB: ${process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@')}\n`);

  try {
    await client.connect();
  } catch (err) {
    console.error(`❌ Không kết nối được DB: ${err.message}`);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const check of checks) {
    try {
      const { rows } = await client.query(check.query);
      const { pass, detail } = check.verify(rows);
      const icon = pass ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
      console.log(`   → ${detail}\n`);
      if (pass) passed++;
      else failed++;
    } catch (err) {
      console.log(`❌ ${check.name}`);
      console.log(`   → ERROR: ${err.message}\n`);
      failed++;
    }
  }

  await client.end();

  console.log('─'.repeat(60));
  console.log(`Kết quả: ${passed}/${checks.length} PASS · ${failed} FAIL`);

  if (failed > 0) {
    console.log('\n⚠️  Có lỗi — kiểm tra migration đã chạy đầy đủ chưa?');
    console.log('   cd wms-backend && npm run migration:run');
    process.exit(1);
  }
  console.log('\n✅ Migration verification PASS. Tiếp theo: smoke test UI (TEST_REPORT §3.3)');
})();
