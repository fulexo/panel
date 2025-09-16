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
    const product = await this.runTenant(tenantId, async (db) => db.product.findFirst({ 
      where: { id, tenantId },
      include: { category: true }
    }));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantId: string, dto: any) {
    // Check if SKU already exists
    const existingProduct = await this.runTenant(tenantId, async (db) => 
      db.product.findFirst({ where: { sku: dto.sku, tenantId } })
    );
    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
    }

    return this.runTenant(tenantId, async (db) => db.product.create({
      data: {
        tenantId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        price: dto.price ? new Prisma.Decimal(dto.price) : null,
        stock: dto.stock ? parseInt(dto.stock) : null,
        weight: dto.weight ? new Prisma.Decimal(dto.weight) : null,
        dimensions: dto.dimensions,
        images: dto.images || [],
        tags: dto.tags || [],
        active: dto.active !== undefined ? dto.active : true,
        categoryId: dto.categoryId,
      } as any,
    }));
  }

  async update(tenantId: string, id: string, dto: any) {
    const product = await this.runTenant(tenantId, async (db) => 
      db.product.findFirst({ where: { id, tenantId } })
    );
    if (!product) throw new NotFoundException('Product not found');

    // Check if SKU already exists (if changing SKU)
    if (dto.sku && dto.sku !== product.sku) {
      const existingProduct = await this.runTenant(tenantId, async (db) => 
        db.product.findFirst({ where: { sku: dto.sku, tenantId, id: { not: id } } })
      );
      if (existingProduct) {
        throw new Error('Product with this SKU already exists');
      }
    }

    return this.runTenant(tenantId, async (db) => db.product.update({
      where: { id },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price ? new Prisma.Decimal(dto.price) : null }),
        ...(dto.stock !== undefined && { stock: dto.stock ? parseInt(dto.stock) : null }),
        ...(dto.weight !== undefined && { weight: dto.weight ? new Prisma.Decimal(dto.weight) : null }),
        ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      } as any,
    }));
  }

  async delete(tenantId: string, id: string) {
    const product = await this.runTenant(tenantId, async (db) => 
      db.product.findFirst({ where: { id, tenantId } })
    );
    if (!product) throw new NotFoundException('Product not found');

    return this.runTenant(tenantId, async (db) => db.product.delete({
      where: { id }
    }));
  }
}