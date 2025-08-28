import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InboundService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.inboundShipment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take, skip, include: { items: true } }),
      this.prisma.inboundShipment.count({ where: { tenantId } }),
    ]);
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async create(tenantId: string, dto: { reference?: string }) {
    return this.prisma.inboundShipment.create({ data: { tenantId, reference: dto.reference || null } as any });
  }

  async addItem(tenantId: string, inboundId: string, dto: { productId?: string; sku?: string; name?: string; quantity: number }) {
    const inbound = await this.prisma.inboundShipment.findFirst({ where: { id: inboundId, tenantId } });
    if (!inbound) throw new NotFoundException('Inbound shipment not found');
    if (inbound.status !== 'created') throw new BadRequestException('Cannot add items to a non-created shipment');
    const item = await this.prisma.inboundItem.create({ data: { inboundId, productId: dto.productId || null, sku: dto.sku, name: dto.name, quantity: dto.quantity } as any });
    return item;
  }

  async receive(tenantId: string, inboundId: string) {
    const inbound = await this.prisma.inboundShipment.findFirst({ where: { id: inboundId, tenantId }, include: { items: true } });
    if (!inbound) throw new NotFoundException('Inbound shipment not found');
    if (inbound.status !== 'created') throw new BadRequestException('Already processed');

    // Apply stock movements
    for (const it of inbound.items) {
      if (it.productId) {
        await this.prisma.product.update({ where: { id: it.productId }, data: { stock: { increment: it.quantity } } as any });
        await this.prisma.stockMovement.create({ data: { productId: it.productId, type: 'INBOUND', quantity: it.quantity, relatedId: inbound.id } });
      }
    }

    const updated = await this.prisma.inboundShipment.update({ where: { id: inboundId }, data: { status: 'received' } });
    return updated;
  }
}

