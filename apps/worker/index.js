const { Worker, QueueEvents, Queue } = require('bullmq');
const Redis = require('ioredis');
const client = require('prom-client');
const http = require('http');
const { PrismaClient, Prisma } = require('@prisma/client');

// Initialize Prometheus metrics
client.collectDefaultMetrics();

const jobProcessedCounter = new client.Counter({
  name: 'worker_jobs_processed_total',
  help: 'Total number of jobs processed',
  labelNames: ['job_type', 'status'],
});

const jobDurationHistogram = new client.Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

const syncLagGauge = new client.Gauge({
  name: 'sync_lag_seconds',
  help: 'Sync lag in seconds',
  labelNames: ['account_id', 'entity_type'],
});

// Initialize connections
const connection = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0', {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient();

// Job processors
const jobProcessors = {
  'sync-orders': async (job) => {
    const { accountId } = job.data;
    console.log(`Processing order sync for account ${accountId}`);
    
    // TODO: Import and use SyncService
    // For now, we'll simulate the sync
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`Order sync completed for account ${accountId}`);
    return { success: true, accountId };
  },

  'sync-shipments': async (job) => {
    const { accountId } = job.data;
    console.log(`Processing shipment sync for account ${accountId}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true, accountId };
  },

  'sync-returns': async (job) => {
    const { accountId } = job.data;
    console.log(`Processing return sync for account ${accountId}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, accountId };
  },

  'sync-invoices': async (job) => {
    const { accountId } = job.data;
    console.log(`Processing invoice sync for account ${accountId}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, accountId };
  },

  // WooCommerce sync placeholders
  'woo-sync-orders': async (job) => {
    const { storeId } = job.data;
    const start = Date.now();
    console.log(`Syncing Woo orders for store ${storeId}`);
    const store = await prisma.wooStore.findUnique({ where: { id: storeId } });
    if(!store) { throw new Error('Store not found'); }
    // Determine last sync
    const last = (store.lastSync && store.lastSync.ordersUpdatedAfter) ? store.lastSync.ordersUpdatedAfter : null;
    const since = last ? new Date(last) : new Date(Date.now() - 7*24*60*60*1000);
    const updatedAfter = since.toISOString();
    let page = 1;
    let imported = 0;
    while(true){
      const url = new URL(`/wp-json/wc/${store.apiVersion}/orders`, store.baseUrl);
      url.searchParams.set('per_page', '50');
      url.searchParams.set('page', String(page));
      url.searchParams.set('orderby', 'date_modified');
      url.searchParams.set('order', 'asc');
      url.searchParams.set('modified_after', updatedAfter);
      const res = await fetch(url, { headers: { Authorization: 'Basic '+Buffer.from(store.consumerKey+':'+store.consumerSecret).toString('base64') } });
      if(!res.ok){ throw new Error('Woo HTTP '+res.status); }
      const list = await res.json();
      if(!Array.isArray(list) || list.length===0) break;
      for(const o of list){
        const existing = await prisma.order.findFirst({ where: { tenantId: store.tenantId, externalOrderNo: String(o.number || o.id) } });
        const orderData = {
          tenantId: store.tenantId,
          externalOrderNo: String(o.number || o.id),
          orderSource: 'woo',
          status: String(o.status || 'pending'),
          mappedStatus: String(o.status || 'pending'),
          total: o.total ? new Prisma.Decimal(o.total) : null,
          currency: o.currency || 'TRY',
          customerEmail: o.billing?.email || null,
          customerPhone: o.billing?.phone || null,
          shippingAddress: o.shipping || null,
          billingAddress: o.billing || null,
          paymentMethod: o.payment_method || null,
          confirmedAt: o.date_paid ? new Date(o.date_paid) : (o.date_created ? new Date(o.date_created) : new Date()),
        };
        let orderId = existing?.id;
        if(existing){
          await prisma.order.update({ where: { id: existing.id }, data: { ...orderData, updatedAt: new Date() } });
        } else {
          const created = await prisma.order.create({ data: orderData });
          orderId = created.id;
        }
        imported++;
        // Items
        if(Array.isArray(o.line_items)){
          // simple upsert: delete and recreate items for now
          if(orderId){
            await prisma.orderItem.deleteMany({ where: { orderId } });
            for(const li of o.line_items){
              await prisma.orderItem.create({ data: {
                orderId,
                sku: li.sku || null,
                name: li.name || null,
                qty: Number(li.quantity || 0),
                price: li.total ? new Prisma.Decimal(li.total) : null,
              }});
            }
          }
        }
      }
      page++;
    }
    // update lastSync
    await prisma.wooStore.update({ where: { id: storeId }, data: { lastSync: { ...(store.lastSync||{}), ordersUpdatedAfter: new Date().toISOString() } } });
    const dur = (Date.now()-start)/1000;
    syncLagGauge.set({ account_id: storeId, entity_type: 'orders' }, 0);
    return { success: true, storeId, imported, duration: dur };
  },
  'woo-sync-products': async (job) => {
    const { storeId } = job.data;
    console.log(`Syncing Woo products for store ${storeId}`);
    const store = await prisma.wooStore.findUnique({ where: { id: storeId } });
    if(!store) throw new Error('Store not found');
    let page = 1; let imported = 0;
    while(true){
      const url = new URL(`/wp-json/wc/${store.apiVersion}/products`, store.baseUrl);
      url.searchParams.set('per_page','50');
      url.searchParams.set('page', String(page));
      const res = await fetch(url, { headers: { Authorization: 'Basic '+Buffer.from(store.consumerKey+':'+store.consumerSecret).toString('base64') } });
      if(!res.ok) throw new Error('Woo HTTP '+res.status);
      const list = await res.json();
      if(!Array.isArray(list) || list.length===0) break;
      for(const p of list){
        const existing = await prisma.product.findFirst({ where: { tenantId: store.tenantId, sku: p.sku || String(p.id) } });
        const data = {
          tenantId: store.tenantId,
          sku: p.sku || String(p.id),
          name: p.name || null,
          price: p.price ? new Prisma.Decimal(p.price) : null,
          stock: (typeof p.stock_quantity==='number') ? p.stock_quantity : null,
          images: Array.isArray(p.images) ? p.images.map(i=>i.src).filter(Boolean) : [],
          tags: Array.isArray(p.tags) ? p.tags.map(t=>t.name).filter(Boolean) : [],
          active: p.status !== 'draft' && p.status !== 'trash',
        };
        if(existing){
          await prisma.product.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } });
        } else {
          await prisma.product.create({ data });
        }
        imported++;
      }
      page++;
    }
    return { success: true, storeId, imported };
  },
  'process-webhook-events': async () => {
    // Poll and process pending webhook events
    const pending = await prisma.webhookEvent.findMany({ where: { status: 'received', provider: 'woocommerce' }, take: 50, orderBy: { createdAt: 'asc' } });
    for(const evt of pending){
      try {
        if(evt.topic?.startsWith('order.')){
          const o = evt.payload;
          const store = await prisma.wooStore.findUnique({ where: { id: evt.storeId } });
          if(!store) throw new Error('Store not found for webhook');
          const existing = await prisma.order.findFirst({ where: { tenantId: store.tenantId, externalOrderNo: String(o.number || o.id) } });
          const data = {
            tenantId: store.tenantId,
            externalOrderNo: String(o.number || o.id),
            orderSource: 'woo',
            status: String(o.status || 'pending'),
            mappedStatus: String(o.status || 'pending'),
            total: o.total ? new Prisma.Decimal(o.total) : null,
            currency: o.currency || 'TRY',
            customerEmail: o.billing?.email || null,
            customerPhone: o.billing?.phone || null,
            shippingAddress: o.shipping || null,
            billingAddress: o.billing || null,
            paymentMethod: o.payment_method || null,
            confirmedAt: o.date_paid ? new Date(o.date_paid) : (o.date_created ? new Date(o.date_created) : new Date()),
          };
          let orderId = existing?.id;
          if(existing){
            await prisma.order.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } });
          } else {
            const created = await prisma.order.create({ data });
            orderId = created.id;
          }
          if(orderId && Array.isArray(o.line_items)){
            await prisma.orderItem.deleteMany({ where: { orderId } });
            for(const li of o.line_items){
              await prisma.orderItem.create({ data: {
                orderId,
                sku: li.sku || null,
                name: li.name || null,
                qty: Number(li.quantity || 0),
                price: li.total ? new Prisma.Decimal(li.total) : null,
              }});
            }
          }
        } else if(evt.topic?.startsWith('product.')){
          const p = evt.payload;
          const store = await prisma.wooStore.findUnique({ where: { id: evt.storeId } });
          if(!store) throw new Error('Store not found for webhook');
          const existing = await prisma.product.findFirst({ where: { tenantId: store.tenantId, sku: p.sku || String(p.id) } });
          const data = {
            tenantId: store.tenantId,
            sku: p.sku || String(p.id),
            name: p.name || null,
            price: p.price ? new Prisma.Decimal(p.price) : null,
            stock: (typeof p.stock_quantity==='number') ? p.stock_quantity : null,
            images: Array.isArray(p.images) ? p.images.map(i=>i.src).filter(Boolean) : [],
            tags: Array.isArray(p.tags) ? p.tags.map(t=>t.name).filter(Boolean) : [],
            active: p.status !== 'draft' && p.status !== 'trash',
          };
          if(existing){
            await prisma.product.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } });
          } else {
            await prisma.product.create({ data });
          }
        }
        await prisma.webhookEvent.update({ where: { id: evt.id }, data: { status: 'processed', processedAt: new Date(), attempts: { increment: 1 } } });
      } catch (err) {
        console.error('webhook event failed', evt.id, err);
        await prisma.webhookEvent.update({ where: { id: evt.id }, data: { status: 'failed', error: String(err?.message || err), attempts: { increment: 1 } } });
      }
    }
    return { success: true, processed: pending.length };
  },
  'woo-schedule': async () => {
    const stores = await prisma.wooStore.findMany({ where: { active: true } });
    const q = new Queue('fx-jobs', { connection });
    for(const s of stores){
      await q.add('woo-sync-orders', { storeId: s.id }, { repeat: { pattern: '*/10 * * * *' }, jobId: `woo-sync-orders:${s.id}`, removeOnComplete: true });
      await q.add('woo-sync-products', { storeId: s.id }, { repeat: { pattern: '*/30 * * * *' }, jobId: `woo-sync-products:${s.id}`, removeOnComplete: true });
    }
    await q.close();
    return { success: true, stores: stores.length };
  },

  'process-request': async (job) => {
    const { requestId, action } = job.data;
    console.log(`Processing request ${requestId} with action ${action}`);
    
    // Process the request based on action
    switch (action) {
      case 'approve':
        // Apply approved changes
        break;
      case 'reject':
        // Handle rejection
        break;
    }
    
    return { success: true, requestId, action };
  },

  'cleanup-cache': async (job) => {
    console.log('Running cache cleanup');
    
    // Clean expired cache entries
    const redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
    
    // Get all cache keys
    const keys = await redis.keys('cache:*');
    let cleaned = 0;
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // No expiry set, clean if older than 1 hour
        await redis.expire(key, 3600);
        cleaned++;
      }
    }
    
    await redis.quit();
    console.log(`Cleaned ${cleaned} cache entries`);
    
    return { success: true, cleaned };
  },

  'cleanup-sessions': async (job) => {
    console.log('Cleaning expired sessions');
    
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    
    console.log(`Deleted ${result.count} expired sessions`);
    
    return { success: true, deleted: result.count };
  },

  'generate-report': async (job) => {
    const { tenantId, reportType, params } = job.data;
    console.log(`Generating ${reportType} report for tenant ${tenantId}`);
    
    // Generate report based on type
    // This would typically generate a file and upload to MinIO
    
    return { success: true, reportType, tenantId };
  },
  'sync-google-calendar': async (job) => {
    const { tenantId } = job.data;
    console.log(`Syncing Google Calendar for tenant ${tenantId}`);
    // TODO: fetch OAuth creds from API or DB and sync events
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, tenantId };
  },
  'email-stats': async (job) => {
    const { tenantId, period } = job.data;
    console.log(`Emailing stats ${period} for tenant ${tenantId}`);
    // TODO: call API to get stats and send email via SMTP provider
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, tenantId, period };
  },
};

// Create worker
const worker = new Worker('fx-jobs', async (job) => {
  const startTime = Date.now();
  
  try {
    // Get processor for job type
    const processor = jobProcessors[job.name];
    
    if (!processor) {
      throw new Error(`Unknown job type: ${job.name}`);
    }
    
    // Process job
    const result = await processor(job);
    
    // Record metrics
    const duration = (Date.now() - startTime) / 1000;
    jobDurationHistogram.observe({ job_type: job.name }, duration);
    jobProcessedCounter.inc({ job_type: job.name, status: 'success' });
    
    return result;
  } catch (error) {
    console.error(`Job ${job.name} failed:`, error);
    
    // Record failure metric
    jobProcessedCounter.inc({ job_type: job.name, status: 'failure' });
    
    throw error;
  }
}, {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Create queue for scheduling
const schedulerQueue = new Queue('fx-jobs', { connection });

// Schedule recurring jobs
async function scheduleRecurringJobs() {
  // Clean cache every hour
  await schedulerQueue.add('cleanup-cache', {}, {
    repeat: { pattern: '0 * * * *' },
    removeOnComplete: true,
  });

  // Clean sessions every 6 hours
  await schedulerQueue.add('cleanup-sessions', {}, {
    repeat: { pattern: '0 */6 * * *' },
    removeOnComplete: true,
  });

  // Google calendar sync every 30 minutes
  await schedulerQueue.add('sync-google-calendar', { tenantId: 'ALL' }, {
    repeat: { every: 30 * 60 * 1000 },
    removeOnComplete: true,
  });

  // Weekly stats email every Monday 08:00
  await schedulerQueue.add('email-stats', { tenantId: 'ALL', period: 'weekly' }, {
    repeat: { pattern: '0 8 * * 1' },
    removeOnComplete: true,
  });

  // Process webhook events every minute
  await schedulerQueue.add('process-webhook-events', {}, {
    repeat: { pattern: '*/1 * * * *' },
    removeOnComplete: true,
  });

  console.log('Recurring jobs scheduled');
}

// Queue events listener
const events = new QueueEvents('fx-jobs', { connection });

events.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed`);
});

