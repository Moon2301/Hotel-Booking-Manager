import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host', 'smtp.gmail.com'),
      port: this.config.get<number>('mail.port', 587),
      secure: this.config.get<boolean>('mail.secure', false),
      auth: {
        user: this.config.get<string>('mail.user', ''),
        pass: this.config.get<string>('mail.pass', ''),
      },
    });
  }

  async sendCheckinCredentials(opts: {
    to: string;
    guestName: string;
    bookingId: string;
    pin: string;
    qrDataUrl: string;
    expiresAt: Date;
    propertyName: string;
  }) {
    const expiresStr = opts.expiresAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #064e3b, #065f46); padding: 32px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .header p { color: #6ee7b7; margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px; }
  .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
  .pin-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
  .pin-label { font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .pin-value { font-size: 42px; font-weight: 900; color: #064e3b; letter-spacing: 10px; font-family: monospace; }
  .qr-section { text-align: center; margin: 24px 0; }
  .qr-section p { font-size: 13px; color: #64748b; margin-bottom: 12px; }
  .qr-section img { border-radius: 8px; border: 1px solid #e2e8f0; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
  .info-label { color: #94a3b8; font-weight: 600; }
  .info-value { color: #1e293b; font-weight: 700; }
  .expires { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #9a3412; margin-top: 20px; }
  .footer { padding: 20px 32px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🏨 ${opts.propertyName}</h1>
    <p>Mã Check-in Nhanh của bạn</p>
  </div>
  <div class="body">
    <p class="greeting">Xin chào, ${opts.guestName}!</p>
    <p class="subtitle">Mã check-in của bạn đã sẵn sàng. Xuất trình mã QR hoặc PIN tại quầy lễ tân để check-in nhanh chóng.</p>

    <div class="pin-box">
      <p class="pin-label">📍 Mã PIN 6 chữ số</p>
      <p class="pin-value">${opts.pin}</p>
    </div>

    <div class="qr-section">
      <p>📱 Hoặc quét mã QR bên dưới</p>
      <img src="${opts.qrDataUrl}" alt="QR Check-in" width="200" height="200" />
    </div>

    <div>
      <div class="info-row">
        <span class="info-label">Mã đặt phòng</span>
        <span class="info-value" style="font-family:monospace;font-size:12px">${opts.bookingId}</span>
      </div>
    </div>

    <div class="expires">
      ⏰ Mã này có hiệu lực đến: <strong>${expiresStr}</strong>
    </div>
  </div>
  <div class="footer">
    Email này được gửi tự động từ hệ thống Mango Hotel. Vui lòng không trả lời.
  </div>
</div>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: `"Mango Hotel" <${this.config.get<string>('mail.user', 'no-reply@mangohotel.vn')}>`,
        to: opts.to,
        subject: `[Mango Hotel] Mã Check-in nhanh của bạn — PIN: ${opts.pin}`,
        html,
      });
      this.logger.log(`Check-in credentials email sent to ${opts.to}`);
    } catch (err) {
      // Non-blocking: log error but don't fail the API call
      this.logger.error(`Failed to send check-in email to ${opts.to}: ${err.message}`);
    }
  }
}
