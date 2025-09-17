import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
// import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50, search?: string, status?: string, tag?: string, storeId?: string) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const where: Record<string, unknown> = { tenantId };
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phoneE164: { contains: search } },
      ];
    }
    
    if (status) {
      if (status === 'with_orders') {
        where.orders = { some: {} };
      } else if (status === 'no_orders') {
        where.orders = { none: {} };
      } else if (status === 'vip') {
        where.tags = { has: 'vip' };
      }
    }
    
    if (tag) {
      where.tags = { has: tag };
    }
    
    if (storeId) {
      where.storeId = storeId;
    }
    
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.customer.findMany({ 
        where, 
        orderBy: { createdAt: 'desc' }, 
        take, 
        skip,
        include: {
          orders: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
            }
          }
        }
      }),
      db.customer.count({ where }),
    ]));
    
    // Calculate order stats for each customer
    const customersWithStats = data.map((customer: Record<string, unknown>) => {
      const orders = (customer.orders as Record<string, unknown>[]) || [];
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum: number, order: Record<string, unknown>) => sum + (Number(order.total) || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;
      
      return {
        ...customer,
        orderStats: {
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate
        }
      };
    });
    
    return { data: customersWithStats, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.runTenant(tenantId, async (db) => {
      const customerData = await db.customer.findFirst({ 
        where: { id, tenantId },
        include: {
          orders: {
            select: {
              id: true,
              externalOrderNo: true,
              total: true,
              currency: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });
      
      if (!customerData) return null;
      
      // Calculate order statistics
      const orderStats = await this.runTenant(tenantId, async (db) => {
        const orders = await db.order.findMany({
          where: { customerId: id, tenantId },
          select: { total: true, createdAt: true }
        });
        
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum: number, order: Record<string, unknown>) => sum + Number(order['total'] || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const lastOrderDate = orders.length > 0 
          ? orders.sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b['createdAt'] as string).getTime() - new Date(a['createdAt'] as string).getTime())[0]?.['createdAt']
          : null;
        
        return {
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate
        };
      });
      
      return {
        ...customerData,
        orderStats
      };
    });
    
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(tenantId: string, body: CreateCustomerDto) {
    return this.runTenant(tenantId, async (db) => db.customer.create({ 
      data: { 
        tenant: {
          connect: { id: tenantId }
        },
        email: body.email || null, 
        emailNormalized: body.email ? String(body.email).toLowerCase() : null, 
        name: body.name || null, 
        phoneE164: body['phoneE164'] || null, 
        company: body['company'] || null,
        vatId: body['vatId'] || null,
        addressLine1: body['addressLine1'] || null,
        addressLine2: body['addressLine2'] || null,
        city: body['city'] || null,
        state: body['state'] || null,
        postalCode: body['postalCode'] || null,
        country: body['country'] || null,
        notes: body['notes'] || null,
        tags: body['tags'] || [],
      } 
    }));
  }

  async update(tenantId: string, id: string, body: UpdateCustomerDto) {
    const existing = await this.runTenant(tenantId, async (db) => db.customer.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Customer not found');
    return this.runTenant(tenantId, async (db) => db.customer.update({ 
      where: { id }, 
      data: { 
        email: body.email ?? existing.email, 
        emailNormalized: body.email ? String(body.email).toLowerCase() : existing.emailNormalized, 
        name: body.name ?? existing.name, 
        phoneE164: body['phoneE164'] ?? existing.phoneE164, 
        company: body['company'] ?? existing.company,
        vatId: body['vatId'] ?? existing.vatId,
        addressLine1: body['addressLine1'] ?? existing.addressLine1,
        addressLine2: body['addressLine2'] ?? existing.addressLine2,
        city: body['city'] ?? existing.city,
        state: body['state'] ?? existing.state,
        postalCode: body['postalCode'] ?? existing.postalCode,
        country: body['country'] ?? existing.country,
        notes: body['notes'] ?? existing.notes,
        tags: body['tags'] ?? existing.tags,
      } 
    }));
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.runTenant(tenantId, async (db) => db.customer.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Customer not found');
    await this.runTenant(tenantId, async (db) => db.customer.delete({ where: { id } }));
    return { message: 'Customer deleted' };
  }

  async bulkUpdate(tenantId: string, customerIds: string[], updates: Partial<UpdateCustomerDto>, _userId: string) {
    if (!customerIds || customerIds.length === 0) {
      throw new BadRequestException('No customer IDs provided');
    }

    if (customerIds.length > 100) {
      throw new BadRequestException('Cannot update more than 100 customers at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates['tags'] !== undefined) updateData.tags = updates['tags'];
      if (updates['notes'] !== undefined) updateData.notes = updates['notes'];
      if (updates['company'] !== undefined) updateData.company = updates['company'];
      if (updates['country'] !== undefined) updateData.country = updates['country'];
      
      updateData.updatedAt = new Date();

      const result = await db.customer.updateMany({
        where: {
          id: { in: customerIds },
          tenantId,
        },
        data: updateData,
      });

      return result;
    });

    return {
      message: `Successfully updated ${results.count} customers`,
      updatedCount: results.count,
      customerIds,
    };
  }

  async bulkDelete(tenantId: string, customerIds: string[], _userId: string) {
    if (!customerIds || customerIds.length === 0) {
      throw new BadRequestException('No customer IDs provided');
    }

    if (customerIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 customers at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const result = await db.customer.deleteMany({
        where: {
          id: { in: customerIds },
          tenantId,
        },
      });

      return result;
    });

    return {
      message: `Successfully deleted ${results.count} customers`,
      deletedCount: results.count,
      customerIds,
    };
  }
}

