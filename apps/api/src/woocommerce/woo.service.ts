import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

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
    // schedule initial syncs via fx-jobs
    try {
      const { Queue } = await import('bullmq');
      const Redis = (await import('ioredis')).default;
      const connection = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0', { maxRetriesPerRequest: null });
      const q = new Queue('fx-jobs', { connection });
      await q.add('woo-sync-orders', { storeId: store.id });
      await q.add('woo-sync-products', { storeId: store.id });
      await q.close();
      await connection.quit();
    } catch(e) {
      // noop if queue unavailable
    }
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

  private verifySignature(payload: any, secret?: string, signature?: string){
    if (!secret) return true; // allow if no secret configured
    if (!signature) return false;
    try{
      const computed = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('base64');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(String(signature)));
    }catch{
      return false;
    }
  }

  async handleWebhook(storeId: string, topic: string, signature: string, payload: any){
    const s = await this.prisma.wooStore.findFirst({ where: { id: storeId } });
    if(!s) throw new BadRequestException('Store not found');

    const valid = this.verifySignature(payload, s.webhookSecret || undefined, signature);
    await this.prisma.webhookEvent.create({ data: {
      tenantId: s.tenantId,
      storeId: s.id,
      provider: 'woocommerce',
      topic,
      signature: signature || null,
      payload,
      status: valid ? 'received' : 'failed',
      error: valid ? null : 'invalid_signature',
    }});
    if(!valid) return;

    // Basic ingest: keep as event; processing workers can pick it up
    // Optionally, do light transforms here
  }
}