import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: any) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn as any);
  }

  async list(tenantId: string, page = 1, limit = 50, search?: string) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phoneE164: { contains: search } },
      ];
    }
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.customer.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
      db.customer.count({ where }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const customer = await this.runTenant(tenantId, async (db) => db.customer.findFirst({ where: { id, tenantId } }));
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(tenantId: string, body: any) {
    return this.runTenant(tenantId, async (db) => db.customer.create({ data: { tenantId, email: body.email || null, emailNormalized: body.email ? String(body.email).toLowerCase() : null, name: body.name || null, phoneE164: body.phoneE164 || null, company: body.company || null } as any }));
  }

  async update(tenantId: string, id: string, body: any) {
    const existing = await this.runTenant(tenantId, async (db) => db.customer.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Customer not found');
    return this.runTenant(tenantId, async (db) => db.customer.update({ where: { id }, data: { email: body.email ?? existing.email, emailNormalized: body.email ? String(body.email).toLowerCase() : existing.emailNormalized, name: body.name ?? existing.name, phoneE164: body.phoneE164 ?? existing.phoneE164, company: body.company ?? existing.company } }));
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.runTenant(tenantId, async (db) => db.customer.findFirst({ where: { id, tenantId } }));
    if (!existing) throw new NotFoundException('Customer not found');
    await this.runTenant(tenantId, async (db) => db.customer.delete({ where: { id } }));
    return { message: 'Customer deleted' };
  }
}

