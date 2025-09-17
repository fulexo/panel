import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.invoice.findMany({
        where: { order: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.invoice.count({ where: { order: { tenantId } } }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const invoice = await this.runTenant(tenantId, async (db) => db.invoice.findFirst({ where: { id, order: { tenantId } } }));
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}