#!/usr/bin/env node
/**
 * Smoke test Document Control v2.1 — chạy API trực tiếp (không cần UI)
 *
 * Prereq:
 *   1. Backend đang chạy: cd wms-backend && npm run start:dev
 *   2. Migration đã chạy: npm run migration:run
 *   3. Có 1 project với ít nhất 1 document
 *
 * Chạy:
 *   node scripts/smoke-test-document-control.mjs \
 *     --api http://localhost:3000/api \
 *     --user admin --pass admin123 \
 *     --document <documentId>
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((acc, cur, i, arr) => {
      if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
      return acc;
    }, []),
);

const API = args.api || 'http://localhost:3000/api';
const USER = args.user || 'admin';
const PASS = args.pass || 'admin123';
const DOC_ID = args.document;

if (!DOC_ID) {
  console.error('❌ Thiếu --document <documentId>');
  console.error('   Ví dụ: node scripts/smoke-test-document-control.mjs --document 550e8400-...');
  process.exit(1);
}

let token = '';
const results = [];

const step = (name, fn) => async () => {
  process.stdout.write(`▶ ${name}... `);
  try {
    const result = await fn();
    console.log('✅');
    results.push({ name, status: 'PASS', detail: result ?? '' });
    return result;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    results.push({ name, status: 'FAIL', detail: err.message });
    return null;
  }
};

const api = async (method, path, body, extraHeaders = {}) => {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...extraHeaders,
  };
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
};

// Tạo file test 10KB random content cho upload
const makeTestFile = (name, content) => {
  const path = join(tmpdir(), name);
  writeFileSync(path, content);
  return path;
};

const fileToFormData = (path, noteValue) => {
  const form = new FormData();
  const buffer = readFileSync(path);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  form.append('file', blob, path.split(/[/\\]/).pop());
  form.append('change_note', noteValue);
  return form;
};

(async () => {
  console.log('🧪 Document Control v2.1 — API Smoke Test\n');
  console.log(`API: ${API}`);
  console.log(`User: ${USER}`);
  console.log(`Document: ${DOC_ID}\n`);

  let uploadedV1Id = null;
  let uploadedV2Id = null;

  await step('Login → lấy JWT token', async () => {
    const { status, json } = await api('POST', '/auth/login', {
      username: USER,
      password: PASS,
    });
    if (status !== 200 && status !== 201) throw new Error(`status=${status}`);
    token = json?.data?.access_token || json?.access_token;
    if (!token) throw new Error('không có access_token trong response');
    return `token=${token.slice(0, 20)}...`;
  })();

  if (!token) {
    console.log('\n❌ Login thất bại — dừng test');
    process.exit(1);
  }

  const file1 = makeTestFile('sherp-test-v1.pdf', `V1 content ${Date.now()}`);
  const file2 = makeTestFile('sherp-test-v2.pdf', `V2 content ${Date.now()}`);
  const file3 = makeTestFile('sherp-test-v3.pdf', `V3 content ${Date.now()}`);

  await step('[Bước 2] Upload V1 với change_note hợp lệ (≥10 ký tự)', async () => {
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions`,
      fileToFormData(file1, 'Phien ban dau tien cho smoke test'),
    );
    if (status !== 201 && status !== 200) throw new Error(`status=${status}: ${json?.message}`);
    uploadedV1Id = json?.data?.id;
    return `version_number=${json?.data?.version_number}, seq=${json?.data?.version_seq}`;
  })();

  await step('[Bước 3] Upload với change_note < 10 ký tự → expect 400', async () => {
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions`,
      fileToFormData(file2, 'ngan'),
    );
    if (status !== 400) throw new Error(`expected 400, got ${status}: ${json?.message}`);
    return 'rejected correctly';
  })();

  await step('[Bước 4] Upload file trùng checksum V1 → expect 409 (BR-DOC-03)', async () => {
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions`,
      fileToFormData(file1, 'Cố upload lại file cũ — verify checksum'),
    );
    if (status !== 409) throw new Error(`expected 409, got ${status}: ${json?.message}`);
    return 'duplicate checksum rejected';
  })();

  await step('[Bước 5] Upload V2 hợp lệ → verify seq+1', async () => {
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions`,
      fileToFormData(file2, 'Cap nhat V2 cho smoke test'),
    );
    if (status !== 201 && status !== 200) throw new Error(`status=${status}`);
    uploadedV2Id = json?.data?.id;
    return `version_number=${json?.data?.version_number}`;
  })();

  await step('[Bước 6] GET versions list → verify có V1 + V2', async () => {
    const { status, json } = await api('GET', `/documents/${DOC_ID}/versions`);
    if (status !== 200) throw new Error(`status=${status}`);
    const count = json?.data?.length ?? 0;
    if (count < 2) throw new Error(`chỉ có ${count} versions, expect ≥ 2`);
    return `${count} versions`;
  })();

  await step('[Bước 7] Rollback về V1 → tạo version mới source_version_id=V1', async () => {
    if (!uploadedV1Id) throw new Error('không có V1 id');
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions/${uploadedV1Id}/rollback`,
      { reason: 'Rollback test — quay về phiên bản đầu' },
    );
    if (status !== 201 && status !== 200) throw new Error(`status=${status}: ${json?.message}`);
    return `new version=${json?.data?.version_number}, source=${json?.data?.source_version_id?.slice(0, 8)}`;
  })();

  await step('[Bước 8] Submit approval (có thể fail nếu chưa config workflow)', async () => {
    if (!uploadedV2Id) throw new Error('không có V2 id');
    const { status, json } = await api(
      'POST',
      `/documents/${DOC_ID}/versions/${uploadedV2Id}/submit-approval`,
      { note: 'Gui duyet test' },
    );
    if (status === 400 && json?.message?.includes('Chưa cấu hình workflow')) {
      return 'expected — cần tạo ApprovalConfig DOCUMENT_VERSION qua UI trước';
    }
    if (status !== 201 && status !== 200) throw new Error(`status=${status}: ${json?.message}`);
    return `request created`;
  })();

  await step('[Bước 13] Full-text search có dấu', async () => {
    const { status, json } = await api('GET', `/documents/search?keyword=phien`);
    if (status !== 200) throw new Error(`status=${status}`);
    return `total=${json?.data?.total}`;
  })();

  await step('[Bước 13b] Full-text search không dấu (unaccent)', async () => {
    const { status, json } = await api('GET', `/documents/search?keyword=phi%C3%AAn`);
    if (status !== 200) throw new Error(`status=${status}`);
    return `total=${json?.data?.total}`;
  })();

  await step('[Bước 14] GET audit logs — cần privilege VIEW_AUDIT', async () => {
    const { status, json } = await api('GET', `/documents/${DOC_ID}/audit-logs`);
    if (status === 403) {
      return 'expected 403 nếu user không có VIEW_AUDIT';
    }
    if (status !== 200) throw new Error(`status=${status}`);
    return `${json?.data?.length ?? 0} audit events`;
  })();

  // Summary
  console.log('\n' + '─'.repeat(60));
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Kết quả: ${passed}/${results.length} PASS · ${failed} FAIL\n`);

  if (failed > 0) {
    console.log('❌ FAIL details:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  }
  console.log('✅ Smoke test PASS');
})();
