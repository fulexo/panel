import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async query(tenantId: string, q: string, types: string[], limitPerType: number) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query too short');
    }

    const needle = q.trim();

    const tasks: Promise<any>[] = [];
    const includeOrders = types.includes('orders');
    const includeProducts = types.includes('products');
    const includeCustomers = types.includes('customers');

    if (includeOrders) {
      tasks.push(
        this.prisma.order.findMany({
          where: {
            tenantId,
            OR: [
              { externalOrderNo: { contains: needle, mode: 'insensitive' } },
              { customerEmail: { contains: needle, mode: 'insensitive' } },
              { customerPhone: { contains: needle } },
              { status: { contains: needle, mode: 'insensitive' } },
            ],
          },
          orderBy: { confirmedAt: 'desc' },
          take: limitPerType,
          select: {
            id: true,
            externalOrderNo: true,
            status: true,
            total: true,
            currency: true,
            confirmedAt: true,
            customerEmail: true,
          },
        })
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (includeProducts) {
      tasks.push(
        this.prisma.product.findMany({
          where: {
            tenantId,
            OR: [
              { sku: { contains: needle, mode: 'insensitive' } },
              { name: { contains: needle, mode: 'insensitive' } },
              { tags: { has: needle } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: limitPerType,
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            stock: true,
          },
        })
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    if (includeCustomers) {
      tasks.push(
        this.prisma.customer.findMany({
          where: {
            tenantId,
            OR: [
              { email: { contains: needle, mode: 'insensitive' } },
              { emailNormalized: { contains: needle, mode: 'insensitive' } },
              { phoneE164: { contains: needle } },
              { name: { contains: needle, mode: 'insensitive' } },
              { company: { contains: needle, mode: 'insensitive' } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          take: limitPerType,
          select: {
            id: true,
            name: true,
            email: true,
            phoneE164: true,
            company: true,
          },
        })
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    const [orders, products, customers] = await Promise.all(tasks);

    return {
      q: needle,
      orders,
      products,
      customers,
    };
  }
}

