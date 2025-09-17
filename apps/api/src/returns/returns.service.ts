import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.return.findMany({
        where: { order: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.return.count({ where: { order: { tenantId } } }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const entity = await this.runTenant(tenantId, async (db) => db.return.findFirst({ where: { id, order: { tenantId } }, include: { photos: true, notifications: true } }));
    if (!entity) throw new NotFoundException('Return not found');
    return entity;
  }

  async addPhoto(tenantId: string, returnId: string, fileUrl: string, note?: string) {
    const ret = await this.runTenant(tenantId, async (db) => db.return.findFirst({ where: { id: returnId, order: { tenantId } } }));
    if (!ret) throw new NotFoundException('Return not found');
    const photo = await this.runTenant(tenantId, async (db) => db.returnPhoto.create({ data: { returnId, fileUrl, note: note || null } }));
    return photo;
  }

  async notify(tenantId: string, returnId: string, channel: string, subject?: string, message?: string) {
    const ret = await this.runTenant(tenantId, async (db) => db.return.findFirst({ 
      where: { id: returnId, order: { tenantId } },
      include: { order: true }
    }));
    if (!ret) throw new NotFoundException('Return not found');
    
    const notif = await this.runTenant(tenantId, async (db) => db.returnNotification.create({ 
      data: { returnId, channel, subject: subject || null, message: message || null } 
    }));
    
    // Send actual notification based on channel
    try {
      switch (channel) {
        case 'email':
          if (ret.order?.customerEmail && subject && message) {
            await this.sendEmailNotification(ret.order.customerEmail, subject, message);
          }
          break;
        case 'sms':
          if (ret.order?.customerPhone && message) {
            await this.sendSmsNotification(ret.order.customerPhone, message);
          }
          break;
        case 'web':
          // Web notifications are stored in DB and shown in UI
          break;
        default:
          // Unknown notification channel
      }
    } catch (error) {
      // Failed to send notification
      // Don't throw - notification is best effort
    }
    
    return notif;
  }

  private async sendEmailNotification(_email: string, _subject: string, _message: string): Promise<void> {
    // Check if SMTP is configured
    if (!process.env['SMTP_HOST'] || !process.env['SMTP_USER']) {
      // SMTP not configured, skipping email notification
      return;
    }

    // Use email service if available
    // This would integrate with the email module
    // Would send email notification
  }

  private async sendSmsNotification(_phone: string, _message: string): Promise<void> {
    // Check if SMS provider is configured
    if (!process.env['SMS_API_KEY']) {
      // SMS provider not configured, skipping SMS notification
      return;
    }

    // Use SMS service if available
    // Would send SMS notification
  }
}