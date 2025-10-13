import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class QueryOptimizationService {
  constructor(private readonly prisma: PrismaService) {}

  // Optimized order queries with all related data
  async getOrdersWithDetails(tenantId: string, options: {
    skip?: number;
    take?: number;
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  } = {}) {
    return this.prisma.forTenant(tenantId).order.findMany({
      ...options,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        items: {
          select: {
            id: true,
            sku: true,
            name: true,
            qty: true,
            price: true,
          },
        },
        shipments: {
          select: {
            id: true,
            carrier: true,
            trackingNo: true,
            status: true,
            shippedAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            issuedAt: true,
          },
        },
        _count: {
          select: {
            items: true,
            shipments: true,
            invoices: true,
          },
        },
      },
    });
  }

  // Optimized customer queries with order statistics
  async getCustomersWithStats(tenantId: string, options: {
    skip?: number;
    take?: number;
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  } = {}) {
    return this.prisma.forTenant(tenantId).customer.findMany({
      ...options,
      include: {
        Store: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Only get last 5 orders
        },
      },
    });
  }

  // Optimized product queries with stock information
  async getProductsWithStock(tenantId: string, options: {
    skip?: number;
    take?: number;
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
  } = {}) {
    return this.prisma.forTenant(tenantId).product.findMany({
      ...options,
      include: {
        wooStore: {
          select: {
            id: true,
            name: true,
          },
        },
        stockMovements: {
          select: {
            id: true,
            type: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Only get last 10 stock movements
        },
        _count: {
          select: {
            stockMovements: true,
          },
        },
      },
    });
  }

  // Optimized dashboard statistics
  async getDashboardStats(tenantId: string) {
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue,
      recentOrders,
      topProducts,
      orderStatusCounts,
    ] = await Promise.all([
      // Total orders count
      this.prisma.forTenant(tenantId).order.count(),
      
      // Total customers count
      this.prisma.forTenant(tenantId).customer.count(),
      
      // Total products count
      this.prisma.forTenant(tenantId).product.count({
        where: { active: true },
      }),
      
      // Total revenue
      this.prisma.forTenant(tenantId).order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: {
            in: ['completed', 'shipped', 'delivered'],
          },
        },
      }),
      
      // Recent orders
      this.prisma.forTenant(tenantId).order.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          total: true,
          customerEmail: true,
          createdAt: true,
        },
      }),
      
      // Top products by order count
      this.prisma.forTenant(tenantId).orderItem.groupBy({
        by: ['sku'],
        _count: {
          sku: true,
        },
        _sum: {
          qty: true,
        },
        orderBy: {
          _count: {
            sku: 'desc',
          },
        },
        take: 10,
      }),
      
      // Order status counts
      this.prisma.forTenant(tenantId).order.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    return {
      totalOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: totalRevenue._sum.total || 0,
      recentOrders,
      topProducts,
      orderStatusCounts,
    };
  }

  // Optimized sync status queries
  async getSyncStatus(tenantId: string) {
    const [stores, syncStates] = await Promise.all([
      this.prisma.forTenant(tenantId).wooStore.findMany({
        select: {
          id: true,
          name: true,
          active: true,
          lastSync: true,
        },
      }),
      this.prisma.syncState.findMany({
        where: {
          accountId: tenantId,
        },
        select: {
          entityType: true,
          lastSyncAt: true,
          status: true,
          error: true,
        },
      }),
    ]);

    return {
      stores,
      syncStates,
    };
  }

  // Batch operations to prevent N+1 queries
  async batchUpdateOrders(tenantId: string, updates: Array<{
    id: string;
    data: Record<string, unknown>;
  }>) {
    const results = [];
    
    for (const update of updates) {
      const result = await this.prisma.forTenant(tenantId).order.update({
        where: { id: update.id },
        data: update.data,
      });
      results.push(result);
    }
    
    return results;
  }

  // Optimized search with pagination
  async searchOrders(tenantId: string, searchTerm: string, options: {
    skip?: number;
    take?: number;
  } = {}) {
    const where = {
      OR: [
        { orderNo: { contains: searchTerm } },
        { externalOrderNo: { contains: searchTerm } },
        { customerEmail: { contains: searchTerm } },
        { customerPhone: { contains: searchTerm } },
        { notes: { contains: searchTerm } },
      ],
    } as Record<string, unknown>;

    const [orders, total] = await Promise.all([
      this.prisma.forTenant(tenantId).order.findMany({
        where,
        ...options,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              sku: true,
              name: true,
              qty: true,
              price: true,
            },
          },
        },
      }),
      this.prisma.forTenant(tenantId).order.count({ where }),
    ]);

    return {
      orders,
      total,
      hasMore: (options.skip || 0) + (options.take || 10) < total,
    };
  }
}
