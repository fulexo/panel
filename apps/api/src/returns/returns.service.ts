import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.return.findMany({
        where: { order: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.return.count({ where: { order: { tenantId } } }),
    ]);
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const entity = await this.prisma.return.findFirst({ where: { id, order: { tenantId } }, include: { photos: true, notifications: true } });
    if (!entity) throw new NotFoundException('Return not found');
    return entity;
  }

  async addPhoto(tenantId: string, returnId: string, fileUrl: string, note?: string) {
    const ret = await this.prisma.return.findFirst({ where: { id: returnId, order: { tenantId } } });
    if (!ret) throw new NotFoundException('Return not found');
    const photo = await this.prisma.returnPhoto.create({ data: { returnId, fileUrl, note } });
    return photo;
  }

  async notify(tenantId: string, returnId: string, channel: string, subject?: string, message?: string) {
    const ret = await this.prisma.return.findFirst({ where: { id: returnId, order: { tenantId } } });
    if (!ret) throw new NotFoundException('Return not found');
    const notif = await this.prisma.returnNotification.create({ data: { returnId, channel, subject, message } });
    // TODO: send actual email/SMS based on channel
    return notif;
  }
}