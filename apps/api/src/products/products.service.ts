import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';
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
      where['OR'] = [
        { sku: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (status) {
      where['active'] = status === 'active';
    }
    
    if (category) {
      where['category'] = { slug: category };
    }
    
    if (storeId) {
      where['storeId'] = storeId;
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

    return this.runTenant(tenantId, async (db) => {
      // Create the main product
      const product = await db.product.create({
        data: {
          tenant: {
            connect: { id: tenantId }
          },
          store: { connect: { id: dto.storeId } },
          sku: dto.sku,
          name: dto.name || '',
          description: dto.description,
          price: dto.price !== undefined && dto.price !== null ? new Decimal(dto.price) : new Decimal(0),
          regularPrice: dto.regularPrice !== undefined && dto.regularPrice !== null ? new Decimal(dto.regularPrice) : new Decimal(0),
          stock: dto.stock !== undefined && dto.stock !== null ? parseInt(dto.stock) : null,
          weight: dto.weight !== undefined && dto.weight !== null ? new Decimal(dto.weight) : null,
          dimensions: dto.dimensions ? toPrismaJsonValue(dto.dimensions) : undefined,
          images: dto.images || [],
          tags: dto.tags || [],
          active: dto.active !== undefined ? dto.active : true,
          // Bundle product fields
          productType: dto.productType || 'simple',
          isBundle: dto.isBundle || false,
          bundleItems: dto.bundleItems ? toPrismaJsonValue(dto.bundleItems) : undefined,
          bundlePricing: dto.bundlePricing || 'fixed',
          bundleDiscount: dto.bundleDiscount !== undefined && dto.bundleDiscount !== null ? new Decimal(dto.bundleDiscount) : null,
          minBundleItems: dto.minBundleItems,
          maxBundleItems: dto.maxBundleItems,
          bundleStock: dto.bundleStock || 'parent',
        },
      });

      // If this is a bundle product, create bundle relationships
      if (dto.isBundle && dto.bundleItems && dto.bundleItems.length > 0) {
        await this.createBundleItems(tenantId, product.id, dto.bundleItems);
      }

      return product;
    });
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

    return this.runTenant(tenantId, async (db) => {
      // Update the main product
      const updatedProduct = await db.product.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined && { sku: dto.sku }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.price !== undefined && { price: dto.price !== null ? new Decimal(dto.price) : null }),
          ...(dto.stock !== undefined && { stock: dto.stock !== null ? parseInt(dto.stock) : null }),
          ...(dto.weight !== undefined && { weight: dto.weight !== null ? new Decimal(dto.weight) : null }),
          ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
          ...(dto.images !== undefined && { images: dto.images }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          ...(dto.active !== undefined && { active: dto.active }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          // Bundle product fields
          ...(dto.productType !== undefined && { productType: dto.productType }),
          ...(dto.isBundle !== undefined && { isBundle: dto.isBundle }),
          ...(dto.bundleItems !== undefined && { bundleItems: dto.bundleItems ? toPrismaJsonValue(dto.bundleItems) : undefined }),
          ...(dto.bundlePricing !== undefined && { bundlePricing: dto.bundlePricing }),
          ...(dto.bundleDiscount !== undefined && { bundleDiscount: dto.bundleDiscount !== null ? new Decimal(dto.bundleDiscount) : null }),
          ...(dto.minBundleItems !== undefined && { minBundleItems: dto.minBundleItems }),
          ...(dto.maxBundleItems !== undefined && { maxBundleItems: dto.maxBundleItems }),
          ...(dto.bundleStock !== undefined && { bundleStock: dto.bundleStock }),
        } as Record<string, unknown>,
      });

      // If bundle items are being updated, recreate them
      if (dto.bundleItems !== undefined) {
        // Delete existing bundle items
        await db.bundleProduct.deleteMany({
          where: { bundleId: id, tenantId }
        });

        // Create new bundle items if provided
        if (dto.bundleItems && dto.bundleItems.length > 0) {
          await this.createBundleItems(tenantId, id, dto.bundleItems);
        }
      }

      return updatedProduct;
    });
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
      const updateData: Record<string, unknown> = {};
      
      if (updates.active !== undefined) updateData.active = updates.active;
      if (updates.stock !== undefined) updateData.stock = updates.stock !== null ? parseInt(updates.stock) : null;
      if (updates.price !== undefined) updateData.price = updates.price !== null ? new Decimal(updates.price) : null;
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

  // Bundle product helper methods
  private async createBundleItems(tenantId: string, bundleId: string, bundleItems: any[]) {
    return this.runTenant(tenantId, async (db) => {
      const bundleItemData = bundleItems.map((item, index) => ({
        tenantId,
        bundleId,
        productId: item.productId,
        quantity: item.quantity || 1,
        isOptional: item.isOptional || false,
        minQuantity: item.minQuantity,
        maxQuantity: item.maxQuantity,
        discount: item.discount !== undefined && item.discount !== null ? new Decimal(item.discount) : null,
        sortOrder: item.sortOrder !== undefined ? item.sortOrder : index,
      }));

      return db.bundleProduct.createMany({
        data: bundleItemData,
      });
    });
  }

  async getBundleItems(tenantId: string, bundleId: string) {
    return this.runTenant(tenantId, async (db) => 
      db.bundleProduct.findMany({
        where: { bundleId, tenantId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              regularPrice: true,
              salePrice: true,
              stockQuantity: true,
              stockStatus: true,
              images: true,
            }
          }
        },
        orderBy: { sortOrder: 'asc' }
      })
    );
  }

  async addBundleItem(tenantId: string, bundleId: string, productId: string, quantity: number = 1, isOptional: boolean = false) {
    return this.runTenant(tenantId, async (db) => {
      // Check if bundle exists
      const bundle = await db.product.findFirst({
        where: { id: bundleId, tenantId, isBundle: true }
      });
      if (!bundle) {
        throw new NotFoundException('Bundle product not found');
      }

      // Check if product exists
      const product = await db.product.findFirst({
        where: { id: productId, tenantId }
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Check if item already exists in bundle
      const existingItem = await db.bundleProduct.findFirst({
        where: { bundleId, productId, tenantId }
      });
      if (existingItem) {
        throw new BadRequestException('Product already exists in bundle');
      }

      return db.bundleProduct.create({
        data: {
          tenantId,
          bundleId,
          productId,
          quantity,
          isOptional,
        }
      });
    });
  }

  async removeBundleItem(tenantId: string, bundleId: string, productId: string) {
    return this.runTenant(tenantId, async (db) => {
      const result = await db.bundleProduct.deleteMany({
        where: { bundleId, productId, tenantId }
      });

      if (result.count === 0) {
        throw new NotFoundException('Bundle item not found');
      }

      return { success: true };
    });
  }

  async updateBundleItem(tenantId: string, bundleId: string, productId: string, updates: {
    quantity?: number;
    isOptional?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    discount?: number;
    sortOrder?: number;
  }) {
    return this.runTenant(tenantId, async (db) => {
      const updateData: any = {};
      
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.isOptional !== undefined) updateData.isOptional = updates.isOptional;
      if (updates.minQuantity !== undefined) updateData.minQuantity = updates.minQuantity;
      if (updates.maxQuantity !== undefined) updateData.maxQuantity = updates.maxQuantity;
      if (updates.discount !== undefined) updateData.discount = updates.discount !== null ? new Decimal(updates.discount) : null;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

      const result = await db.bundleProduct.updateMany({
        where: { bundleId, productId, tenantId },
        data: updateData
      });

      if (result.count === 0) {
        throw new NotFoundException('Bundle item not found');
      }

      return { success: true };
    });
  }

  async calculateBundlePrice(tenantId: string, bundleId: string, selectedItems?: { productId: string; quantity: number }[]) {
    return this.runTenant(tenantId, async (db) => {
      const bundle = await db.product.findFirst({
        where: { id: bundleId, tenantId, isBundle: true }
      });
      if (!bundle) {
        throw new NotFoundException('Bundle product not found');
      }

      const bundleItems = await db.bundleProduct.findMany({
        where: { bundleId, tenantId },
        include: {
          product: {
            select: {
              id: true,
              price: true,
              regularPrice: true,
              salePrice: true,
            }
          }
        }
      });

      let totalPrice = 0;
      let items: any[] = [];

      for (const item of bundleItems) {
        const quantity = selectedItems?.find(si => si.productId === item.productId)?.quantity || item.quantity;
        const itemPrice = item.product.salePrice || item.product.price;
        const discountedPrice = item.discount ? 
          itemPrice * (1 - item.discount.toNumber() / 100) : 
          itemPrice;
        
        const itemTotal = discountedPrice * quantity;
        totalPrice += itemTotal;

        items.push({
          productId: item.productId,
          quantity,
          unitPrice: itemPrice,
          discount: item.discount?.toNumber() || 0,
          discountedPrice,
          total: itemTotal,
          isOptional: item.isOptional
        });
      }

      // Apply bundle discount if configured
      if (bundle.bundleDiscount) {
        totalPrice = totalPrice * (1 - bundle.bundleDiscount.toNumber() / 100);
      }

      return {
        bundleId,
        bundlePricing: bundle.bundlePricing,
        bundleDiscount: bundle.bundleDiscount?.toNumber() || 0,
        items,
        totalPrice: totalPrice,
        originalPrice: bundle.price.toNumber()
      };
    });
  }
}