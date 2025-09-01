import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function buildAuthHeader(ck: string, cs: string){
  const token = Buffer.from(`${ck}:${cs}`).toString('base64');
  return `Basic ${token}`;
}

@Injectable()
export class WooService {
  constructor(private prisma: PrismaService) {}

  async listStores(tenantId: string){
    return this.prisma.wooStore.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async addStore(tenantId: string, dto: { name: string; baseUrl: string; consumerKey: string; consumerSecret: string; apiVersion?: string; webhookSecret?: string; }){
    const store = await this.prisma.wooStore.create({ data: {
      tenantId,
      name: dto.name,
      baseUrl: dto.baseUrl.replace(/\/$/, ''),
      consumerKey: dto.consumerKey,
      consumerSecret: dto.consumerSecret,
      apiVersion: dto.apiVersion || 'v3',
      webhookSecret: dto.webhookSecret || null,
      active: true,
    }});
    return store;
  }

  async removeStore(tenantId: string, id: string){
    const s = await this.prisma.wooStore.findFirst({ where: { id, tenantId } });
    if(!s) throw new BadRequestException('Store not found');
    await this.prisma.wooStore.delete({ where: { id } });
    return { ok: true };
  }

  async testConnection(tenantId: string, id: string){
    const s = await this.prisma.wooStore.findFirst({ where: { id, tenantId } });
    if(!s) throw new BadRequestException('Store not found');
    const url = `${s.baseUrl}/wp-json/wc/${s.apiVersion}/orders?per_page=1`;
    const r = await fetch(url, { headers: { Authorization: buildAuthHeader(s.consumerKey, s.consumerSecret) } } as any);
    return { ok: r.ok, status: r.status };
  }

  async registerWebhooks(tenantId: string, id: string){
    const s = await this.prisma.wooStore.findFirst({ where: { id, tenantId } });
    if(!s) throw new BadRequestException('Store not found');
    const topics = [
      'order.created','order.updated','product.created','product.updated','product.deleted'
    ];
    const results: any[] = [];
    for(const topic of topics){
      const body = {
        name: `fx-${topic}`,
        topic,
        delivery_url: `${process.env.PUBLIC_API_BASE || 'https://api.example.com'}/woo/webhooks/${id}`,
        secret: s.webhookSecret || undefined,
      };
      const r = await fetch(`${s.baseUrl}/wp-json/wc/${s.apiVersion}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: buildAuthHeader(s.consumerKey, s.consumerSecret) },
        body: JSON.stringify(body)
      } as any);
      results.push({ topic, ok: r.ok, status: r.status });
    }
    return { results };
  }
}