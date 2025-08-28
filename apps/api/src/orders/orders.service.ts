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
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { blOrderId: { contains: query.search, mode: 'insensitive' } },
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

    // Execute query
    const [orders, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
          shipments: {
            select: {
              id: true,
              status: true,
              trackingNo: true,
            },
          },
          _count: {
            select: {
              returns: true,
              invoices: true,
            },
          },
        },
        orderBy: { confirmedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where }),
    ]));

    const result = {
      data: (role && !['FULEXO_ADMIN','FULEXO_STAFF'].includes(role)) ? orders.map(this.sanitizeOrderForCustomer) : orders,
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
    // Try cache first
    const cacheKey = this.cache.orderDetailKey(id);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        customer: true,
        items: true,
        shipments: true,
        returns: true,
        invoices: true,
        account: {
          select: {
            id: true,
            label: true,
          },
        },
        serviceCharges: true,
      },
    }) as any);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Cache for 5 minutes
    await this.cache.set(cacheKey, order, 300);

    return (role && !['FULEXO_ADMIN','FULEXO_STAFF'].includes(role)) ? this.sanitizeOrderForCustomer(order) : order;
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
            name: dto.customerName,
            phoneE164: dto.customerPhone,
          },
        });
      }
    }

    // Determine next order number for tenant
    const agg = await this.runTenant(tenantId, async (db) => db.order.aggregate({
      where: { tenantId },
      _max: { orderNo: true },
    }));
    const nextOrderNo = (agg._max.orderNo || 0) + 1;

    // Create order
    const order = await this.runTenant(tenantId, async (db) => db.order.create({
      data: {
        tenantId,
        customerId: customer?.id,
        orderNo: nextOrderNo,
        blOrderId: dto.blOrderId || `MANUAL-${Date.now()}`,
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

  async refreshFromBaseLinker(tenantId: string, orderId: string, userId: string) {
    // This would integrate with BaseLinker API
    // For now, we'll simulate it
    
    const order = await this.findOne(tenantId, orderId);
    
    // TODO: Call BaseLinker API to get fresh data
    // const blClient = new BaseLinkerClient();
    // const freshData = await blClient.getOrder(order.blOrderId);
    
    // Audit log
    await this.audit.log({
      action: 'order.refreshed',
      userId,
      tenantId,
      entityType: 'order',
      entityId: orderId,
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId, orderId);

    return { message: 'Order refreshed from BaseLinker', order };
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

  async getOrderStats(tenantId: string, query: { dateFrom?: string; dateTo?: string }) {
    const where: Prisma.OrderWhereInput = {
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
          AND "confirmedAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("confirmedAt")
        ORDER BY date DESC
      `,
    ]));

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      statusBreakdown: statusCounts.map(s => ({
        status: s.status,
        count: s._count,
      })),
      dailyStats: ordersByDay,
    };
  }

  async createShareLink(tenantId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true, blOrderId: true, orderNo: true } });
    if (!order) throw new NotFoundException('Order not found');
    // Create short-lived token (24h) with order reference
    const secret = new TextEncoder().encode(process.env.SHARE_TOKEN_SECRET || 'dev-share-secret');
    const token = await new jose.SignJWT({ orderId: order.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
    await this.audit.log({ action: 'order.share.created', userId, tenantId, entityType: 'order', entityId: orderId });
    return { token, url: `${process.env.SHARE_BASE_URL || 'http://localhost:3001'}/order-info?token=${token}` };
  }

  async getPublicInfo(token: string) {
    const secret = new TextEncoder().encode(process.env.SHARE_TOKEN_SECRET || 'dev-share-secret');
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      const order = await this.prisma.order.findFirst({
        where: { id: String(payload.orderId) },
        select: {
          id: true,
          orderNo: true,
          blOrderId: true,
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
        amount: new Prisma.Decimal(dto.amount),
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
}