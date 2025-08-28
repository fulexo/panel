import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { order: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.invoice.count({ where: { order: { tenantId } } }),
    ]);
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, order: { tenantId } } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}