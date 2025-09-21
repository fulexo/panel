import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { toPrismaJson } from '../common/utils/prisma-json.util';
import { LoggerService } from '../logger/logger.service';

export interface AuditLogData {
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService
  ) {}

  async log(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: toPrismaJson(data.changes),
          metadata: toPrismaJson(data.metadata),
          userId: data.userId,
          tenantId: data.tenantId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // Silent fail for audit logging to prevent breaking the main flow
      this.logger.error('Audit logging failed', error instanceof Error ? error.stack : undefined, 'AuditService');
    }
  }

  async getAuditLogs(tenantId: string, filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: Record<string, unknown> = { tenantId };
    
    if (filters?.userId) where.userId = filters['userId'];
    if (filters?.action) where.action = filters['action'];
    if (filters?.entityType) where.entityType = filters['entityType'];
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = filters['dateFrom'];
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = filters['dateTo'];
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}