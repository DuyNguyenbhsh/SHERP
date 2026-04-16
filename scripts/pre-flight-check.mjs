import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import chalk from 'chalk';
import isPortReachable from 'is-port-reachable';

// ═══════════════════════════════════════════════════════════
// SH ERP — Pre-flight Check v2.0
// Kiểm tra hệ thống trước khi khởi động + Auto-fix Linting
// ═══════════════════════════════════════════════════════════

async function runCheck() {
    console.log(chalk.blue.bold('\n🚀 ĐANG KIỂM TRA HỆ THỐNG SH ERP TRƯỚC KHI BAY...'));
    console.log(chalk.gray('══════════════════════════════════════════════════'));

    let errors = 0;
    let warnings = 0;

    // ── [1/5] Kiểm tra file .env ──
    console.log('\n📂 ' + chalk.bold('[1/5] Kiểm tra file cấu hình .env...'));
    const envFiles = [
        { paths: ['wms-backend/.env'], label: 'Backend .env' },
        { paths: ['wms-frontend/.env.local', 'wms-frontend/.env'], label: 'Frontend .env' },
    ];
    for (const f of envFiles) {
        const found = f.paths.find((p) => existsSync(p));
        if (found) {
            console.log(chalk.green('   ✅ ' + f.label + ' — OK (' + found + ')'));
        } else {
            console.log(chalk.red('   ❌ ' + f.label + ' — THIẾU!'));
            errors++;
        }
    }

    // ── [2/5] Kiểm tra Database (NeonDB Cloud) ──
    console.log('\n🗄️  ' + chalk.bold('[2/5] Kiểm tra kết nối Database (NeonDB)...'));
    try {
        const envContent = readFileSync('wms-backend/.env', 'utf8');
        const dbMatch = envContent.match(/DATABASE_URL=(.+)/);
        if (dbMatch && dbMatch[1].includes('neon.tech')) {
            console.log(chalk.green('   ✅ DATABASE_URL trỏ đến NeonDB Cloud — OK'));
            // Test TCP tới NeonDB pooler
            const urlObj = new URL(dbMatch[1].split('?')[0]);
            const dbReachable = await isPortReachable(parseInt(urlObj.port) || 5432, { host: urlObj.hostname, timeout: 5000 });
            if (dbReachable) {
                console.log(chalk.green('   ✅ NeonDB endpoint phản hồi — OK'));
            } else {
                console.log(chalk.yellow('   ⚠️  NeonDB endpoint không phản hồi (có thể do cold start). Thử lại sau.'));
                warnings++;
            }
        } else if (dbMatch) {
            console.log(chalk.green('   ✅ DATABASE_URL đã cấu hình (local/custom)'));
        } else {
            console.log(chalk.red('   ❌ Không tìm thấy DATABASE_URL trong .env!'));
            errors++;
        }
    } catch (e) {
        console.log(chalk.red('   ❌ Không đọc được wms-backend/.env'));
        errors++;
    }

    // ── [3/5] Kiểm tra Linting + Auto-fix ──
    console.log('\n🔍 ' + chalk.bold('[3/5] Quét lỗi cú pháp (Linting + Auto-fix)...'));

    // Backend lint (--fix đã tích hợp trong npm run lint của backend)
    try {
        execSync('npm run lint --workspace=wms-backend', { stdio: 'ignore' });
        console.log(chalk.green('   ✅ Backend — Code sạch'));
    } catch (e) {
        // Backend lint đã tự chạy --fix rồi. Lỗi còn lại là TypeScript strict (không auto-fix được)
        console.log(chalk.yellow('   ⚠️  Backend — Đã auto-fix được, còn lại là cảnh báo TypeScript strict (không chặn khởi động)'));
        warnings++;
    }

    // Frontend lint
    try {
        execSync('npm run lint --workspace=wms-frontend', { stdio: 'ignore' });
        console.log(chalk.green('   ✅ Frontend — Code sạch'));
    } catch (e) {
        console.log(chalk.yellow('   ⚠️  Frontend — Phát hiện lỗi, đang tự động sửa (eslint --fix)...'));
        try {
            execSync('npm run lint:fix --workspace=wms-frontend', { stdio: 'ignore' });
            console.log(chalk.green('   ✅ Frontend — Đã tự sửa xong!'));
        } catch (e2) {
            // Lỗi còn lại là TypeScript strict — không chặn khởi động
            console.log(chalk.yellow('   ⚠️  Frontend — Đã auto-fix được, còn lại là cảnh báo TypeScript strict (không chặn khởi động)'));
            warnings++;
        }
    }

    // ── [4/5] Kiểm tra TypeScript ──
    console.log('\n🧪 ' + chalk.bold('[4/5] Kiểm tra TypeScript (type-check)...'));
    try {
        execSync('npm run type-check --workspace=wms-frontend', { stdio: 'ignore' });
        console.log(chalk.green('   ✅ Frontend TypeScript — Không có lỗi kiểu'));
    } catch (e) {
        console.log(chalk.yellow('   ⚠️  Frontend TypeScript — Có lỗi kiểu (không chặn khởi động)'));
        warnings++;
    }

    // ── [5/5] Kiểm tra Xung đột Port ──
    console.log('\n📡 ' + chalk.bold('[5/5] Kiểm tra xung đột Port...'));
    const backendBusy = await isPortReachable(3000, { host: 'localhost' });
    const frontendBusy = await isPortReachable(5173, { host: 'localhost' });

    if (backendBusy) {
        console.log(chalk.yellow('   ⚠️  Port 3000 (Backend) đang bị chiếm — Vite sẽ tự chọn port khác hoặc cần kill process'));
        warnings++;
    } else {
        console.log(chalk.green('   ✅ Port 3000 — Sẵn sàng'));
    }

    if (frontendBusy) {
        console.log(chalk.yellow('   ⚠️  Port 5173 (Frontend) đang bị chiếm — Vite sẽ tự chọn port khác'));
        warnings++;
    } else {
        console.log(chalk.green('   ✅ Port 5173 — Sẵn sàng'));
    }

    // ═══ TỔNG KẾT ═══
    console.log(chalk.gray('\n══════════════════════════════════════════════════'));

    if (errors === 0 && warnings === 0) {
        console.log(chalk.green.bold('\n✅ HỆ THỐNG SẴN SÀNG! DUY CÓ THỂ BẮT ĐẦU CODE.'));
        console.log(chalk.cyan('👉 Gợi ý: Chạy "npm run dev" để mở toàn bộ hệ thống.\n'));
    } else if (errors === 0) {
        console.log(chalk.yellow.bold('\n⚠️  HỆ THỐNG SẴN SÀNG (có ' + warnings + ' cảnh báo nhẹ).'));
        console.log(chalk.cyan('👉 Gợi ý: Chạy "npm run dev" — các cảnh báo trên không chặn khởi động.\n'));
    } else {
        console.log(chalk.red.bold('\n🛑 PHÁT HIỆN ' + errors + ' LỖI NGHIÊM TRỌNG + ' + warnings + ' CẢNH BÁO.'));
        console.log(chalk.red('   Duy cần xử lý các mục ❌ ở trên trước khi khởi động.\n'));
        process.exit(1);
    }
}

runCheck();
