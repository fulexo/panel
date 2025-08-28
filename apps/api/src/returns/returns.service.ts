import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.return.findMany({
        where: { order: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.return.count({ where: { order: { tenantId } } }),
    ]);
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const entity = await this.prisma.return.findFirst({ where: { id, order: { tenantId } } });
    if (!entity) throw new NotFoundException('Return not found');
    return entity;
  }
}