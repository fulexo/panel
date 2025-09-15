import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  async list(tenantId: string, page = 1, limit = 50, query: any = {}) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;

    const where: any = { order: { tenantId } };
    
    if (query.search) {
      where.OR = [
        { trackingNo: { contains: query.search, mode: 'insensitive' } },
        { carrier: { contains: query.search, mode: 'insensitive' } },
        { order: { externalOrderNo: { contains: query.search, mode: 'insensitive' } } },
        { order: { customerEmail: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.carrier) {
      where.carrier = query.carrier;
    }

    if (query.dateFilter) {
      const now = new Date();
      let dateFrom: Date;
      
      switch (query.dateFilter) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          dateFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(0);
      }
      
      where.createdAt = { gte: dateFrom };
    }

    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { order: true }
      }),
      db.shipment.count({ where }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } },
      include: { order: true }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');
    return shipment;
  }

  async create(tenantId: string, dto: any) {
    // Verify order exists and belongs to tenant
    const order = await this.runTenant(tenantId, async (db) => db.order.findFirst({
      where: { id: dto.orderId, tenantId }
    }));
    if (!order) throw new NotFoundException('Order not found');

    return this.runTenant(tenantId, async (db) => db.shipment.create({
      data: {
        orderId: dto.orderId,
        carrier: dto.carrier,
        trackingNo: dto.trackingNo,
        status: dto.status || 'pending',
        weight: dto.weight ? new Prisma.Decimal(dto.weight) : null,
        dimensions: dto.dimensions,
        ...(dto.status === 'shipped' && { shippedAt: new Date() }),
        ...(dto.status === 'delivered' && { deliveredAt: new Date() }),
      } as any,
    }));
  }

  async update(tenantId: string, id: string, dto: any) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');

    return this.runTenant(tenantId, async (db) => db.shipment.update({
      where: { id },
      data: {
        ...(dto.carrier !== undefined && { carrier: dto.carrier }),
        ...(dto.trackingNo !== undefined && { trackingNo: dto.trackingNo }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.weight !== undefined && { weight: dto.weight ? new Prisma.Decimal(dto.weight) : null }),
        ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
        ...(dto.status === 'shipped' && !shipment.shippedAt && { shippedAt: new Date() }),
        ...(dto.status === 'delivered' && !shipment.deliveredAt && { deliveredAt: new Date() }),
      } as any,
    }));
  }

  async delete(tenantId: string, id: string) {
    const shipment = await this.runTenant(tenantId, async (db) => db.shipment.findFirst({
      where: { id, order: { tenantId } }
    }));
    if (!shipment) throw new NotFoundException('Shipment not found');

    return this.runTenant(tenantId, async (db) => db.shipment.delete({
      where: { id }
    }));
  }
}