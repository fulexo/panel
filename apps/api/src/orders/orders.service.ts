import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { ApproveOrderDto, RejectOrderDto } from './dto/approve-order.dto';
// import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import * as jose from 'jose';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private audit: AuditService,
  ) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  private sanitizeOrderForCustomer = (order: Record<string, unknown>) => {
    const { notes: _notes, billingAddress: _billingAddress, tags: _tags, serviceCharges: _serviceCharges, account: _account, ...rest } = order || {};
    // Suppress unused variable warnings for destructured variables that are intentionally removed
    void _notes;
    void _billingAddress;
    void _tags;
    void _serviceCharges;
    void _account;
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
    if (role === 'ADMIN') {
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
    const cacheKey = this.cache.orderListKey(tenantId, page, query as Record<string, unknown>);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (query.status) {
      where.status = query['status'];
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
        (where.confirmedAt as Record<string, unknown>).gte = new Date(query['dateFrom']);
      }
      if (query.dateTo) {
        (where.confirmedAt as Record<string, unknown>).lte = new Date(query['dateTo']);
      }
    }

    if (query.storeId) {
      where.storeId = query['storeId'];
    }

    if (query.customerId) {
      where.customerId = query['customerId'];
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
    }));

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Apply role-based sanitization before caching
    const sanitizedOrder = (role && role !== 'ADMIN') ? this.sanitizeOrderForCustomer(order) : order;

    // Cache the sanitized result for 5 minutes
    await this.cache.set(cacheKey, sanitizedOrder, 300);

    return sanitizedOrder;
  }

  async createCustomerOrder(tenantId: string, dto: CreateCustomerOrderDto, userId: string) {
    // Validate that all products exist and are available
    const productIds = dto.items.map(item => item.productId);
    const products = await this.runTenant(tenantId, async (db) => 
      db.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          storeId: dto.storeId,
          active: true,
        },
      })
    );

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    // Check stock availability
    for (const item of dto.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stockQuantity !== null && product.stockQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.name}`);
      }
    }

    // Calculate total
    const total = dto.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = item.price || (product ? Number(product.price) : 0);
      return sum + (price * item.quantity);
    }, 0);

    // Create or find customer
    let customer = await this.runTenant(tenantId, async (db) => 
      db.customer.findFirst({
        where: {
          tenantId,
          emailNormalized: dto.customerEmail.toLowerCase(),
        },
      })
    );

    if (!customer) {
      customer = await this.runTenant(tenantId, async (db) => 
        db.customer.create({
          data: {
            tenantId,
            storeId: dto.storeId,
            email: dto.customerEmail,
            emailNormalized: dto.customerEmail.toLowerCase(),
            name: dto.customerName,
            phoneE164: dto.customerPhone,
          },
        })
      );
    }

    // Get next order number
    await this.runTenant(tenantId, async (db) => db.$executeRaw`
      INSERT INTO "_OrderNoSeq" ("tenantId","value")
      VALUES (${tenantId}::uuid, 1)
      ON CONFLICT ("tenantId") DO UPDATE SET "value" = "_OrderNoSeq"."value" + 1
    `);
    
    const current = await this.runTenant(tenantId, async (db) => db.$queryRaw`
      SELECT "value" FROM "_OrderNoSeq" WHERE "tenantId" = ${tenantId}::uuid
    `);
    const nextOrderNo = Number((current as Record<string, unknown>[])?.[0]?.value || 1);

    // Create order with pending approval status
    const order = await this.runTenant(tenantId, async (db) => db.order.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        customerId: customer.id,
        orderNo: nextOrderNo,
        orderSource: 'customer',
        status: 'pending_approval',
        approvalStatus: 'pending',
        total: new Decimal(total),
        currency: 'TRY',
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: toPrismaJsonValue(dto.shippingAddress),
        billingAddress: toPrismaJsonValue(dto.billingAddress),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        metaData: toPrismaJsonValue(dto.metaData || {}),
        createdBy: userId,
        confirmedAt: new Date(),
        items: {
          create: dto.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
              sku: product?.sku || '',
              name: product?.name || '',
              qty: item.quantity,
              price: item.price || (product ? Number(product.price) : 0),
            };
          }),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    }));

    // Audit log
    await this.audit.log({
      action: 'order.customer.created',
      userId,
      tenantId,
      entityType: 'order',
      entityId: order.id,
      metadata: { source: 'customer', total, itemCount: dto.items.length },
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId);

    return order;
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
            storeId: dto.storeId || 'default-store',
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
    const nextOrderNo = Number((current as Record<string, unknown>[])?.[0]?.value || 1);

    // Create order
    const order = await this.runTenant(tenantId, async (db) => db.order.create({
      data: {
        tenantId,
        storeId: dto.storeId || 'default-store',
        customerId: customer?.id || null,
        orderNo: nextOrderNo,
        externalOrderNo: dto.externalOrderNo,
        orderSource: dto.orderSource || 'manual',
        status: dto.status || 'pending',
        total: dto.total || 0,
        currency: dto.currency || 'TRY',
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        shippingAddress: toPrismaJsonValue(dto.shippingAddress || {}),
        billingAddress: toPrismaJsonValue(dto.billingAddress || {}),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        tags: dto.tags || [],
        confirmedAt: dto.confirmedAt || new Date(),
        items: {
          create: dto.items?.map((item: Record<string, unknown>) => ({
            sku: item.sku as string,
            name: item.name as string,
            qty: item.qty as number,
            price: item.price as number,
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
        status: dto.status || undefined,
        notes: dto.notes || undefined,
        tags: dto.tags || undefined,
        shippingAddress: dto.shippingAddress ? toPrismaJsonValue(dto.shippingAddress) : undefined,
        billingAddress: dto.billingAddress ? toPrismaJsonValue(dto.billingAddress) : undefined,
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
      changes: dto as Record<string, unknown>,
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
    // const auditLogs = await this.audit.getAuditLogs({ tenantId, entityType: 'order', entityId: orderId });

    // Build timeline
    const timeline: Record<string, unknown>[] = [
      {
        type: 'created',
        date: (order as Record<string, unknown>).createdAt as Date,
        description: 'Order created',
      },
    ];

    // Add shipment events
    for (const shipment of ((order as Record<string, unknown>).shipments as Record<string, unknown>[]) || []) {
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
    // for (const log of auditLogs.logs as Record<string, unknown>[]) {
    //   timeline.push({
    //     type: log.action,
    //     date: log.createdAt,
    //     description: `Action: ${log.action}`,
    //   });
    // }

    // Sort by date
    timeline.sort((a, b) => new Date(b['date'] as string).getTime() - new Date(a['date'] as string).getTime());

    return timeline;
  }

  async getOrderStats(tenantId: string, query: { dateFrom?: string; dateTo?: string; storeId?: string }) {
    const where: Record<string, unknown> = {
      tenantId,
    };

    if (query.dateFrom || query.dateTo) {
      where.confirmedAt = {};
      if (query.dateFrom) {
        (where as Record<string, unknown>).confirmedAt = { gte: new Date(query.dateFrom) };
      }
      if (query.dateTo) {
        (where as Record<string, unknown>).confirmedAt = { ...((where as Record<string, unknown>).confirmedAt as Record<string, unknown>), lte: new Date(query.dateTo) };
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
      // Use Prisma's safe aggregation instead of raw SQL
      db.order.findMany({
        where: {
          ...where,
          confirmedAt: {
            gte: query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            lte: query.dateTo ? new Date(query.dateTo) : undefined,
          },
        },
        select: {
          confirmedAt: true,
          total: true,
        },
        orderBy: { confirmedAt: 'desc' },
        take: 30,
      }).then(orders => {
        // Group by date
        const grouped = orders.reduce((acc, order) => {
          const date = order.confirmedAt?.toISOString().split('T')[0] || 'unknown';
          if (!acc[date]) {
            acc[date] = { count: 0, revenue: 0 };
          }
          acc[date].count++;
          acc[date].revenue += Number(order.total || 0);
          return acc;
        }, {} as Record<string, { count: number; revenue: number }>);
        
        return Object.entries(grouped).map(([date, data]) => ({
          date,
          count: data.count,
          revenue: data.revenue,
        }));
      }),
    ]));

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      statusBreakdown: statusCounts.map((s: Record<string, unknown>) => ({
        status: s['status'],
        count: s['_count'],
      })),
      dailyStats: ordersByDay,
    };
  }

  async createShareLink(tenantId: string, orderId: string, userId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId }, select: { id: true, orderNo: true } });
      if (!order) throw new NotFoundException('Order not found');
    
    // Validate SHARE_TOKEN_SECRET is set and strong
    const shareSecret = process.env['SHARE_TOKEN_SECRET'];
    if (!shareSecret || shareSecret === 'dev-share-secret') {
      throw new Error('SHARE_TOKEN_SECRET must be set with a strong secret for production');
    }
    
    if (shareSecret.length < 32) {
      throw new Error('SHARE_TOKEN_SECRET must be at least 32 characters long');
    }
    
    // Create short-lived token (24h) with order reference
    const secret = new TextEncoder().encode(shareSecret);
    const token = await new jose.SignJWT({ orderId: order.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
      await this.audit.log({ action: 'order.share.created', userId, tenantId, entityType: 'order', entityId: orderId });
      return { token, url: `${process.env['SHARE_BASE_URL'] || 'http://localhost:3001'}/order-info?token=${token}` };
    });
  }

  async getPublicInfo(token: string) {
    const shareSecret = process.env['SHARE_TOKEN_SECRET'];
    if (!shareSecret || shareSecret === 'dev-share-secret') {
      throw new Error('SHARE_TOKEN_SECRET must be set with a strong secret');
    }
    
    const secret = new TextEncoder().encode(shareSecret);
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      const orderId = String(payload['orderId']);
      
      // Find the order first to get tenantId
      const orderWithTenant = await this.prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, tenantId: true }
      });
      
      if (!orderWithTenant) {
        throw new NotFoundException('Order not found');
      }
      
      // Use withTenant for RLS compliance
      return this.prisma.withTenant(orderWithTenant.tenantId, async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId },
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
      });
    } catch {
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
        type: dto['type'] || 'service',
        amount: new Decimal(dto.amount),
        currency: dto.currency || order.currency || 'TRY',
        notes: dto['notes'] || null,
      },
    }));
    await this.audit.log({ action: 'order.charge.added', userId, tenantId, entityType: 'order', entityId: orderId, changes: dto as unknown as Record<string, unknown> });
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
      const updateData: Record<string, unknown> = {};
      
      if (updates['status'] !== undefined) updateData.status = updates['status'];
      if (updates['notes'] !== undefined) updateData.notes = updates['notes'];
      if (updates['tags'] !== undefined) updateData.tags = updates['tags'];
      if (updates['billingAddress'] !== undefined) updateData.billingAddress = updates['billingAddress'];
      
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

  async approveOrder(tenantId: string, orderId: string, dto: ApproveOrderDto, userId: string) {
    const order = await this.runTenant(tenantId, async (db) => 
      db.order.findFirst({
        where: { id: orderId, tenantId },
        include: { items: true }
      })
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.approvalStatus !== 'pending') {
      throw new BadRequestException('Order is not pending approval');
    }

    // Update order status to approved
    const updatedOrder = await this.runTenant(tenantId, async (db) => 
      db.order.update({
        where: { id: orderId },
        data: {
          approvalStatus: 'approved',
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          notes: dto.notes ? `${order.notes || ''}\n\nApproval: ${dto.notes}`.trim() : order.notes,
        },
        include: {
          items: true,
          customer: true,
        },
      })
    );

    // Audit log
    await this.audit.log({
      action: 'order.approved',
      userId,
      tenantId,
      entityType: 'order',
      entityId: orderId,
      metadata: { approvedBy: userId, notes: dto.notes },
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId, orderId);

    return updatedOrder;
  }

  async rejectOrder(tenantId: string, orderId: string, dto: RejectOrderDto, userId: string) {
    const order = await this.runTenant(tenantId, async (db) => 
      db.order.findFirst({
        where: { id: orderId, tenantId },
        include: { items: true }
      })
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.approvalStatus !== 'pending') {
      throw new BadRequestException('Order is not pending approval');
    }

    // Update order status to rejected
    const updatedOrder = await this.runTenant(tenantId, async (db) => 
      db.order.update({
        where: { id: orderId },
        data: {
          approvalStatus: 'rejected',
          status: 'rejected',
          approvedBy: userId,
          approvedAt: new Date(),
          rejectionReason: dto.reason,
          notes: dto.notes ? `${order.notes || ''}\n\nRejection: ${dto.notes}`.trim() : order.notes,
        },
        include: {
          items: true,
          customer: true,
        },
      })
    );

    // Audit log
    await this.audit.log({
      action: 'order.rejected',
      userId,
      tenantId,
      entityType: 'order',
      entityId: orderId,
      metadata: { rejectedBy: userId, reason: dto.reason, notes: dto.notes },
    });

    // Invalidate cache
    await this.cache.invalidateOrderCache(tenantId, orderId);

    return updatedOrder;
  }

  async getPendingApprovals(tenantId: string, query: { page?: number; limit?: number; storeId?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      approvalStatus: 'pending',
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    const [orders, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.order.findMany({
        where,
        include: {
          items: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneE164: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where }),
    ]));

    return {
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}