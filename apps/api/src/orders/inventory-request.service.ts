import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  CreateInventoryRequestDto, 
  UpdateInventoryRequestDto, 
  ReviewInventoryRequestDto,
  InventoryRequestQueryDto,
  InventoryRequestType,
  InventoryRequestStatus
} from './dto/inventory-request.dto';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';

@Injectable()
export class InventoryRequestService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async create(tenantId: string, dto: CreateInventoryRequestDto, customerId: string) {
    // Validate store belongs to customer
    const store = await this.runTenant(tenantId, async (db) => 
      db.store.findFirst({
        where: { id: dto.storeId, customerId },
      })
    );

    if (!store) {
      throw new NotFoundException('Store not found or access denied');
    }

    // Validate product exists for stock adjustments
    if (dto.type === InventoryRequestType.STOCK_ADJUSTMENT && dto.productId) {
      const product = await this.runTenant(tenantId, async (db) => 
        db.product.findFirst({
          where: { id: dto.productId, storeId: dto.storeId, tenantId },
        })
      );

      if (!product) {
        throw new NotFoundException('Product not found');
      }
    }

    return this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          customerId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          productId: dto.productId,
          currentStock: dto.currentStock,
          requestedStock: dto.requestedStock,
          adjustmentReason: dto.adjustmentReason,
          productData: dto.productData ? toPrismaJsonValue(dto.productData) : null,
          updateData: dto.updateData ? toPrismaJsonValue(dto.updateData) : null,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stockQuantity: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    );
  }

  async findAll(tenantId: string, query: InventoryRequestQueryDto, userRole: string, userId?: string) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    // Filter by type
    if (query.type) {
      where.type = query.type;
    }

    // Filter by status
    if (query.status) {
      where.status = query.status;
    }

    // Filter by store
    if (query.storeId) {
      where.storeId = query.storeId;
    }

    // Filter by customer (for customers, only show their own requests)
    if (query.customerId) {
      where.customerId = query.customerId;
    } else if (userRole === 'CUSTOMER' && userId) {
      where.customerId = userId;
    }

    const [requests, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.inventoryRequest.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stockQuantity: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.inventoryRequest.count({ where }),
    ]));

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string, userRole: string, userId?: string) {
    const where: Record<string, unknown> = { id, tenantId };

    // For customers, only allow access to their own requests
    if (userRole === 'CUSTOMER' && userId) {
      where.customerId = userId;
    }

    const request = await this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.findFirst({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stockQuantity: true,
              price: true,
              description: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    );

    if (!request) {
      throw new NotFoundException('Inventory request not found');
    }

    return request;
  }

  async update(tenantId: string, id: string, dto: UpdateInventoryRequestDto, userRole: string, userId?: string) {
    const where: Record<string, unknown> = { id, tenantId };

    // For customers, only allow access to their own pending requests
    if (userRole === 'CUSTOMER' && userId) {
      where.customerId = userId;
      where.status = InventoryRequestStatus.PENDING;
    }

    const request = await this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.findFirst({ where })
    );

    if (!request) {
      throw new NotFoundException('Inventory request not found or access denied');
    }

    if (request.status !== InventoryRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be updated');
    }

    return this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
          ...(dto.requestedStock !== undefined && { requestedStock: dto.requestedStock }),
          ...(dto.adjustmentReason !== undefined && { adjustmentReason: dto.adjustmentReason }),
          ...(dto.productData !== undefined && { productData: toPrismaJsonValue(dto.productData) }),
          ...(dto.updateData !== undefined && { updateData: toPrismaJsonValue(dto.updateData) }),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stockQuantity: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    );
  }

  async review(tenantId: string, id: string, dto: ReviewInventoryRequestDto, adminId: string) {
    const request = await this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.findFirst({
        where: { id, tenantId },
        include: {
          product: true,
        },
      })
    );

    if (!request) {
      throw new NotFoundException('Inventory request not found');
    }

    if (request.status !== InventoryRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be reviewed');
    }

    // If approved, apply the changes
    if (dto.status === InventoryRequestStatus.APPROVED) {
      await this.applyRequest(tenantId, request);
    }

    return this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: dto.rejectionReason,
          adminNotes: dto.adminNotes,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              stockQuantity: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    );
  }

  async delete(tenantId: string, id: string, userRole: string, userId?: string) {
    const where: Record<string, unknown> = { id, tenantId };

    // For customers, only allow access to their own pending requests
    if (userRole === 'CUSTOMER' && userId) {
      where.customerId = userId;
      where.status = InventoryRequestStatus.PENDING;
    }

    const request = await this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.findFirst({ where })
    );

    if (!request) {
      throw new NotFoundException('Inventory request not found or access denied');
    }

    if (request.status !== InventoryRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be deleted');
    }

    return this.runTenant(tenantId, async (db) => 
      db.inventoryRequest.delete({ where: { id } })
    );
  }

  private async applyRequest(tenantId: string, request: any) {
    switch (request.type) {
      case InventoryRequestType.STOCK_ADJUSTMENT:
        await this.applyStockAdjustment(tenantId, request);
        break;
      case InventoryRequestType.NEW_PRODUCT:
        await this.applyNewProduct(tenantId, request);
        break;
      case InventoryRequestType.PRODUCT_UPDATE:
        await this.applyProductUpdate(tenantId, request);
        break;
    }
  }

  private async applyStockAdjustment(tenantId: string, request: any) {
    if (!request.productId || request.requestedStock === null) {
      return;
    }

    await this.runTenant(tenantId, async (db) => {
      // Update product stock
      await db.product.update({
        where: { id: request.productId },
        data: { stockQuantity: request.requestedStock },
      });

      // Create stock movement record
      await db.stockMovement.create({
        data: {
          productId: request.productId,
          type: 'ADJUSTMENT',
          quantity: request.requestedStock - (request.currentStock || 0),
          relatedId: request.id,
        },
      });
    });
  }

  private async applyNewProduct(tenantId: string, request: any) {
    if (!request.productData) {
      return;
    }

    const productData = request.productData as any;

    await this.runTenant(tenantId, async (db) => 
      db.product.create({
        data: {
          tenantId,
          storeId: request.storeId,
          name: productData.name,
          sku: productData.sku,
          price: new Decimal(productData.price),
          regularPrice: productData.regularPrice ? new Decimal(productData.regularPrice) : new Decimal(productData.price),
          description: productData.description,
          shortDescription: productData.shortDescription,
          weight: productData.weight ? new Decimal(productData.weight) : null,
          dimensions: productData.dimensions ? toPrismaJsonValue(productData.dimensions) : null,
          images: productData.images || [],
          categories: productData.categories || [],
          tags: productData.tags || [],
          stockQuantity: productData.stockQuantity || 0,
          active: true,
        },
      })
    );
  }

  private async applyProductUpdate(tenantId: string, request: any) {
    if (!request.productId || !request.updateData) {
      return;
    }

    const updateData = request.updateData as any;
    const processedData: Record<string, unknown> = {};

    // Process update data
    if (updateData.name !== undefined) processedData.name = updateData.name;
    if (updateData.sku !== undefined) processedData.sku = updateData.sku;
    if (updateData.price !== undefined) processedData.price = new Decimal(updateData.price);
    if (updateData.description !== undefined) processedData.description = updateData.description;
    if (updateData.weight !== undefined) processedData.weight = updateData.weight ? new Decimal(updateData.weight) : null;
    if (updateData.images !== undefined) processedData.images = updateData.images;
    if (updateData.categories !== undefined) processedData.categories = updateData.categories;
    if (updateData.tags !== undefined) processedData.tags = updateData.tags;
    if (updateData.stockQuantity !== undefined) processedData.stockQuantity = updateData.stockQuantity;

    await this.runTenant(tenantId, async (db) => 
      db.product.update({
        where: { id: request.productId },
        data: processedData,
      })
    );
  }

  async getStats(tenantId: string, userRole: string, userId?: string) {
    const where: Record<string, unknown> = { tenantId };

    // For customers, only show their own stats
    if (userRole === 'CUSTOMER' && userId) {
      where.customerId = userId;
    }

    const [total, pending, approved, rejected] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.inventoryRequest.count({ where }),
      db.inventoryRequest.count({ where: { ...where, status: InventoryRequestStatus.PENDING } }),
      db.inventoryRequest.count({ where: { ...where, status: InventoryRequestStatus.APPROVED } }),
      db.inventoryRequest.count({ where: { ...where, status: InventoryRequestStatus.REJECTED } }),
    ]));

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}