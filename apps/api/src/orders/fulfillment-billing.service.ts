import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  CreateFulfillmentServiceDto, 
  UpdateFulfillmentServiceDto,
  CreateFulfillmentBillingItemDto,
  UpdateFulfillmentBillingItemDto,
  CreateFulfillmentInvoiceDto,
  UpdateFulfillmentInvoiceDto,
  FulfillmentBillingQueryDto,
  FulfillmentInvoiceQueryDto,
  GenerateMonthlyInvoiceDto,
  FulfillmentInvoiceStatus
} from './dto/fulfillment-billing.dto';

@Injectable()
export class FulfillmentBillingService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  // Fulfillment Services
  async createService(tenantId: string, dto: CreateFulfillmentServiceDto) {
    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          unit: dto.unit,
          basePrice: new Decimal(dto.basePrice),
          isActive: dto.isActive ?? true,
        },
      })
    );
  }

  async getServices(tenantId: string, includeInactive = false) {
    const where: Record<string, unknown> = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.findMany({
        where,
        orderBy: { name: 'asc' },
      })
    );
  }

  async getService(tenantId: string, id: string) {
    const service = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.findFirst({
        where: { id, tenantId },
      })
    );

    if (!service) {
      throw new NotFoundException('Fulfillment service not found');
    }

    return service;
  }

  async updateService(tenantId: string, id: string, dto: UpdateFulfillmentServiceDto) {
    const service = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.findFirst({ where: { id, tenantId } })
    );

    if (!service) {
      throw new NotFoundException('Fulfillment service not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.unit !== undefined && { unit: dto.unit }),
          ...(dto.basePrice !== undefined && { basePrice: new Decimal(dto.basePrice) }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      })
    );
  }

  async deleteService(tenantId: string, id: string) {
    const service = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.findFirst({ where: { id, tenantId } })
    );

    if (!service) {
      throw new NotFoundException('Fulfillment service not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.delete({ where: { id } })
    );
  }

  // Fulfillment Billing Items
  async createBillingItem(tenantId: string, dto: CreateFulfillmentBillingItemDto) {
    // Verify order exists
    const order = await this.runTenant(tenantId, async (db) => 
      db.order.findFirst({
        where: { id: dto.orderId, tenantId },
        include: { customer: true },
      })
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get service details
    const service = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentService.findFirst({
        where: { id: dto.serviceId, tenantId, isActive: true },
      })
    );

    if (!service) {
      throw new NotFoundException('Fulfillment service not found');
    }

    const unitPrice = dto.unitPrice ? new Decimal(dto.unitPrice) : service.basePrice;
    const totalPrice = unitPrice.mul(new Decimal(dto.quantity));

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.create({
        data: {
          tenantId,
          orderId: dto.orderId,
          serviceId: dto.serviceId,
          quantity: new Decimal(dto.quantity),
          unitPrice,
          totalPrice,
          description: dto.description,
          serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        },
        include: {
          service: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    );
  }

  async getBillingItems(tenantId: string, query: FulfillmentBillingQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.customerId) {
      where.order = {
        customerId: query.customerId,
      };
    }

    if (query.isBilled !== undefined) {
      where.isBilled = query.isBilled;
    }

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.startDate || query.endDate) {
      where.serviceDate = {};
      if (query.startDate) {
        where.serviceDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.serviceDate.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.fulfillmentBillingItem.findMany({
        where,
        include: {
          service: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { serviceDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.fulfillmentBillingItem.count({ where }),
    ]));

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBillingItem(tenantId: string, id: string) {
    const item = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.findFirst({
        where: { id, tenantId },
        include: {
          service: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    );

    if (!item) {
      throw new NotFoundException('Fulfillment billing item not found');
    }

    return item;
  }

  async updateBillingItem(tenantId: string, id: string, dto: UpdateFulfillmentBillingItemDto) {
    const item = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.findFirst({ where: { id, tenantId } })
    );

    if (!item) {
      throw new NotFoundException('Fulfillment billing item not found');
    }

    if (item.isBilled) {
      throw new BadRequestException('Cannot update billed items');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.quantity !== undefined) {
      updateData.quantity = new Decimal(dto.quantity);
    }

    if (dto.unitPrice !== undefined) {
      updateData.unitPrice = new Decimal(dto.unitPrice);
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.serviceDate !== undefined) {
      updateData.serviceDate = new Date(dto.serviceDate);
    }

    // Recalculate total price if quantity or unit price changed
    if (dto.quantity !== undefined || dto.unitPrice !== undefined) {
      const quantity = dto.quantity !== undefined ? new Decimal(dto.quantity) : item.quantity;
      const unitPrice = dto.unitPrice !== undefined ? new Decimal(dto.unitPrice) : item.unitPrice;
      updateData.totalPrice = quantity.mul(unitPrice);
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.update({
        where: { id },
        data: updateData,
        include: {
          service: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    );
  }

  async deleteBillingItem(tenantId: string, id: string) {
    const item = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.findFirst({ where: { id, tenantId } })
    );

    if (!item) {
      throw new NotFoundException('Fulfillment billing item not found');
    }

    if (item.isBilled) {
      throw new BadRequestException('Cannot delete billed items');
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.delete({ where: { id } })
    );
  }

  // Fulfillment Invoices
  async generateMonthlyInvoice(tenantId: string, dto: GenerateMonthlyInvoiceDto) {
    // Check if invoice already exists for this customer and month
    const existingInvoice = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentInvoice.findFirst({
        where: {
          tenantId,
          customerId: dto.customerId,
          month: dto.month,
          year: dto.year,
        },
      })
    );

    if (existingInvoice) {
      throw new BadRequestException('Invoice already exists for this customer and month');
    }

    // Get unbilled items for the customer in the specified month
    const startDate = new Date(dto.year, dto.month - 1, 1);
    const endDate = new Date(dto.year, dto.month, 0, 23, 59, 59);

    const unbilledItems = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.findMany({
        where: {
          tenantId,
          isBilled: false,
          serviceDate: {
            gte: startDate,
            lte: endDate,
          },
          order: {
            customerId: dto.customerId,
          },
        },
        include: {
          service: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      })
    );

    if (unbilledItems.length === 0) {
      throw new BadRequestException('No unbilled items found for this customer and month');
    }

    // Calculate total amount
    const totalAmount = unbilledItems.reduce((sum, item) => 
      sum.add(item.totalPrice), new Decimal(0)
    );

    // Generate invoice number
    const invoiceNumber = `${dto.year}-${dto.month.toString().padStart(2, '0')}-${dto.customerId.slice(-4)}`;

    // Set due date (end of month + 30 days)
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date(dto.year, dto.month, 30);

    // Create invoice
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentInvoice.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          invoiceNumber,
          month: dto.month,
          year: dto.year,
          totalAmount,
          dueDate,
          notes: dto.notes,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    );

    // Mark items as billed
    await this.runTenant(tenantId, async (db) => 
      db.fulfillmentBillingItem.updateMany({
        where: {
          id: {
            in: unbilledItems.map(item => item.id),
          },
        },
        data: {
          isBilled: true,
          billedAt: new Date(),
          invoiceId: invoice.id,
        },
      })
    );

    return invoice;
  }

  async getInvoices(tenantId: string, query: FulfillmentInvoiceQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.month) {
      where.month = query.month;
    }

    if (query.year) {
      where.year = query.year;
    }

    const [invoices, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.fulfillmentInvoice.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              service: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.fulfillmentInvoice.count({ where }),
    ]));

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentInvoice.findFirst({
        where: { id, tenantId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              service: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                },
              },
            },
          },
        },
      })
    );

    if (!invoice) {
      throw new NotFoundException('Fulfillment invoice not found');
    }

    return invoice;
  }

  async updateInvoice(tenantId: string, id: string, dto: UpdateFulfillmentInvoiceDto) {
    const invoice = await this.runTenant(tenantId, async (db) => 
      db.fulfillmentInvoice.findFirst({ where: { id, tenantId } })
    );

    if (!invoice) {
      throw new NotFoundException('Fulfillment invoice not found');
    }

    return this.runTenant(tenantId, async (db) => 
      db.fulfillmentInvoice.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
          ...(dto.paidAt !== undefined && { paidAt: dto.paidAt ? new Date(dto.paidAt) : null }),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              service: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                },
              },
            },
          },
        },
      })
    );
  }

  async getBillingStats(tenantId: string, customerId?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (customerId) {
      where.order = { customerId };
    }

    const [totalItems, unbilledItems, totalAmount, unbilledAmount] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.fulfillmentBillingItem.count({ where }),
      db.fulfillmentBillingItem.count({ where: { ...where, isBilled: false } }),
      db.fulfillmentBillingItem.aggregate({
        where,
        _sum: { totalPrice: true },
      }),
      db.fulfillmentBillingItem.aggregate({
        where: { ...where, isBilled: false },
        _sum: { totalPrice: true },
      }),
    ]));

    return {
      totalItems,
      unbilledItems,
      totalAmount: totalAmount._sum.totalPrice || 0,
      unbilledAmount: unbilledAmount._sum.totalPrice || 0,
    };
  }
}