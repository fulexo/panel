import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto, CreateChargeDto } from './dto';
import { Prisma } from '@prisma/client';
import * as jose from 'jose';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private audit: AuditService,
  ) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  private sanitizeOrderForCustomer = (order: any) => {
    const { notes, billingAddress, tags, serviceCharges, account, ...rest } = order || {};
    return rest;
  };

  // Optimized include for orders to prevent N+1 queries
  private getOrderIncludes(role?: string) {
    const baseIncludes = {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
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
          trackingNo: true,
          status: true,
          carrier: true,
          shippedAt: true,
        },
      },
      store: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    // Add sensitive fields for admin users
    if (role === 'ADMIN' || role === 'FULEXO_ADMIN' || role === 'FULEXO_STAFF') {
      return {
        ...baseIncludes,
        serviceCharges: {
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            notes: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            currency: true,
            issuedAt: true,
            dueDate: true,
          },
        },
        returns: {
          select: {
            id: true,
            status: true,
            reason: true,
            refundAmount: true,
            createdAt: true,
          },
        },
      };
    }

    return baseIncludes;
  }

  async findAll(tenantId: string, query: OrderQueryDto, role?: string) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 500);
    const offset = (page - 1) * limit;

    // Try to get from cache
    const cacheKey = this.cache.orderListKey(tenantId, page, query);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: any = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { externalOrderNo: { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      where.confirmedAt = {};
      if (query.dateFrom) {
        where.confirmedAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.confirmedAt.lte = new Date(query.dateTo);
      }
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    // Execute query with optimized selects to avoid N+1
    const includes = this.getOrderIncludes(role);
    
    const [orders, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.order.findMany({
        where,
        include: includes,
        orderBy: { confirmedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where }),
    ]));

    const result = {
      data: (role && role !== 'ADMIN') ? orders.map(this.sanitizeOrderForCustomer) : orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    await this.cache.set(cacheKey, result, 60); // 1 minute cache

    return result;
  }

  async findOne(tenantId: string, id: string, role?: string) {
    // Try cache first - include role in cache key to prevent privilege escalation
    const cacheKey = this.cache.orderDetailKey(id, role);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: {
        id,
        tenantId,
      },
      include: this.getOrderIncludes(role),
    }) as any);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Apply role-based sanitization before caching
    const sanitizedOrder = (role && role !== 'ADMIN') ? this.sanitizeOrderForCustomer(order) : order;

    // Cache the sanitized result for 5 minutes
    await this.cache.set(cacheKey, sanitizedOrder, 300);

    return sanitizedOrder;
  }

  async create(tenantId: string, dto: CreateOrderDto, userId: string) {
    // Check if customer exists
    let customer = null;
    if (dto.customerEmail) {
      customer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          emailNormalized: dto.customerEmail.toLowerCase(),
        },
      });

      if (!customer) {
        // Create customer
        customer = await this.prisma.customer.create({
          data: {
            tenantId,
            email: dto.customerEmail,
            emailNormalized: dto.customerEmail.toLowerCase(),
            name: dto.customerName || null,
            phoneE164: dto.customerPhone || null,
          },
        });
      }
    }

    // Determine next order number for tenant
    // Atomic per-tenant order number allocation using a dedicated table with upsert
    await this.runTenant(tenantId, async (db) => db.$executeRaw`
      INSERT INTO "_OrderNoSeq" ("tenantId","value")
      VALUES (${tenantId}::uuid, 1)
      ON CONFLICT ("tenantId") DO UPDATE SET "value" = "_OrderNoSeq"."value" + 1
    `);
    
    // Fetch current value after upsert
    const current = await this.runTenant(tenantId, async (db) => db.$queryRaw`
      SELECT "value" FROM "_OrderNoSeq" WHERE "tenantId" = ${tenantId}::uuid
    `);
    const nextOrderNo = Number((current as any[])?.[0]?.value || 1);

    // Create order
    const order = await this.runTenant(tenantId, async (db) => db.order.create({
      data: {
        tenantId,
        customerId: customer?.id,
        orderNo: nextOrderNo,
        externalOrderNo: dto.externalOrderNo,
        orderSource: dto.orderSource || 'manual',
        status: dto.status || 'pending',
        total: dto.total,
        currency: dto.currency || 'TRY',
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress || {},
        billingAddress: dto.billingAddress || {},
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        tags: dto.tags || [],
        confirmedAt: dto.confirmedAt || new Date(),
        items: {
          create: dto.items?.map(item => ({
            sku: item.sku,
            name: item.name,
            qty: item.qty,
            price: item.price,
          })) || [],
        },
      },
      include: {
        items: true,
      },
    }));

    // Audit log
    await this.audit.log({
      action: 'order.created',
      userId,
      tenantId,
      entityType: 'order',
      entityId: order.id,
      metadata: { source: 'manual' },
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId);

    return order;
  }

  async update(tenantId: string, id: string, dto: UpdateOrderDto, userId: string) {
    // Check if order exists
    const existing = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: { id, tenantId },
    }));

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Update order
    const order = await this.runTenant(tenantId, async (db) => db.order.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        tags: dto.tags,
        shippingAddress: dto.shippingAddress,
        billingAddress: dto.billingAddress,
        updatedAt: new Date(),
      },
    }));

    // Audit log
    await this.audit.log({
      action: 'order.updated',
      userId,
      tenantId,
      entityType: 'order',
      entityId: order.id,
      changes: dto,
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId, id);

    return order;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: { id, tenantId },
    }));

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Soft delete by setting a flag or moving to archive
    // For now, we'll actually delete
    await this.runTenant(tenantId, async (db) => db.order.delete({
      where: { id },
    }));

    // Audit log
    await this.audit.log({
      action: 'order.deleted',
      userId,
      tenantId,
      entityType: 'order',
      entityId: id,
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId, id);

    return { message: 'Order deleted successfully' };
  }

  

  async getOrderTimeline(tenantId: string, orderId: string) {
    const order = await this.findOne(tenantId, orderId);

    // Get audit logs for this order
    const auditLogs = await this.audit.getAuditLogs({
      tenantId,
      entityType: 'order',
      entityId: orderId,
    });

    // Build timeline
    const timeline: any[] = [
      {
        type: 'created',
        date: order.createdAt,
        description: 'Order created',
      },
    ];

    // Add shipment events
    for (const shipment of order.shipments || []) {
      if (shipment.shippedAt) {
        timeline.push({
          type: 'shipped',
          date: shipment.shippedAt,
          description: `Shipped via ${shipment.carrier} (${shipment.trackingNo || ''})`,
        });
      }
      if (shipment.deliveredAt) {
        timeline.push({
          type: 'delivered',
          date: shipment.deliveredAt,
          description: 'Package delivered',
        });
      }
    }

    // Add audit events
    for (const log of auditLogs.logs as any[]) {
      timeline.push({
        type: log.action,
        date: log.createdAt,
        description: `Action: ${log.action}`,
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return timeline;
  }

  async getOrderStats(tenantId: string, query: { dateFrom?: string; dateTo?: string; storeId?: string }) {
    const where: any = {
      tenantId,
    };

    if (query.dateFrom || query.dateTo) {
      where.confirmedAt = {};
      if (query.dateFrom) {
        where.confirmedAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.confirmedAt.lte = new Date(query.dateTo);
      }
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    const [
      totalOrders,
      totalRevenue,
      statusCounts,
      ordersByDay,
    ] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.order.count({ where }),
      db.order.aggregate({ where, _sum: { total: true } }),
      db.order.groupBy({ by: ['status'], where, _count: true }),
      db.$queryRaw`
        SELECT 
          DATE("confirmedAt") as date,
          COUNT(*) as count,
          SUM("total") as revenue
        FROM "Order"
        WHERE "tenantId" = ${tenantId}::uuid
          ${query.dateFrom ? `AND "confirmedAt" >= ${new Date(query.dateFrom)}` : ''}
          ${query.dateTo ? `AND "confirmedAt" <= ${new Date(query.dateTo)}` : ''}
          ${query.storeId ? `AND "storeId" = ${query.storeId}::uuid` : ''}
          ${!query.dateFrom && !query.dateTo ? `AND "confirmedAt" >= NOW() - INTERVAL '30 days'` : ''}
        GROUP BY DATE("confirmedAt")
        ORDER BY date DESC
      `,
    ]));

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      statusBreakdown: statusCounts.map((s: any) => ({
        status: s.status,
        count: s._count,
      })),
      dailyStats: ordersByDay,
    };
  }

  async createShareLink(tenantId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true, orderNo: true } });
    if (!order) throw new NotFoundException('Order not found');
    // Create short-lived token (24h) with order reference
    const secret = new TextEncoder().encode(process.env['SHARE_TOKEN_SECRET'] || 'dev-share-secret');
    const token = await new jose.SignJWT({ orderId: order.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    await this.audit.log({ action: 'order.share.created', userId, tenantId, entityType: 'order', entityId: orderId });
    return { token, url: `${process.env['SHARE_BASE_URL'] || 'http://localhost:3001'}/order-info?token=${token}` };
  }

  async getPublicInfo(token: string) {
    const secret = new TextEncoder().encode(process.env['SHARE_TOKEN_SECRET'] || 'dev-share-secret');
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      const order = await this.prisma.order.findFirst({
        where: { id: String(payload['orderId']) },
        select: {
          id: true,
          orderNo: true,
          
          externalOrderNo: true,
          status: true,
          total: true,
          currency: true,
          confirmedAt: true,
          customerEmail: true,
          items: { select: { id: true, sku: true, name: true, qty: true, price: true } },
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      return { order };
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async listCharges(tenantId: string, orderId: string) {
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({ where: { id: orderId, tenantId } }));
    if (!order) throw new NotFoundException('Order not found');
    const charges = await this.runTenant(tenantId, async (db) => db.orderServiceCharge.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } }));
    return { orderId, charges };
  }

  async addCharge(tenantId: string, orderId: string, dto: CreateChargeDto, userId: string) {
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({ where: { id: orderId, tenantId } }));
    if (!order) throw new NotFoundException('Order not found');
    const charge = await this.runTenant(tenantId, async (db) => db.orderServiceCharge.create({
      data: {
        orderId,
        type: dto.type,
        amount: new (Prisma as any).Decimal(dto.amount),
        currency: dto.currency || order.currency || 'TRY',
        notes: dto.notes,
      },
    }));
    await this.audit.log({ action: 'order.charge.added', userId, tenantId, entityType: 'order', entityId: orderId, changes: dto });
    await this.cache.invalidateOrderCache(tenantId, orderId);
    return charge;
  }

  async removeCharge(tenantId: string, orderId: string, chargeId: string, userId: string) {
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({ where: { id: orderId, tenantId } }));
    if (!order) throw new NotFoundException('Order not found');
    const existing = await this.runTenant(tenantId, async (db) => db.orderServiceCharge.findFirst({ where: { id: chargeId, orderId } }));
    if (!existing) throw new NotFoundException('Charge not found');
    await this.runTenant(tenantId, async (db) => db.orderServiceCharge.delete({ where: { id: chargeId } }));
    await this.audit.log({ action: 'order.charge.removed', userId, tenantId, entityType: 'order', entityId: orderId, changes: { chargeId } });
    await this.cache.invalidateOrderCache(tenantId, orderId);
    return { message: 'Charge removed' };
  }

  async bulkUpdate(tenantId: string, orderIds: string[], updates: Partial<UpdateOrderDto>, userId: string) {
    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('No order IDs provided');
    }

    if (orderIds.length > 100) {
      throw new BadRequestException('Cannot update more than 100 orders at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.billingAddress !== undefined) updateData.billingAddress = updates.billingAddress;
      
      updateData.updatedAt = new Date();

      const result = await db.order.updateMany({
        where: {
          id: { in: orderIds },
          tenantId,
        },
        data: updateData,
      });

      return result;
    });

    await this.audit.log({ 
      action: 'order.bulk.updated', 
      userId, 
      tenantId, 
      entityType: 'order', 
      entityId: orderIds.join(','), 
      changes: updates 
    });

    // Invalidate cache for all affected orders
    await Promise.all(orderIds.map(orderId => this.cache.invalidateOrderCache(tenantId, orderId)));

    return {
      message: `Successfully updated ${results.count} orders`,
      updatedCount: results.count,
      orderIds,
    };
  }

  async bulkDelete(tenantId: string, orderIds: string[], userId: string) {
    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('No order IDs provided');
    }

    if (orderIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 orders at once');
    }

    const results = await this.runTenant(tenantId, async (db) => {
      // First, delete related records
      await db.orderServiceCharge.deleteMany({
        where: { orderId: { in: orderIds } },
      });

      await db.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });

      // Then delete the orders
      const result = await db.order.deleteMany({
        where: {
          id: { in: orderIds },
          tenantId,
        },
      });

      return result;
    });

    await this.audit.log({ 
      action: 'order.bulk.deleted', 
      userId, 
      tenantId, 
      entityType: 'order', 
      entityId: orderIds.join(','), 
      changes: { deletedCount: results.count } 
    });

    // Invalidate cache for all affected orders
    await Promise.all(orderIds.map(orderId => this.cache.invalidateOrderCache(tenantId, orderId)));

    return {
      message: `Successfully deleted ${results.count} orders`,
      deletedCount: results.count,
      orderIds,
    };
  }
}