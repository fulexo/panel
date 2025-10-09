import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { normalizeLimit, normalizePage } from '../common/utils/number.util';
import { PrismaService } from '../prisma.service';
import { CreateInventoryApprovalDto } from './dto/inventory.dto';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';

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
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getApproval(id: string) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id },
      include: {
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
      throw new NotFoundException('Inventory approval not found');
    }

    return approval;
  }

  async createApproval(createApprovalDto: CreateInventoryApprovalDto, userId: string) {
    const { productId, changeType, newValue, reason } = createApprovalDto;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        wooStore: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const approval = await this.prisma.inventoryApproval.create({
      data: {
        productId,
        changeType,
        oldValue: toPrismaJsonValue(product.stock),
        newValue: toPrismaJsonValue(newValue),
        reason,
        requestedBy: userId,
        status: 'pending',
        storeId: product.storeId,
      },
      include: {
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

  async approveChange(id: string, userId: string) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!approval) {
      throw new NotFoundException('Inventory approval not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Approval is not pending');
    }

    // Update the product with the new value
    await this.prisma.product.update({
      where: { id: approval.productId! },
      data: {
        stock: approval.changeType === 'stock' ? Number(approval.newValue) : undefined,
      },
    });

    // Update the approval status
    const updatedApproval = await this.prisma.inventoryApproval.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
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

  async rejectChange(id: string, userId: string) {
    const approval = await this.prisma.inventoryApproval.findUnique({
      where: { id },
    });

    if (!approval) {
      throw new NotFoundException('Inventory approval not found');
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException('Approval is not pending');
    }

    const updatedApproval = await this.prisma.inventoryApproval.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
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

  async getStockLevels(tenantId: string, filters: any) {
    const where: any = {
      tenantId,
    };

    if (filters.storeId) {
      where.storeId = filters.storeId;
    }

    if (filters.lowStock) {
      where.stock = {
        lte: 10,
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        wooStore: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { stock: 'asc' },
    });

    return products;
  }

  async requestStockUpdate(productId: string, newQuantity: number, userId: string, reason?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        wooStore: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const approval = await this.prisma.inventoryApproval.create({
      data: {
        productId,
        changeType: 'stock',
        oldValue: toPrismaJsonValue(product.stock),
        newValue: toPrismaJsonValue(newQuantity),
        reason,
        requestedBy: userId,
        status: 'pending',
        storeId: product.storeId,
      },
      include: {
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