/**
 * SH ERP — Database Clean Script
 * Xoa du lieu test/rac, giu nguyen du lieu goc (seed)
 *
 * Usage: npm run db:clean
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import chalk from 'chalk';

/** Hoi xac nhan tu user truoc khi thuc hien */
function confirm(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

console.log(chalk.red.bold('\n🧹 SH ERP — XOA DU LIEU RAC (Test data cleanup)'));
console.log(chalk.gray('══════════════════════════════════════════════════\n'));

// Read DB URL from backend .env
const envContent = readFileSync('wms-backend/.env', 'utf8');
const dbMatch = envContent.match(/DATABASE_URL=(.+)/);
if (!dbMatch) {
  console.log(chalk.red('❌ Khong tim thay DATABASE_URL!'));
  process.exit(1);
}

const dbUrl = dbMatch[1].trim();

// ── Buoc 1: Xac nhan truoc khi xoa ──
const ok = await confirm(
  chalk.yellow.bold('⚠  Ban chac chan muon xoa du lieu rac? Nhap "yes" de tiep tuc: '),
);
if (!ok) {
  console.log(chalk.gray('\n❌ Da huy. Khong xoa gi ca.\n'));
  process.exit(0);
}

// ── Buoc 2: Auto-backup truoc khi xoa ──
console.log(chalk.cyan('\n📦 Tao backup truoc khi xoa...'));
try {
  execSync(`DATABASE_URL="${dbUrl}" bash scripts/db-backup.sh`, {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  console.log(chalk.green('✅ Backup thanh cong. Tiep tuc xoa du lieu rac...\n'));
} catch {
  console.log(chalk.red('❌ Backup that bai! Huy xoa de bao toan du lieu.'));
  process.exit(1);
}

const queries = [
  // 1. Xoa approval test requests
  {
    label: 'Approval requests (test)',
    sql: `DELETE FROM approval_steps WHERE request_id IN (SELECT id FROM approval_requests WHERE entity_id LIKE 'test-%')`,
  },
  {
    label: 'Approval requests (test entities)',
    sql: `DELETE FROM approval_requests WHERE entity_id LIKE 'test-%'`,
  },
  // 2. Xoa duplicate approval configs (giu 1 ban moi nhat cho moi entity_type)
  {
    label: 'Duplicate approval configs',
    sql: `DELETE FROM approval_configs WHERE id NOT IN (
      SELECT DISTINCT ON (entity_type) id FROM approval_configs ORDER BY entity_type, created_at DESC
    )`,
  },
  // 3. Xoa employees test (Nguyen Van A, Tester Account...)
  {
    label: 'Test employees (Tester Account)',
    sql: `DELETE FROM employees WHERE employee_code LIKE 'EMP-260330-%' OR full_name = 'Tester Account'`,
  },
];

let cleaned = 0;
for (const q of queries) {
  try {
    const result = execSync(
      `psql "${dbUrl}" -t -c "${q.sql}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    const count = result.match(/DELETE (\d+)/)?.[1] || '0';
    if (count !== '0') {
      console.log(chalk.green(`  ✅ ${q.label}: ${count} rows deleted`));
      cleaned += parseInt(count);
    } else {
      console.log(chalk.gray(`  ⏭  ${q.label}: nothing to clean`));
    }
  } catch (err) {
    // psql might not be available, fallback message
    console.log(chalk.yellow(`  ⚠  ${q.label}: skipped (psql not available)`));
  }
}

console.log(chalk.gray('\n══════════════════════════════════════════════════'));
if (cleaned > 0) {
  console.log(chalk.green.bold(`\n✅ Da xoa ${cleaned} dong du lieu rac.\n`));
} else {
  console.log(chalk.green.bold('\n✅ Database da sach — khong co du lieu rac.\n'));
}
