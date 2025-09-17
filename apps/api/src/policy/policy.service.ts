import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PolicyService {
  constructor(private prisma: PrismaService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async getVisibility(tenantId: string) {
    const pol = await this.runTenant(tenantId, async (db) => db.policy.findMany({ where: { tenantId, active: true } }));
    const modules: any = {};
    const actions: any = {};
    const dataScope: any = {};
    for(const p of pol){
      Object.assign(modules, (p as any).modules || {});
      Object.assign(actions, (p as any).actions || {});
      Object.assign(dataScope, (p as any).dataScope || {});
    }
    return { modules, actions, dataScope };
  }
}

