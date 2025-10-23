import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        priority: dto.priority || 'medium',
        read: dto.read || false,
        metadata: dto.metadata || {},
      },
    });
  }

  async findAll(
    tenantId: string,
    userId?: string,
    filters?: {
      type?: string;
      priority?: string;
      read?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = {
      tenantId,
      ...(userId && { userId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.read !== undefined && { read: filters.read }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: {
        total,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { id },
      data: dto,
    });
  }

  async markAsRead(tenantId: string, id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(tenantId: string, userId?: string) {
    const where: any = { tenantId, read: false };
    if (userId) {
      where.userId = userId;
    }

    return this.prisma.notification.updateMany({
      where,
      data: { read: true },
    });
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(tenantId: string, userId?: string) {
    const where: any = { tenantId, read: false };
    if (userId) {
      where.userId = userId;
    }

    return this.prisma.notification.count({ where });
  }

  async getStats(tenantId: string, userId?: string) {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }

    const [total, unread, byType, byPriority] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, read: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
      this.prisma.notification.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true },
      }),
    ]);

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
