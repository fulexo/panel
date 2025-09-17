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
    return this.prisma.withTenant(tenantId, async (tx) => 
      tx.wooStore.findMany({ orderBy: { createdAt: 'desc' } })
    );
  }

  async addStore(tenantId: string, dto: { name: string; baseUrl: string; consumerKey: string; consumerSecret: string; apiVersion?: string; webhookSecret?: string; }){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const store = await tx.wooStore.create({ data: {
        tenant: {
          connect: { id: tenantId }
        },
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
        const connection = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0', { maxRetriesPerRequest: null });
        const q = new Queue('fx-jobs', { connection });
        await q.add('woo-sync-orders', { storeId: store.id });
        await q.add('woo-sync-products', { storeId: store.id });
        await q.close();
        await connection.quit();
      } catch {
        // noop if queue unavailable
      }
      return store;
    });
  }

  async removeStore(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      await tx.wooStore.delete({ where: { id } });
      return { ok: true };
    });
  }

  async testConnection(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      const url = `${s.baseUrl}/wp-json/wc/${s.apiVersion}/orders?per_page=1`;
      const r = await fetch(url, { headers: { Authorization: buildAuthHeader(s.consumerKey, s.consumerSecret) } } as any);
      return { ok: r.ok, status: r.status };
    });
  }

  async registerWebhooks(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      const topics = [
        'order.created','order.updated','product.created','product.updated','product.deleted'
      ];
      const results: Record<string, unknown>[] = [];
      for(const topic of topics){
        const body = {
          name: `fx-${topic}`,
          topic,
          delivery_url: `https://${process.env['DOMAIN_API'] || 'api.example.com'}/api/woo/webhooks/${id}`,
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
    });
  }

  private verifySignature(payload: string | Record<string, unknown>, secret?: string, signature?: string){
    if (!secret) return true; // allow if no secret configured
    if (!signature) return false;
    try{
      // Use raw payload string instead of JSON.stringify
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computed = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(String(signature)));
    }catch{
      return false;
    }
  }

  async handleWebhook(storeId: string, topic: string, signature: string, payload: string | Record<string, unknown>, rawBody?: string){
    const s = await this.prisma.wooStore.findFirst({ where: { id: storeId } });
    if(!s) throw new BadRequestException('Store not found');

    const valid = this.verifySignature(rawBody || payload, s.webhookSecret || undefined, signature);
    await this.prisma.webhookEvent.create({ data: {
      tenantId: s.tenantId,
      storeId: s.id,
      provider: 'woocommerce',
      topic,
      signature: signature || null,
      payload: payload as any,
      status: valid ? 'received' : 'failed',
      error: valid ? null : 'invalid_signature',
    }});
    if(!valid) return;

    // Basic ingest: keep as event; processing workers can pick it up
    // Optionally, do light transforms here
  }
}