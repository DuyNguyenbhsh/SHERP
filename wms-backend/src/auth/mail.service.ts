import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Mail service configured: ${host}:${port}`);
    } else {
      this.logger.warn(
        'SMTP chưa cấu hình — email sẽ được in ra console thay vì gửi thật.',
      );
    }
  }

  async sendResetPasswordEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5174';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const subject = '[SH-ERP] Đặt lại mật khẩu';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a56db;">SH ERP — Đặt lại mật khẩu</h2>
        <p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản này.</p>
        <p>Nhấn vào nút bên dưới để đặt mật khẩu mới. Link có hiệu lực trong <strong>30 phút</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1a56db;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">
          Đặt lại mật khẩu
        </a>
        <p style="color:#666;font-size:13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">&copy; SH-GROUP. Hệ thống quản lý nội bộ.</p>
      </div>
    `;

    if (this.transporter) {
      const from =
        this.configService.get<string>('SMTP_FROM') || 'noreply@sh-group.vn';
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Reset email sent to: ${to}`);
    } else {
      // Fallback: In ra console khi chưa có SMTP
      this.logger.warn('══════════════════════════════════════════');
      this.logger.warn('  [SIMULATED EMAIL] — SMTP chưa cấu hình');
      this.logger.warn(`  To: ${to}`);
      this.logger.warn(`  Subject: ${subject}`);
      this.logger.warn(`  Reset Link: ${resetLink}`);
      this.logger.warn('══════════════════════════════════════════');
    }
  }
}
