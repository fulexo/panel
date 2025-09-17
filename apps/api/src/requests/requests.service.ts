import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { PrismaClient } from '@prisma/client';
import { CreateRequestDto } from './dto';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.withTenant(tenantId, fn);
  }

  async list(tenantId: string, page = 1, limit = 50) {
    const take = Math.min(limit, 200);
    const skip = (page - 1) * take;
    const [data, total] = await this.runTenant(tenantId, async (db) => Promise.all([
      db.request.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take, skip }),
      db.request.count({ where: { tenantId } }),
    ]));
    return { data, pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async get(tenantId: string, id: string) {
    const entity = await this.runTenant(tenantId, async (db) => db.request.findFirst({ where: { id, tenantId }, include: { comments: true } }));
    if (!entity) throw new NotFoundException('Request not found');
    return entity;
  }

  async create(tenantId: string, userId: string, dto: CreateRequestDto) {
    const request = await this.runTenant(tenantId, async (db) => db.request.create({
      data: {
        tenantId,
        createdBy: userId,
        type: dto.type,
        priority: (dto.priority as any) || 'normal',
        status: 'SUBMITTED',
        payload: dto.payload,
      },
    }));

    await this.audit.log({ action: 'request.created', userId, tenantId, entityType: 'request', entityId: request.id });
    return request;
  }

  private async ensureRequest(tenantId: string, id: string) {
    const req = await this.runTenant(tenantId, async (db) => db.request.findFirst({ where: { id, tenantId } }));
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async submit(tenantId: string, id: string, userId: string) {
    const req = await this.ensureRequest(tenantId, id);
    if (req.status !== 'DRAFT' && req.status !== 'REJECTED') throw new BadRequestException('Invalid state');
    const updated = await this.runTenant(tenantId, async (db) => db.request.update({ where: { id }, data: { status: 'SUBMITTED' } }));
    await this.audit.log({ action: 'request.submitted', userId, tenantId, entityType: 'request', entityId: id });
    return updated;
  }

  async approve(tenantId: string, id: string, userId: string) {
    const req = await this.ensureRequest(tenantId, id);
    if (req.status !== 'SUBMITTED' && req.status !== 'UNDER_REVIEW') throw new BadRequestException('Invalid state');
    const updated = await this.runTenant(tenantId, async (db) => db.request.update({ where: { id }, data: { status: 'APPROVED', reviewerUserId: userId, reviewedAt: new Date() } }));
    await this.audit.log({ action: 'request.approved', userId, tenantId, entityType: 'request', entityId: id });
    return updated;
  }

  async reject(tenantId: string, id: string, userId: string, reason?: string) {
    const req = await this.ensureRequest(tenantId, id);
    if (req.status !== 'SUBMITTED' && req.status !== 'UNDER_REVIEW') throw new BadRequestException('Invalid state');
    const updated = await this.runTenant(tenantId, async (db) => db.request.update({ where: { id }, data: { status: 'REJECTED', reviewerUserId: userId, reviewedAt: new Date() } }));
    await this.addComment(tenantId, id, userId, `Rejected${reason ? ': ' + reason : ''}`, true);
    await this.audit.log({ action: 'request.rejected', userId, tenantId, entityType: 'request', entityId: id });
    return updated;
  }

  async apply(tenantId: string, id: string, userId: string) {
    const req = await this.ensureRequest(tenantId, id);
    if (req.status !== 'APPROVED') throw new BadRequestException('Request must be approved');
    const updated = await this.runTenant(tenantId, async (db) => db.request.update({ where: { id }, data: { status: 'APPLIED', appliedAt: new Date() } }));
    await this.audit.log({ action: 'request.applied', userId, tenantId, entityType: 'request', entityId: id });
    return updated;
  }

  async addComment(tenantId: string, id: string, userId: string, message: string, isInternal = false) {
    // const req = await this.ensureRequest(tenantId, id);
    const comment = await this.runTenant(tenantId, async (db) => db.requestComment.create({ data: { requestId: id, authorId: userId, message, isInternal } }));
    await this.audit.log({ action: 'request.comment.added', userId, tenantId, entityType: 'request', entityId: id });
    return comment;
  }
}