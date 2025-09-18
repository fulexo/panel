import { Processor, Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { EmailService } from '../../modules/email/email.service';
import { SettingsService } from '../../modules/settings/settings.service';
import Redis from 'ioredis';

export interface EmailJobData {
  tenantId: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private settingsService: SettingsService,
  ) {}

  @Processor('send-email')
  async processEmail(job: Job<EmailJobData>) {
    const { tenantId, to, subject, html, text, template, templateData, priority = 'normal' } = job.data;
    
    try {
      this.logger.log(`Processing email job: ${subject} to ${to}`);

      let emailHtml = html;
      let emailText = text;

      // Process template if provided
      if (template && templateData) {
        const processedTemplate = await this.processTemplate(template, templateData);
        emailHtml = processedTemplate.html;
        emailText = processedTemplate.text;
      }

      await this.emailService.sendEmail(tenantId, {
        to,
        subject,
        html: emailHtml,
        text: emailText,
      });

      this.logger.log(`Email sent successfully: ${subject} to ${to}`);
      
      return { success: true, messageId: `email-${Date.now()}` };
    } catch (error) {
      this.logger.error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  @Processor('send-welcome-email')
  async processWelcomeEmail(job: Job<{ tenantId: string; userEmail: string; userName: string }>) {
    const { tenantId, userEmail, userName } = job.data;
    
    try {
      this.logger.log(`Processing welcome email for: ${userEmail}`);

      await this.emailService.sendWelcomeEmail(tenantId, userEmail, userName);

      this.logger.log(`Welcome email sent successfully to: ${userEmail}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Welcome email failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  @Processor('send-password-reset-email')
  async processPasswordResetEmail(job: Job<{ tenantId: string; userEmail: string; resetToken: string }>) {
    const { tenantId, userEmail, resetToken } = job.data;
    
    try {
      this.logger.log(`Processing password reset email for: ${userEmail}`);

      await this.emailService.sendPasswordResetEmail(tenantId, userEmail, resetToken);

      this.logger.log(`Password reset email sent successfully to: ${userEmail}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Password reset email failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  @Processor('send-order-notification')
  async processOrderNotification(job: Job<{ tenantId: string; orderData: Record<string, unknown> }>) {
    const { tenantId, orderData } = job.data;
    
    try {
      this.logger.log(`Processing order notification for order: ${orderData.orderNumber}`);

      await this.emailService.sendOrderNotification(tenantId, orderData);

      this.logger.log(`Order notification sent successfully for order: ${orderData.orderNumber}`);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Order notification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async processTemplate(template: string, data: Record<string, unknown>): Promise<{ html: string; text: string }> {
    // Simple template processing - in production, use a proper template engine like Handlebars
    let html = template;
    let text = template;

    // Replace placeholders with data
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value);
      html = html.replace(new RegExp(placeholder, 'g'), stringValue);
      text = text.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    // Convert HTML to text (basic implementation)
    text = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return { html, text };
  }
}

export function createEmailWorker(redis: Redis): Worker {
  return new Worker('email', async (job) => {
    const processor = new EmailProcessor(
      new PrismaService(),
      new EmailService(new SettingsService(new PrismaService())),
      new SettingsService(new PrismaService())
    );

    switch (job.name) {
      case 'send-email':
        return processor.processEmail(job);
      case 'send-welcome-email':
        return processor.processWelcomeEmail(job);
      case 'send-password-reset-email':
        return processor.processPasswordResetEmail(job);
      case 'send-order-notification':
        return processor.processOrderNotification(job);
      default:
        throw new Error(`Unknown email job type: ${job.name}`);
    }
  }, {
    connection: redis,
    concurrency: 10,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}