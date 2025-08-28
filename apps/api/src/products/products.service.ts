import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  async list(tenantId: string, page = 1, limit = 50, search?: string) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.product.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      db.product.count({ where }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const product = await this.runTenant(tenantId, async (db) => db.product.findFirst({ where: { id, tenantId } }));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}