events.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});

// Worker events
worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed:`, err);
});

// Health check and metrics server
const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } else if (req.url === '/health') {
    // Check worker health
    const isHealthy = worker.isRunning() && !worker.closing;
    
    if (isHealthy) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        uptime: process.uptime(),
        activeJobs: (await worker.getJobs()).length,
      }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy' }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('Worker metrics server listening on port 3001');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  server.close();
  
  process.exit(0);
});

// Start worker
async function start() {
  console.log('Worker starting...');
  await scheduleRecurringJobs();
  // Schedule Woo periodic syncs for all active stores
  try {
    const q = new Queue('fx-jobs', { connection });
    const stores = await prisma.wooStore.findMany({ where: { active: true } });
    for(const s of stores){
      await q.add('woo-sync-orders', { storeId: s.id }, { repeat: { pattern: '*/10 * * * *' }, jobId: `woo-sync-orders:${s.id}`, removeOnComplete: true });
      await q.add('woo-sync-products', { storeId: s.id }, { repeat: { pattern: '*/30 * * * *' }, jobId: `woo-sync-products:${s.id}`, removeOnComplete: true });
    }
    await q.close();
  } catch (e) {
    console.error('Failed to schedule Woo periodic syncs:', e);
  }
  console.log('Worker ready and processing jobs');
}

start().catch(err => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});