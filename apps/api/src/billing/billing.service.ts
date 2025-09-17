import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
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
      },
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
    await this.runTenant(tenantId, async (db) => db.billingBatch.update({ where: { id: batchId }, data: { total: sum._sum.amount || new (Prisma as Record<string, unknown>).Decimal(0) } }));
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

  // Invoice methods
  async listInvoices(tenantId: string, query: { page?: string; limit?: string; search?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: 'insensitive' } },
        { orderId: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    
    if (query.status) {
      where.status = query['status'];
    }

    if ((query as Record<string, unknown>)['dateFilter']) {
      const now = new Date();
      let dateFrom: Date;
      
      switch ((query as Record<string, unknown>)['dateFilter']) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(0);
      }
      
      where.createdAt = { gte: dateFrom };
    }

    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.invoice.findMany({ 
        where, 
        orderBy: { createdAt: 'desc' }, 
        take: limit, 
        skip,
        include: { order: true }
      }),
      db.invoice.count({ where }),
    ]));

    return { 
      data, 
      pagination: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
      } 
    };
  }

  async createInvoice(tenantId: string, dto: Record<string, unknown>) {
    return this.runTenant(tenantId, async (db) => db.invoice.create({
      data: {
        tenantId,
        orderId: dto['orderId'],
        number: dto['number'],
        total: new (Prisma as Record<string, unknown>).Decimal(dto['total']),
        currency: dto['currency'] || 'USD',
        status: 'draft',
        dueDate: dto['dueDate'] ? new Date(dto['dueDate'] as string) : null,
      } as Record<string, unknown>,
    }));
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.invoice.findFirst({ 
        where: { id, tenantId }, 
        include: { order: true } 
      })
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateInvoice(tenantId: string, id: string, dto: Record<string, unknown>) {
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.invoice.findFirst({ where: { id, tenantId } })
    );
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.runTenant(tenantId, async (db) => db.invoice.update({
      where: { id },
      data: {
        status: dto['status'] || undefined,
        number: dto['number'] || undefined,
        total: dto['total'] ? new (Prisma as Record<string, unknown>).Decimal(dto['total']) : undefined,
        currency: dto['currency'] || undefined,
        dueDate: dto['dueDate'] ? new Date(dto['dueDate'] as string) : undefined,
        ...(dto['status'] === 'issued' && { issuedAt: new Date() }),
        ...(dto['status'] === 'paid' && { paidAt: new Date() }),
      } as Record<string, unknown>,
    }));
  }

  async deleteInvoice(tenantId: string, id: string) {
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.invoice.findFirst({ where: { id, tenantId } })
    );
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.runTenant(tenantId, async (db) => db.invoice.delete({ where: { id } }));
  }

  // Payment methods
  async listPayments(tenantId: string, query: { page?: string; limit?: string; search?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    
    if (query.search) {
      where.OR = [
        { transactionId: { contains: query.search, mode: 'insensitive' } },
        { invoice: { number: { contains: query.search, mode: 'insensitive' } } },
        { invoice: { orderId: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    
    if (query.status) {
      where.status = query.status;
    }
    
    if ((query as Record<string, unknown>).method) {
      where.method = (query as Record<string, unknown>).method;
    }

    if ((query as Record<string, unknown>).dateFilter) {
      const now = new Date();
      let dateFrom: Date;
      
      switch ((query as Record<string, unknown>).dateFilter) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(0);
      }
      
      where.createdAt = { gte: dateFrom };
    }

    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.payment.findMany({ 
        where, 
        orderBy: { createdAt: 'desc' }, 
        take: limit, 
        skip,
        include: { invoice: { include: { order: true } } }
      }),
      db.payment.count({ where }),
    ]));

    return { 
      data, 
      pagination: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
      } 
    };
  }

  async getPayment(tenantId: string, id: string) {
    const payment = await this.runTenant(tenantId, async (db) => 
      db.payment.findFirst({ 
        where: { id, tenantId }, 
        include: { invoice: { include: { order: true } } }
      })
    );
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updatePayment(tenantId: string, id: string, dto: Record<string, unknown>) {
    const payment = await this.runTenant(tenantId, async (db) => 
      db.payment.findFirst({ where: { id, tenantId } })
    );
    if (!payment) throw new NotFoundException('Payment not found');

    return this.runTenant(tenantId, async (db) => db.payment.update({
      where: { id },
      data: {
        status: dto['status'] || undefined,
        method: dto['method'] || undefined,
        transactionId: dto['transactionId'] || undefined,
        processedAt: dto['status'] === 'completed' ? new Date() : undefined,
      } as Record<string, unknown>,
    }));
  }

  async refundPayment(tenantId: string, id: string) {
    const payment = await this.runTenant(tenantId, async (db) => 
      db.payment.findFirst({ where: { id, tenantId } })
    );
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    return this.runTenant(tenantId, async (db) => db.payment.update({
      where: { id },
      data: { status: 'refunded' } as Record<string, unknown>,
    }));
  }

  async bulkUpdateBatches(tenantId: string, batchIds: string[], updates: Record<string, unknown>, _userId: string) {
    if (!batchIds || batchIds.length === 0) {
      throw new BadRequestException('No batch IDs provided');
    }

    if (batchIds.length > 100) {
      throw new BadRequestException('Cannot update more than 100 batches at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates['status'] !== undefined) updateData.status = updates['status'];
      
      updateData.updatedAt = new Date();

      const result = await db.billingBatch.updateMany({
        where: {
          id: { in: batchIds },
          tenantId,
        },
        data: updateData,
      });

      return result;
    });

    return {
      message: `Successfully updated ${results.count} billing batches`,
      updatedCount: results.count,
      batchIds,
    };
  }

  async bulkDeleteBatches(tenantId: string, batchIds: string[], _userId: string) {
    if (!batchIds || batchIds.length === 0) {
      throw new BadRequestException('No batch IDs provided');
    }

    if (batchIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 batches at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      // First, delete related batch items
      await db.billingBatchItem.deleteMany({
        where: { batchId: { in: batchIds } },
      });

      // Then delete the batches
      const result = await db.billingBatch.deleteMany({
        where: {
          id: { in: batchIds },
          tenantId,
        },
      });

      return result;
    });

    return {
      message: `Successfully deleted ${results.count} billing batches`,
      deletedCount: results.count,
      batchIds,
    };
  }
}

