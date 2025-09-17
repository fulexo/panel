import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: process.env['DATABASE_URL']!,
        },
      },
      // Connection pool settings
      // __internal: {
      //   engine: {
      //     connectionLimit: 20, // Maximum number of connections
      //     poolTimeout: 20, // Connection timeout in seconds
      //     connectionTimeout: 10, // Connection acquisition timeout
      //   },
      // },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method for tenant-scoped queries with optimized includes
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.where = { ...args.where, tenantId };
            
            // Optimize includes to prevent N+1 queries
            if (args.include) {
              // args.include = this.optimizeIncludes(args.include);
            }
            
            return query(args);
          },
          async findFirst({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.where = { ...args.where, tenantId };
            
            if (args.include) {
              // args.include = this.optimizeIncludes(args.include);
            }
            
            return query(args);
          },
          async findUnique({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.where = { ...args.where, tenantId };
            
            if (args.include) {
              // args.include = this.optimizeIncludes(args.include);
            }
            
            return query(args);
          },
          async create({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.data = { ...args.data, tenantId };
            return query(args);
          },
          async update({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
          async delete({ args, query }: { args: any; query: (args: any) => Promise<unknown> }) {
            args.where = { ...args.where, tenantId };
            return query(args);
          },
        },
      },
    });
  }

  // Optimize includes to prevent N+1 queries
  // private _optimizeIncludes(_include: unknown): unknown {
  //   if (!_include || typeof _include !== 'object') {
  //     return _include;
  //   }

  //   const optimized: Record<string, unknown> = {};
  //   
  //   for (const [key, value] of Object.entries(_include as Record<string, unknown>)) {
  //     if (value === true) {
  //       optimized[key] = true;
  //     } else if (typeof value === 'object' && value !== null) {
  //       // Recursively optimize nested includes
  //       optimized[key] = {
  //         ...(value as Record<string, unknown>),
  //         include: (value as Record<string, unknown>)['include'] ? this._optimizeIncludes((value as Record<string, unknown>)['include']) : undefined,
  //       };
  //     }
  //   }
  //   
  //   return optimized;
  // }

  // Set PostgreSQL session variable for RLS per transaction
  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>, userId?: string): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}::uuid`;
      if (userId) {
        await tx.$executeRaw`SET LOCAL app.user_id = ${userId}::uuid`;
      }
      return fn(tx as any);
    });
  }

  async withUser<T>(userId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL app.user_id = ${userId}::uuid`;
      return fn(tx as any);
    });
  }
}