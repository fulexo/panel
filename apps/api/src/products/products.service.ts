import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
// import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50, search?: string, status?: string, category?: string, storeId?: string) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const where: Record<string, unknown> = { tenantId };
    
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where.active = status === 'active';
    }
    
    if (category) {
      where.category = { slug: category };
    }
    
    if (storeId) {
      where.storeId = storeId;
    }
    
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.product.findMany({ 
        where, 
        orderBy: { createdAt: 'desc' }, 
        take, 
        skip,
        // include: { category: true }
      }),
      db.product.count({ where }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const product = await this.runTenant(tenantId, async (db) => db.product.findFirst({ 
      where: { id, tenantId },
        // include: { category: true }
    }));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(tenantId: string, dto: CreateProductDto) {
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
        price: dto.price !== undefined && dto.price !== null ? new (Prisma as any).Decimal(dto.price) : null,
        stock: dto.stock !== undefined && dto.stock !== null ? parseInt(dto.stock) : null,
        weight: dto.weight !== undefined && dto.weight !== null ? new (Prisma as any).Decimal(dto.weight) : null,
        dimensions: dto.dimensions,
        images: dto.images || [],
        tags: dto.tags || [],
        active: dto.active !== undefined ? dto.active : true,
        categoryId: dto.categoryId,
      } as any,
    }));
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
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
        ...(dto.price !== undefined && { price: dto.price !== null ? new (Prisma as any).Decimal(dto.price) : null }),
        ...(dto.stock !== undefined && { stock: dto.stock !== null ? parseInt(dto.stock) : null }),
        ...(dto.weight !== undefined && { weight: dto.weight !== null ? new (Prisma as any).Decimal(dto.weight) : null }),
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

  async bulkUpdate(tenantId: string, productIds: string[], updates: Partial<UpdateProductDto>, _userId: string) {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('No product IDs provided');
    }

    if (productIds.length > 100) {
      throw new BadRequestException('Cannot update more than 100 products at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const updateData: any = {};
      
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.stock !== undefined) updateData.stock = updates.stock !== null ? parseInt(updates.stock) : null;
      if (updates.price !== undefined) updateData.price = updates.price !== null ? new (Prisma as any).Decimal(updates.price) : null;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      
      updateData.updatedAt = new Date();

      const result = await db.product.updateMany({
        where: {
          id: { in: productIds },
          tenantId,
        },
        data: updateData,
      });

      return result;
    });

    return {
      message: `Successfully updated ${results.count} products`,
      updatedCount: results.count,
      productIds,
    };
  }

  async bulkDelete(tenantId: string, productIds: string[], _userId: string) {
    if (!productIds || productIds.length === 0) {
      throw new BadRequestException('No product IDs provided');
    }

    if (productIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 products at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const result = await db.product.deleteMany({
        where: {
          id: { in: productIds },
          tenantId,
        },
      });

      return result;
    });

    return {
      message: `Successfully deleted ${results.count} products`,
      deletedCount: results.count,
      productIds,
    };
  }
}