import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  async listBatches(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.billingBatch.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take, skip }),
      db.billingBatch.count({ where: { tenantId } }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async createBatch(tenantId: string, dto: { periodFrom?: string; periodTo?: string }) {
    return this.runTenant(tenantId, async (db) => db.billingBatch.create({
      data: {
        tenantId,
        periodFrom: dto.periodFrom ? new Date(dto.periodFrom) : null,
        periodTo: dto.periodTo ? new Date(dto.periodTo) : null,
        status: 'created',
      } as any,
    }));
  }

  async addInvoices(tenantId: string, batchId: string, invoiceIds: string[]) {
    const batch = await this.runTenant(tenantId, async (db) => db.billingBatch.findFirst({ where: { id: batchId, tenantId } }));
    if (!batch) throw new NotFoundException('Batch not found');
    let total = new Prisma.Decimal(batch.total || 0);
    for (const invoiceId of invoiceIds) {
      const inv = await this.runTenant(tenantId, async (db) => db.invoice.findFirst({ where: { id: invoiceId, order: { tenantId } } }));
      if (!inv) continue;
      await this.runTenant(tenantId, async (db) => db.billingBatchItem.create({ data: { batchId, invoiceId, amount: inv.total || new Prisma.Decimal(0) } }));
      total = total.add(inv.total || new Prisma.Decimal(0));
    }
    await this.runTenant(tenantId, async (db) => db.billingBatch.update({ where: { id: batchId }, data: { total } }));
    return this.getBatch(tenantId, batchId);
  }

  async removeItem(tenantId: string, batchId: string, itemId: string) {
    const batch = await this.runTenant(tenantId, async (db) => db.billingBatch.findFirst({ where: { id: batchId, tenantId } }));
    if (!batch) throw new NotFoundException('Batch not found');
    const item = await this.runTenant(tenantId, async (db) => db.billingBatchItem.findFirst({ where: { id: itemId, batchId } }));
    if (!item) throw new NotFoundException('Item not found');
    await this.runTenant(tenantId, async (db) => db.billingBatchItem.delete({ where: { id: itemId } }));
    // Recalculate total
    const sum = await this.runTenant(tenantId, async (db) => db.billingBatchItem.aggregate({ where: { batchId }, _sum: { amount: true } }));
    await this.runTenant(tenantId, async (db) => db.billingBatch.update({ where: { id: batchId }, data: { total: sum._sum.amount || new Prisma.Decimal(0) } }));
    return this.getBatch(tenantId, batchId);
  }

  async issue(tenantId: string, batchId: string) {
    const batch = await this.runTenant(tenantId, async (db) => db.billingBatch.findFirst({ where: { id: batchId, tenantId } }));
    if (!batch) throw new NotFoundException('Batch not found');
    const updated = await this.runTenant(tenantId, async (db) => db.billingBatch.update({ where: { id: batchId }, data: { status: 'issued' } }));
    return updated;
  }

  async getBatch(tenantId: string, id: string) {
    const batch = await this.runTenant(tenantId, async (db) => db.billingBatch.findFirst({ where: { id, tenantId }, include: { items: { include: { invoice: true } } } }));
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }
}

