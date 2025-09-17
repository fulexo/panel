import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '../jwt';
import { SessionService } from '../auth/session.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sessions: SessionService,
    private audit: AuditService,
  ) {}

  async list(page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
      this.prisma.tenant.count(),
    ]);
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async impersonate(actingUserId: string, targetTenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const user = await this.prisma.user.findUnique({ where: { id: actingUserId } });
    if (!user) throw new NotFoundException('User not found');

    // const payload = {
    //   sub: user.id,
    //   email: user.email,
    //   role: user.role,
    //   tenantId: tenant.id,
    //   impersonated: true,
    //   originalTenantId: user.tenantId,
    // } as any;

    const tokens = await this.jwt.issueTokens(user.id, user.email, user.role, tenant.id);
    await this.sessions.createSession(user.id, tokens.access, {});

    await this.audit.log({
      action: 'tenant.impersonation.start',
      userId: user.id,
      tenantId: tenant.id,
      metadata: { originalTenantId: user.tenantId },
    });

    return { tokens, context: { tenantId: tenant.id, impersonated: true, originalTenantId: user.tenantId } };
  }

  async stopImpersonation(userPayload: Record<string, unknown>) {
    const { sub: userId, originalTenantId, impersonated } = userPayload || {};
    if (!impersonated || !originalTenantId) {
      throw new BadRequestException('Not impersonating');
    }

    const user = await this.prisma.user.findUnique({ where: { id: String(userId) } });
    if (!user) throw new NotFoundException('User not found');

    // const payload = {
    //   sub: user.id,
    //   email: user.email,
    //   role: user.role,
    //   tenantId: originalTenantId,
    // } as any;

    const tokens = await this.jwt.issueTokens(user.id, user.email, user.role, originalTenantId);
    await this.sessions.createSession(user.id, tokens.access, {});

    await this.audit.log({
      action: 'tenant.impersonation.stop',
      userId: user.id,
      tenantId: originalTenantId,
    });

    return { tokens, context: { tenantId: originalTenantId, impersonated: false } };
  }
}