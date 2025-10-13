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
        take: 3, // Limit to 3 products
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

  async getSalesReport(tenantId: string, storeId?: string, _userRole?: string) {
    try {
      // Get total sales
      const totalSalesResult = await this.prisma.order.aggregate({
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

      const totalSales = totalSalesResult._sum.total || 0;

      // Get average order value
      const avgOrderResult = await this.prisma.order.aggregate({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          status: {
            in: ['COMPLETED', 'SHIPPED', 'DELIVERED'],
          },
        },
        _avg: {
          total: true,
        },
      });

      const averageOrderValue = avgOrderResult._avg.total || 0;

      // Get conversion rate (simplified)
      const totalVisitors = await this.prisma.customer.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
        },
      });

      const totalOrders = await this.prisma.order.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
        },
      });

      const conversionRate = totalVisitors > 0 ? totalOrders / totalVisitors : 0;

      return {
        totalSales: Number(totalSales),
        averageOrderValue: Number(averageOrderValue),
        conversionRate,
      };
    } catch (error) {
      console.error('Error getting sales report:', error);
      throw new Error('Failed to fetch sales report');
    }
  }

  async getProductReport(tenantId: string, storeId?: string, _userRole?: string) {
    try {
      // Get top products by sales using OrderItem
      const topProducts = await this.prisma.orderItem.findMany({
        where: {
          order: {
            tenantId,
            ...(storeId ? { storeId } : {}),
            status: {
              in: ['COMPLETED', 'SHIPPED', 'DELIVERED'],
            },
          },
        },
        select: {
          sku: true,
          name: true,
          qty: true,
          price: true,
        },
        take: 50, // Get more items to aggregate
      });

      // Aggregate by product name
      const productSales = new Map();
      topProducts.forEach(item => {
        const key = item.name;
        if (productSales.has(key)) {
          const existing = productSales.get(key);
          existing.sales += item.qty;
          existing.revenue += Number(item.price) * item.qty;
        } else {
          productSales.set(key, {
            name: item.name,
            sales: item.qty,
            revenue: Number(item.price) * item.qty,
          });
        }
      });

      const productsWithSales = Array.from(productSales.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10)
        .map((product, index) => ({
          id: `product-${index}`,
          name: product.name,
          sales: product.sales,
          revenue: product.revenue,
        }));

      return {
        topProducts: productsWithSales,
      };
    } catch (error) {
      console.error('Error getting product report:', error);
      throw new Error('Failed to fetch product report');
    }
  }

  async getCustomerReport(tenantId: string, storeId?: string, _userRole?: string) {
    try {
      // Get new customers (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newCustomers = await this.prisma.customer.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Get returning customers (customers with more than 1 order)
      const returningCustomers = await this.prisma.customer.count({
        where: {
          tenantId,
          ...(storeId ? { storeId } : {}),
          orders: {
            some: {},
          },
        },
      });

      return {
        newCustomers,
        returningCustomers,
      };
    } catch (error) {
      console.error('Error getting customer report:', error);
      throw new Error('Failed to fetch customer report');
    }
  }
}
