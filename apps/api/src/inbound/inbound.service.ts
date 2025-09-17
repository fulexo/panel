import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InboundService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.inboundShipment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take, skip, include: { items: true } }),
      db.inboundShipment.count({ where: { tenantId } }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async create(tenantId: string, dto: { reference?: string }) {
    return this.runTenant(tenantId, async (db) => db.inboundShipment.create({ data: { tenantId, reference: dto.reference || null } }));
  }

  async addItem(tenantId: string, inboundId: string, dto: { productId?: string; sku?: string; name?: string; quantity: number }) {
    const inbound = await this.prisma.inboundShipment.findFirst({ where: { id: inboundId, tenantId } });
    if (!inbound) throw new NotFoundException('Inbound shipment not found');
    if (inbound.status !== 'created') throw new BadRequestException('Cannot add items to a non-created shipment');
    const item = await this.prisma.inboundItem.create({ data: { inboundId, productId: dto.productId || null, sku: dto.sku, name: dto.name, quantity: dto.quantity } });
    return item;
  }

  async receive(tenantId: string, inboundId: string) {
    const inbound = await this.runTenant(tenantId, async (db) => db.inboundShipment.findFirst({ where: { id: inboundId, tenantId }, include: { items: true } }));
    if (!inbound) throw new NotFoundException('Inbound shipment not found');
    if (inbound.status !== 'created') throw new BadRequestException('Already processed');

    // Apply stock movements
    for (const it of inbound.items) {
      if (it.productId) {
        await this.runTenant(tenantId, async (db) => db.product.update({ where: { id: it.productId! }, data: { stock: { increment: it.quantity } } }));
        await this.runTenant(tenantId, async (db) => db.stockMovement.create({ data: { productId: it.productId!, type: 'INBOUND', quantity: it.quantity, relatedId: inbound.id } }));
      }
    }

    const updated = await this.runTenant(tenantId, async (db) => db.inboundShipment.update({ where: { id: inboundId }, data: { status: 'received' } }));
    return updated;
  }
}

