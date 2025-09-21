import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  CreateShippingZoneDto, 
  UpdateShippingZoneDto,
  CreateShippingPriceDto,
  UpdateShippingPriceDto,
  CreateCustomerShippingPriceDto,
  UpdateCustomerShippingPriceDto,
  CalculateShippingDto,
  AdjustmentType
} from './dto/shipping.dto';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  // Shipping Zones
  async createZone(tenantId: string, dto: CreateShippingZoneDto) {
    return this.runTenant(tenantId, async (db) => 
      db.shippingZone.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      })
    );
  }

  async getZones(tenantId: string, includeInactive = false) {
    const where: Record<string, unknown> = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingZone.findMany({
        where,
        include: {
          prices: {
            where: { isActive: true },
            orderBy: { priority: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      })
    );
  }

  async getZone(tenantId: string, id: string) {
    const zone = await this.runTenant(tenantId, async (db) => 
      db.shippingZone.findFirst({
        where: { id, tenantId },
        include: {
          prices: {
            where: { isActive: true },
            orderBy: { priority: 'desc' },
          },
        },
      })
    );

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }

    return zone;
  }

  async updateZone(tenantId: string, id: string, dto: UpdateShippingZoneDto) {
    const zone = await this.runTenant(tenantId, async (db) => 
      db.shippingZone.findFirst({ where: { id, tenantId } })
    );

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingZone.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      })
    );
  }

  async deleteZone(tenantId: string, id: string) {
    const zone = await this.runTenant(tenantId, async (db) => 
      db.shippingZone.findFirst({ where: { id, tenantId } })
    );

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingZone.delete({ where: { id } })
    );
  }

  // Shipping Prices
  async createPrice(tenantId: string, dto: CreateShippingPriceDto) {
    // Verify zone exists
    const zone = await this.runTenant(tenantId, async (db) => 
      db.shippingZone.findFirst({ where: { id: dto.zoneId, tenantId } })
    );

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingPrice.create({
        data: {
          tenantId,
          zoneId: dto.zoneId,
          name: dto.name,
          description: dto.description,
          basePrice: new Decimal(dto.basePrice),
          freeShippingThreshold: dto.freeShippingThreshold ? new Decimal(dto.freeShippingThreshold) : null,
          estimatedDays: dto.estimatedDays,
          isActive: dto.isActive ?? true,
          priority: dto.priority ?? 0,
        },
      })
    );
  }

  async getPrices(tenantId: string, zoneId?: string) {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (zoneId) {
      where.zoneId = zoneId;
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingPrice.findMany({
        where,
        include: {
          zone: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ zoneId: 'asc' }, { priority: 'desc' }],
      })
    );
  }

  async getPrice(tenantId: string, id: string) {
    const price = await this.runTenant(tenantId, async (db) => 
      db.shippingPrice.findFirst({
        where: { id, tenantId },
        include: {
          zone: true,
        },
      })
    );

    if (!price) {
      throw new NotFoundException('Shipping price not found');
    }

    return price;
  }

  async updatePrice(tenantId: string, id: string, dto: UpdateShippingPriceDto) {
    const price = await this.runTenant(tenantId, async (db) => 
      db.shippingPrice.findFirst({ where: { id, tenantId } })
    );

    if (!price) {
      throw new NotFoundException('Shipping price not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingPrice.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.basePrice !== undefined && { basePrice: new Decimal(dto.basePrice) }),
          ...(dto.freeShippingThreshold !== undefined && { 
            freeShippingThreshold: dto.freeShippingThreshold ? new Decimal(dto.freeShippingThreshold) : null 
          }),
          ...(dto.estimatedDays !== undefined && { estimatedDays: dto.estimatedDays }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.priority !== undefined && { priority: dto.priority }),
        },
      })
    );
  }

  async deletePrice(tenantId: string, id: string) {
    const price = await this.runTenant(tenantId, async (db) => 
      db.shippingPrice.findFirst({ where: { id, tenantId } })
    );

    if (!price) {
      throw new NotFoundException('Shipping price not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.shippingPrice.delete({ where: { id } })
    );
  }

  // Customer-specific pricing
  async createCustomerPrice(tenantId: string, dto: CreateCustomerShippingPriceDto) {
    // Verify zone and price exist
    const [zone, price] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.shippingZone.findFirst({ where: { id: dto.zoneId, tenantId } }),
      db.shippingPrice.findFirst({ where: { id: dto.priceId, tenantId } }),
    ]));

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }
    if (!price) {
      throw new NotFoundException('Shipping price not found');
    }

    // Verify customer exists if specified
    if (dto.customerId) {
      const customer = await this.runTenant(tenantId, async (db) => 
        db.customer.findFirst({ where: { id: dto.customerId, tenantId } })
      );
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    return this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.create({
        data: {
          tenantId,
          customerId: dto.customerId || null,
          zoneId: dto.zoneId,
          priceId: dto.priceId,
          adjustmentType: dto.adjustmentType,
          adjustmentValue: new Decimal(dto.adjustmentValue),
          isActive: dto.isActive ?? true,
        },
      })
    );
  }

  async getCustomerPrices(tenantId: string, customerId?: string) {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (customerId) {
      where.OR = [
        { customerId: null }, // General prices
        { customerId }, // Customer-specific prices
      ];
    } else {
      where.customerId = null; // Only general prices
    }

    return this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, email: true },
          },
          zone: {
            select: { id: true, name: true },
          },
          price: {
            select: { id: true, name: true, basePrice: true },
          },
        },
        orderBy: [
          { customerId: 'asc' }, // General prices first
          { zoneId: 'asc' },
        ],
      })
    );
  }

  async updateCustomerPrice(tenantId: string, id: string, dto: UpdateCustomerShippingPriceDto) {
    const customerPrice = await this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.findFirst({ where: { id, tenantId } })
    );

    if (!customerPrice) {
      throw new NotFoundException('Customer shipping price not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.update({
        where: { id },
        data: {
          ...(dto.adjustmentType !== undefined && { adjustmentType: dto.adjustmentType }),
          ...(dto.adjustmentValue !== undefined && { adjustmentValue: new Decimal(dto.adjustmentValue) }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      })
    );
  }

  async deleteCustomerPrice(tenantId: string, id: string) {
    const customerPrice = await this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.findFirst({ where: { id, tenantId } })
    );

    if (!customerPrice) {
      throw new NotFoundException('Customer shipping price not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.customerShippingPrice.delete({ where: { id } })
    );
  }

  // Calculate shipping cost
  async calculateShipping(tenantId: string, dto: CalculateShippingDto) {
    const { zoneId, customerId, orderTotal } = dto;

    // Get available prices for the zone
    const prices = await this.runTenant(tenantId, async (db) => 
      db.shippingPrice.findMany({
        where: {
          zoneId,
          tenantId,
          isActive: true,
        },
        include: {
          customerPrices: {
            where: {
              isActive: true,
              OR: [
                { customerId: null }, // General prices
                ...(customerId ? [{ customerId }] : []), // Customer-specific prices
              ],
            },
          },
        },
        orderBy: { priority: 'desc' },
      })
    );

    if (prices.length === 0) {
      throw new NotFoundException('No shipping options available for this zone');
    }

    const results = [];

    for (const price of prices) {
      let finalPrice = Number(price.basePrice);

      // Check for free shipping threshold
      if (price.freeShippingThreshold && orderTotal >= Number(price.freeShippingThreshold)) {
        finalPrice = 0;
      } else {
        // Apply customer-specific adjustments
        const customerPrice = price.customerPrices.find(cp => 
          cp.customerId === customerId || cp.customerId === null
        );

        if (customerPrice) {
          if (customerPrice.adjustmentType === AdjustmentType.PERCENTAGE) {
            const adjustment = Number(customerPrice.adjustmentValue);
            finalPrice = finalPrice * (1 + adjustment / 100);
          } else if (customerPrice.adjustmentType === AdjustmentType.FIXED) {
            finalPrice = finalPrice + Number(customerPrice.adjustmentValue);
          }
        }

        // Ensure price is not negative
        finalPrice = Math.max(0, finalPrice);
      }

      results.push({
        id: price.id,
        name: price.name,
        description: price.description,
        basePrice: Number(price.basePrice),
        finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
        estimatedDays: price.estimatedDays,
        isFree: finalPrice === 0,
        freeShippingThreshold: price.freeShippingThreshold ? Number(price.freeShippingThreshold) : null,
        priority: price.priority,
      });
    }

    return {
      zoneId,
      customerId,
      orderTotal,
      options: results.sort((a, b) => a.priority - b.priority), // Sort by priority (ascending)
    };
  }

  // Get shipping options for customer display
  async getShippingOptions(tenantId: string, customerId?: string) {
    const zones = await this.getZones(tenantId);
    const options = [];

    for (const zone of zones) {
      const prices = await this.getPrices(tenantId, zone.id);
      
      if (prices.length > 0) {
        options.push({
          zone: {
            id: zone.id,
            name: zone.name,
            description: zone.description,
          },
          prices: prices.map(price => ({
            id: price.id,
            name: price.name,
            description: price.description,
            basePrice: Number(price.basePrice),
            estimatedDays: price.estimatedDays,
            freeShippingThreshold: price.freeShippingThreshold ? Number(price.freeShippingThreshold) : null,
            priority: price.priority,
          })),
        });
      }
    }

    return options;
  }
}