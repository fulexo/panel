import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string, storeId?: string, _userRole?: string) {
    try {
      // Get total orders
      const totalOrders = await this.prisma.order.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
        },
      });

      // Get total products
      const totalProducts = await this.prisma.product.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
        },
      });

      // Get total customers
      const totalCustomers = await this.prisma.customer.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
        },
      });

      // Get total revenue
      const revenueResult = await this.prisma.order.aggregate({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: {
            in: ['COMPLETED', 'SHIPPED', 'DELIVERED'],
          },
        },
        _sum: {
          total: true,
        },
      });

      const totalRevenue = revenueResult._sum.total || 0;

      // Get low stock products (stock < 10)
      const lowStockProducts = await this.prisma.product.findMany({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          stock: {
            lt: 10,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
        },
        take: 10, // Limit to 10 products
      });

      return {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalRevenue: Number(totalRevenue),
        lowStockProducts,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }
}
