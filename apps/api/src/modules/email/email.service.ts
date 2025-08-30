import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private settingsService: SettingsService) {}

  private async getTransporter(tenantId: string) {
    const settings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'email'
    );

    if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
      throw new Error('Email settings not configured');
    }

    return nodemailer.createTransport({
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || '587'),
      secure: settings.smtp_secure === 'true',
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });
  }

  async sendEmail(tenantId: string, options: EmailOptions): Promise<void> {
    try {
      const transporter = await this.getTransporter(tenantId);
      const settings = await this.settingsService.getSettingsByCategory(
        tenantId,
        'email'
      );

      const mailOptions = {
        from: options.from || settings.smtp_from || settings.smtp_user,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(tenantId: string, userEmail: string, userName: string) {
    const generalSettings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'general'
    );

    const companyName = generalSettings.company_name || 'Fulexo';

    await this.sendEmail(tenantId, {
      to: userEmail,
      subject: `${companyName}'e Hoş Geldiniz!`,
      html: `
        <h1>Merhaba ${userName},</h1>
        <p>${companyName} platformuna hoş geldiniz!</p>
        <p>Hesabınız başarıyla oluşturuldu. Artık tüm özellikleri kullanmaya başlayabilirsiniz.</p>
        <p>Herhangi bir sorunuz olursa, lütfen bizimle iletişime geçmekten çekinmeyin.</p>
        <p>Saygılarımızla,<br>${companyName} Ekibi</p>
      `,
    });
  }

  async sendPasswordResetEmail(
    tenantId: string,
    userEmail: string,
    resetToken: string
  ) {
    const generalSettings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'general'
    );

    const companyName = generalSettings.company_name || 'Fulexo';
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    await this.sendEmail(tenantId, {
      to: userEmail,
      subject: `Şifre Sıfırlama - ${companyName}`,
      html: `
        <h1>Şifre Sıfırlama Talebi</h1>
        <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
        <p><a href="${resetUrl}">Şifremi Sıfırla</a></p>
        <p>Bu linkin geçerlilik süresi 1 saattir.</p>
        <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        <p>Saygılarımızla,<br>${companyName} Ekibi</p>
      `,
    });
  }

  async sendOrderNotification(
    tenantId: string,
    orderData: any
  ) {
    const notificationSettings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'notification'
    );

    if (notificationSettings.email_notifications !== 'true') {
      return;
    }

    const generalSettings = await this.settingsService.getSettingsByCategory(
      tenantId,
      'general'
    );

    const supportEmail = generalSettings.support_email;
    if (!supportEmail) return;

    await this.sendEmail(tenantId, {
      to: supportEmail,
      subject: `Yeni Sipariş: #${orderData.orderNumber}`,
      html: `
        <h1>Yeni Sipariş Alındı</h1>
        <p><strong>Sipariş No:</strong> ${orderData.orderNumber}</p>
        <p><strong>Müşteri:</strong> ${orderData.customerName}</p>
        <p><strong>Tutar:</strong> ${orderData.totalAmount} ${orderData.currency}</p>
        <p><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</p>
        <p>Sipariş detaylarını panelden görüntüleyebilirsiniz.</p>
      `,
    });
  }

  async testConnection(tenantId: string): Promise<boolean> {
    try {
      const transporter = await this.getTransporter(tenantId);
      await transporter.verify();
      return true;
    } catch (error) {
      this.logger.error(`Email connection test failed: ${error.message}`);
      return false;
    }
  }
}