import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method for tenant-scoped queries
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query }: any) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findFirst({ args, query }: any) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async findUnique({ args, query }: any) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async create({ args, query }: any) {
            args.data = { ...args.data, tenantId };
            return query(args);
          },
          async update({ args, query }: any) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async delete({ args, query }: any) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
        },
      },
    });
  }

  // Set PostgreSQL session variable for RLS per transaction
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>, userId?: string): Promise<T> {
    return this.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SET LOCAL app.tenant_id = ${tenantId}::uuid`;
      if (userId) {
        await (tx as any).$executeRaw`SET LOCAL app.user_id = ${userId}::uuid`;
      }
      return fn(tx as any);
    });
  }

  async withUser<T>(userId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await (tx as any).$executeRaw`SET LOCAL app.user_id = ${userId}::uuid`;
      return fn(tx as any);
    });
  }
}