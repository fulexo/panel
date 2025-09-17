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
    const modules: Record<string, unknown> = {};
    const actions: Record<string, unknown> = {};
    const dataScope: Record<string, unknown> = {};
    for(const p of pol){
      Object.assign(modules, (p as Record<string, unknown>)['modules'] || {});
      Object.assign(actions, (p as Record<string, unknown>)['actions'] || {});
      Object.assign(dataScope, (p as Record<string, unknown>)['dataScope'] || {});
    }
    return { modules, actions, dataScope };
  }
}

