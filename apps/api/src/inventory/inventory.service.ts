import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { normalizeLimit, normalizePage } from '../common/utils/number.util';
import { PrismaService } from '../prisma.service';
import { CreateInventoryApprovalDto } from './dto/inventory.dto';
import { User } from '../users/entities/user.entity';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getApprovals({ page, limit, status, storeId }: {
    page: number;
    limit: number;
    status?: string;
    storeId?: string;
  }) {
    const safePage = normalizePage(page, 1);
    const safeLimit = normalizeLimit(limit, 10, 200);
    const skip = (safePage - 1) * safeLimit;
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    const [approvals, total] = await Promise.all([
      this.prisma.inventoryApproval.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              customer: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryApproval.count({ where }),
    ]);

    return {
      data: approvals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createApproval(createApprovalDto: CreateInventoryApprovalDto, userId: string) {
    // Verify the user has access to the store
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stores: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: createApprovalDto.storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check if user has access to this store
    if (user.role === 'CUSTOMER' && !user.stores.some(s => s.id === createApprovalDto.storeId)) {
      throw new ForbiddenException('You do not have access to this store');
    }

    // Get current product data for old value
    let oldValue = null;
    if (createApprovalDto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: createApprovalDto.productId },
        select: {
          stockQuantity: true,
          price: true,
          status: true,
        },
      });
      oldValue = product;
    }

    const approval = await this.prisma.inventoryApproval.create({
      data: {
        storeId: createApprovalDto.storeId,
        productId: createApprovalDto.productId,
        changeType: createApprovalDto.changeType,
        oldValue: oldValue ? toPrismaJsonValue(oldValue) : Prisma.JsonNull,
        newValue: toPrismaJsonValue(createApprovalDto.newValue),
        requestedBy: userId,
        status: 'pending',
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return approval;
  }

  async approveChange(approvalId: string, adminId: string) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id: approvalId },
      include: {
        product: true,
        store: true,
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Approval is not pending');
    }

    // Apply the change based on change type
    const updateData: Record<string, unknown> = {};
    
    const newValue = approval.newValue as Record<string, unknown>;
    switch (approval.changeType) {
      case 'stock_update':
        updateData.stockQuantity = newValue?.stockQuantity;
        break;
      case 'price_update':
        updateData.price = newValue?.price;
        if (newValue?.salePrice !== undefined) {
          updateData.salePrice = newValue.salePrice;
        }
        break;
      case 'status_update':
        updateData.status = newValue?.status;
        break;
      default:
        throw new BadRequestException('Invalid change type');
    }

    // Update the product
    if (approval.productId) {
      await this.prisma.product.update({
        where: { id: approval.productId },
        data: updateData,
      });
    }

    // Update the approval status
    const updatedApproval = await this.prisma.inventoryApproval.update({
      where: { id: approvalId },
      data: {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    // TODO: Sync changes to WooCommerce
    // await this.syncToWooCommerce(approval.store, approval.product, updateData);

    return updatedApproval;
  }

  async rejectChange(approvalId: string, adminId: string, reason: string) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Approval is not pending');
    }

    const updatedApproval = await this.prisma.inventoryApproval.update({
      where: { id: approvalId },
      data: {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reason,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return updatedApproval;
  }

  async getApproval(approvalId: string, user: User) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id: approvalId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            customer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    // Check if user has access to this approval
    if (user.role === 'CUSTOMER' && approval.store.customer?.id !== user.id) {
      throw new ForbiddenException('You do not have access to this approval');
    }

    return approval;
  }

  async getStockLevels({ page, limit, storeId, lowStock }: {
    page: number;
    limit: number;
    storeId?: string;
    lowStock?: boolean;
  }) {
    const safePage = normalizePage(page, 1);
    const safeLimit = normalizeLimit(limit, 25, 200);
    const skip = (safePage - 1) * safeLimit;
    const where: Record<string, unknown> = {};

    if (storeId) {
      where.storeId = storeId;
    }

    if (lowStock) {
      where.stockQuantity = {
        lte: 10, // Consider low stock if 10 or fewer items
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async requestStockUpdate(productId: string, newQuantity: number, userId: string, reason?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify user has access to this product's store
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { stores: true },
    });

    if (!user || (user.role === 'CUSTOMER' && !user.stores.some(s => s.id === product.storeId))) {
      throw new ForbiddenException('You do not have access to this product');
    }

    // Create approval request
    const approval = await this.prisma.inventoryApproval.create({
      data: {
        storeId: product.storeId,
        productId: productId,
        changeType: 'stock_update',
        oldValue: { stockQuantity: product.stockQuantity },
        newValue: { stockQuantity: newQuantity },
        requestedBy: userId,
        status: 'pending',
        reason,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    return approval;
  }

}