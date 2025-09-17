import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  async listEvents(tenantId: string, from?: string, to?: string) {
    const where: any = { tenantId };
    if (from || to) {
      where.startAt = {};
      if (from) where.startAt.gte = new Date(from);
      if (to) where.startAt.lte = new Date(to);
    }
    const events = await this.runTenant(tenantId, async (db) => db.calendarEvent.findMany({ where, orderBy: { startAt: 'asc' } }));
    return { events };
  }

  async generateIcs(tenantId: string) {
    const events = await this.runTenant(tenantId, async (db) => db.calendarEvent.findMany({ where: { tenantId }, orderBy: { startAt: 'asc' } }));
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fulexo//Calendar//EN',
    ];
    for(const ev of events){
      const uid = ev.id;
      const dtStart = new Date(ev.startAt).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
      const dtEnd = new Date(ev.endAt).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/, 'Z');
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${ev.title}`);
      if(ev.description) lines.push(`DESCRIPTION:${ev.description}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  async createEvent(tenantId: string, dto: any) {
    const ev = await this.runTenant(tenantId, async (db) => db.calendarEvent.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'general',
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    }));
    return ev;
  }

  async updateEvent(tenantId: string, id: string, dto: any) {
    const existing = await this.runTenant(tenantId, async (db) => db.calendarEvent.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Event not found');
    return this.runTenant(tenantId, async (db) => db.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        description: dto.description ?? existing.description,
        type: dto.type ?? existing.type,
        startAt: dto.startAt ? new Date(dto.startAt) : existing.startAt,
        endAt: dto.endAt ? new Date(dto.endAt) : existing.endAt,
      },
    }));
  }

  async deleteEvent(tenantId: string, id: string) {
    const existing = await this.runTenant(tenantId, async (db) => db.calendarEvent.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Event not found');
    await this.runTenant(tenantId, async (db) => db.calendarEvent.delete({ where: { id } }));
    return { message: 'Event deleted' };
  }

  async getBusinessHours(tenantId: string) {
    const rows = await this.runTenant(tenantId, async (db) => db.businessHours.findMany({ where: { tenantId }, orderBy: { weekday: 'asc' } }));
    return { hours: rows };
  }

  async setBusinessHours(tenantId: string, dto: { hours: Array<{ weekday: number; startTime: string; endTime: string }> }) {
    const hours = dto.hours || [];
    // Upsert per weekday
    for (const h of hours) {
      await this.runTenant(tenantId, async (db) => db.businessHours.upsert({
        where: { tenantId_weekday: { tenantId, weekday: h.weekday } },
        create: { tenantId, weekday: h.weekday, startTime: h.startTime, endTime: h.endTime },
        update: { startTime: h.startTime, endTime: h.endTime },
      } as any));
    }
    return this.getBusinessHours(tenantId);
  }

  async listHolidays(tenantId: string) {
    const rows = await this.runTenant(tenantId, async (db) => db.holiday.findMany({ where: { tenantId }, orderBy: { date: 'asc' } }));
    return { holidays: rows };
  }

  async addHoliday(tenantId: string, dto: { date: string; name: string }) {
    const h = await this.runTenant(tenantId, async (db) => db.holiday.create({ data: { tenantId, date: new Date(dto.date), name: dto.name } }));
    return h;
  }

  async removeHoliday(tenantId: string, id: string) {
    const existing = await this.runTenant(tenantId, async (db) => db.holiday.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Holiday not found');
    await this.runTenant(tenantId, async (db) => db.holiday.delete({ where: { id } }));
    return { message: 'Holiday removed' };
  }

  async saveOAuth(tenantId: string, provider: string, credentialsJson: any) {
    const enc = new (require('../crypto').EncryptionService)(process.env['MASTER_KEY_HEX'] || process.env['ENCRYPTION_KEY'] || ''.padEnd(64,'0'));
    const payload = enc.encrypt(JSON.stringify(credentialsJson));
    await this.runTenant(tenantId, async (db) => db.oAuthCredential.upsert({
      where: { tenantId_provider: { tenantId, provider } } as any,
      create: { tenantId, provider, secret: payload as any },
      update: { secret: payload as any },
    } as any));
    return { ok: true };
  }
}

