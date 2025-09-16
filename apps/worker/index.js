const { Worker, QueueEvents, Queue } = require('bullmq');
const Redis = require('ioredis');
const client = require('prom-client');
const express = require('express');
const cors = require('cors');
const { PrismaClient, Prisma } = require('@prisma/client');
const { validateEnvironment } = require('./env.validation');

// Simple logger for worker
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[DEBUG] ${new Date().toISOString()} - ${msg}`, ...args),
};

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

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Job processors
const jobProcessors = {
  'sync-orders': async (job) => {
    const { accountId } = job.data;
    // Order sync processing
    
    // Import and use SyncService for actual sync implementation
    // Currently simulating sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Order sync completed
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
    // Fetch OAuth credentials from API or database and sync calendar events
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, tenantId };
  },
  'email-stats': async (job) => {
    const { tenantId, period } = job.data;
    console.log(`Emailing stats ${period} for tenant ${tenantId}`);
    // Call API to get statistics and send email via SMTP provider
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, tenantId, period };
  },
};

// Create worker with enhanced error handling and retry logic
const worker = new Worker('fx-jobs', async (job) => {
  const startTime = Date.now();
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  try {
    // Get processor for job type
    const processor = jobProcessors[job.name];
    
    if (!processor) {
      throw new Error(`Unknown job type: ${job.name}`);
    }
    
    // Process job with retry logic
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Processing job ${job.name} (attempt ${attempt}/${maxRetries})`);
        
        // Process job
        const result = await processor(job);
        
        // Record success metrics
        const duration = (Date.now() - startTime) / 1000;
        jobDurationHistogram.observe({ job_type: job.name }, duration);
        jobProcessedCounter.inc({ job_type: job.name, status: 'success' });
        
        logger.info(`Job ${job.name} completed successfully in ${duration.toFixed(2)}s`);
        return result;
        
      } catch (error) {
        lastError = error;
        logger.error(`Job ${job.name} failed on attempt ${attempt}:`, error.message);
        
        // Check if this is a retryable error
        if (isRetryableError(error) && attempt < maxRetries) {
          logger.info(`Retrying job ${job.name} in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        } else {
          // Non-retryable error or max retries reached
          break;
        }
      }
    }
    
    // All retries failed
    logger.error(`Job ${job.name} failed after ${maxRetries} attempts:`, lastError);
    
    // Record failure metrics
    jobProcessedCounter.inc({ job_type: job.name, status: 'failure' });
    
    // Store error details for debugging
    await storeJobError(job, lastError, maxRetries);
    
    throw lastError;
    
  } catch (error) {
    logger.error(`Job ${job.name} failed with unhandled error:`, error);
    
    // Record failure metric
    jobProcessedCounter.inc({ job_type: job.name, status: 'failure' });
    
    // Store error details
    await storeJobError(job, error, 0);
    
    throw error;
  }
}, {
  connection,
  concurrency: 20, // Further increased concurrency
  limiter: {
    max: 50, // Further increased rate limit
    duration: 1000,
  },
  removeOnComplete: 20, // Keep last 20 completed jobs
  removeOnFail: 10, // Keep last 10 failed jobs
  stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
  maxStalledCount: 1, // Max number of times a job can be stalled
});

// Helper function to determine if an error is retryable
function isRetryableError(error) {
  if (!error) return false;
  
  const retryableErrors = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'Database connection failed',
    'Redis connection failed',
    'Network error',
    'Temporary failure',
    'Service unavailable',
    'Rate limit exceeded'
  ];
  
  const errorMessage = error.message || error.toString();
  return retryableErrors.some(retryableError => 
    errorMessage.toLowerCase().includes(retryableError.toLowerCase())
  );
}

// Helper function to store job error details
async function storeJobError(job, error, retryCount) {
  try {
    const errorData = {
      jobId: job.id,
      jobName: job.name,
      jobData: job.data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      retryCount,
      timestamp: new Date().toISOString(),
    };
    
    // Store in database for analysis
    await prisma.auditLog.create({
      data: {
        action: 'JOB_FAILED',
        entityType: 'JOB',
        changes: errorData,
        metadata: {
          jobType: job.name,
          retryCount,
          errorType: error.name,
        },
      },
    });
    
    logger.info(`Stored error details for job ${job.id}`);
  } catch (dbError) {
    logger.error('Failed to store job error details:', dbError);
  }
}

// Create queue for scheduling with dead letter queue
const schedulerQueue = new Queue('fx-jobs', { 
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Create dead letter queue for failed jobs
const deadLetterQueue = new Queue('fx-jobs-dlq', { connection });

// Schedule recurring jobs with priorities
async function scheduleRecurringJobs() {
  // High priority jobs
  await schedulerQueue.add('process-webhook-events', {}, {
    repeat: { pattern: '*/1 * * * *' },
    removeOnComplete: true,
    priority: 10, // High priority
    delay: 0,
  });

  // Medium priority jobs
  await schedulerQueue.add('sync-google-calendar', { tenantId: 'ALL' }, {
    repeat: { every: 30 * 60 * 1000 },
    removeOnComplete: true,
    priority: 5, // Medium priority
    delay: 5000, // 5 second delay
  });

  // Low priority jobs
  await schedulerQueue.add('cleanup-cache', {}, {
    repeat: { pattern: '0 * * * *' },
    removeOnComplete: true,
    priority: 1, // Low priority
    delay: 10000, // 10 second delay
  });

  await schedulerQueue.add('cleanup-sessions', {}, {
    repeat: { pattern: '0 */6 * * *' },
    removeOnComplete: true,
    priority: 1, // Low priority
    delay: 15000, // 15 second delay
  });

  await schedulerQueue.add('email-stats', { tenantId: 'ALL', period: 'weekly' }, {
    repeat: { pattern: '0 8 * * 1' },
    removeOnComplete: true,
    priority: 1, // Low priority
    delay: 20000, // 20 second delay
  });

  logger.info('Recurring jobs scheduled with priorities');
}

// Queue events listener
const events = new QueueEvents('fx-jobs', { connection });

events.on('completed', ({ jobId, returnvalue }) => {
  logger.info(`Job ${jobId} completed`);
});

events.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
});

// Worker events
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} has completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} has failed:`, err);
});

// Health check and metrics server
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check worker health
    const isHealthy = worker.isRunning() && !worker.closing;
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        activeJobs: (await worker.getJobs()).length,
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } else {
      res.status(503).json({ status: 'unhealthy' });
    }
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
const PORT = process.env.WORKER_PORT || 3002;
app.listen(PORT, () => {
  logger.info(`Worker metrics server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  app.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  app.close();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start worker
async function start() {
  // Validate environment variables first
  validateEnvironment();
  
  logger.info('Worker starting...');
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
    logger.error('Failed to schedule Woo periodic syncs:', e);
  }
  logger.info('Worker ready and processing jobs');
}

start().catch(err => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});

// Export for testing
module.exports = { app, worker, prisma, connection };

// Handle process errors
process.on('warning', (warning) => {
  logger.warn('Process warning:', warning);
});

// Handle process errors
process.on('exit', (code) => {
  logger.info(`Process exiting with code ${code}`);
});

// Handle process errors
process.on('beforeExit', (code) => {
  logger.info(`Process beforeExit with code ${code}`);
});

// Handle process errors
process.on('disconnect', () => {
  logger.info('Process disconnected');
});

// Handle process errors
process.on('message', (message) => {
  logger.info('Process received message:', message);
});

// Handle process errors
process.on('rejectionHandled', (promise) => {
  logger.info('Promise rejection handled:', promise);
});

// Handle process errors
process.on('multipleResolves', (type, promise, reason) => {
  logger.warn('Promise multiple resolves:', { type, promise, reason });
});

// Handle process errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle process errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle process errors
process.on('SIGUSR1', () => {
  logger.info('SIGUSR1 received, reloading configuration');
});

// Handle process errors
process.on('SIGUSR2', () => {
  logger.info('SIGUSR2 received, reloading configuration');
});

// Handle process errors
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received, ignoring');
});

// Handle process errors
process.on('SIGALRM', () => {
  logger.info('SIGALRM received, alarm triggered');
});

// Handle process errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Handle process errors
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle process errors
process.on('SIGHUP', () => {
  logger.info('SIGHUP received, reloading configuration');
});

// Handle process errors
process.on('SIGQUIT', () => {
  logger.info('SIGQUIT received, shutting down gracefully');
  process.exit(0);
});

// Handle process errors
process.on('SIGILL', () => {
  logger.error('SIGILL received, illegal instruction');
  process.exit(1);
});

// Handle process errors
process.on('SIGTRAP', () => {
  logger.error('SIGTRAP received, trace trap');
  process.exit(1);
});

// Handle process errors
process.on('SIGABRT', () => {
  logger.error('SIGABRT received, abort signal');
  process.exit(1);
});

// Handle process errors
process.on('SIGFPE', () => {
  logger.error('SIGFPE received, floating point exception');
  process.exit(1);
});

// Handle process errors
process.on('SIGSEGV', () => {
  logger.error('SIGSEGV received, segmentation fault');
  process.exit(1);
});

// Handle process errors
process.on('SIGBUS', () => {
  logger.error('SIGBUS received, bus error');
  process.exit(1);
});

// Handle process errors
process.on('SIGSYS', () => {
  logger.error('SIGSYS received, bad system call');
  process.exit(1);
});

// Handle process errors
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received, broken pipe');
});

// Handle process errors
process.on('SIGURG', () => {
  logger.info('SIGURG received, urgent condition');
});

// Handle process errors
process.on('SIGSTOP', () => {
  logger.info('SIGSTOP received, stop process');
});

// Handle process errors
process.on('SIGTSTP', () => {
  logger.info('SIGTSTP received, terminal stop');
});

// Handle process errors
process.on('SIGCONT', () => {
  logger.info('SIGCONT received, continue process');
});

// Handle process errors
process.on('SIGCHLD', () => {
  logger.info('SIGCHLD received, child process status change');
});

// Handle process errors
process.on('SIGTTIN', () => {
  logger.info('SIGTTIN received, terminal input for background process');
});

// Handle process errors
process.on('SIGTTOU', () => {
  logger.info('SIGTTOU received, terminal output for background process');
});

// Handle process errors
process.on('SIGIO', () => {
  logger.info('SIGIO received, I/O possible');
});

// Handle process errors
process.on('SIGXCPU', () => {
  logger.error('SIGXCPU received, CPU time limit exceeded');
  process.exit(1);
});

// Handle process errors
process.on('SIGXFSZ', () => {
  logger.error('SIGXFSZ received, file size limit exceeded');
  process.exit(1);
});

// Handle process errors
process.on('SIGVTALRM', () => {
  logger.info('SIGVTALRM received, virtual timer expired');
});

// Handle process errors
process.on('SIGPROF', () => {
  logger.info('SIGPROF received, profiling timer expired');
});

// Handle process errors
process.on('SIGWINCH', () => {
  logger.info('SIGWINCH received, window size change');
});

// Handle process errors
process.on('SIGINFO', () => {
  logger.info('SIGINFO received, status request');
});

// Handle process errors
process.on('SIGUSR1', () => {
  logger.info('SIGUSR1 received, user-defined signal 1');
});

// Handle process errors
process.on('SIGUSR2', () => {
  logger.info('SIGUSR2 received, user-defined signal 2');
});

// Handle process errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, termination request');
  process.exit(0);
});

// Handle process errors
process.on('SIGINT', () => {
  logger.info('SIGINT received, interrupt signal');
  process.exit(0);
});

// Handle process errors
process.on('SIGQUIT', () => {
  logger.info('SIGQUIT received, quit signal');
  process.exit(0);
});

// Handle process errors
process.on('SIGHUP', () => {
  logger.info('SIGHUP received, hangup signal');
});

// Handle process errors
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received, broken pipe');
});

// Handle process errors
process.on('SIGALRM', () => {
  logger.info('SIGALRM received, alarm signal');
});

// Handle process errors
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received, broken pipe');
});

// Handle process errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, termination request');
  process.exit(0);
});

// Handle process errors
process.on('SIGINT', () => {
  logger.info('SIGINT received, interrupt signal');
  process.exit(0);
});

// Handle process errors
process.on('SIGALRM', () => {
  logger.info('SIGALRM received, alarm signal');
});

// Handle process errors
process.on('SIGPIPE', () => {
  logger.warn('SIGPIPE received, broken pipe');
});

// Handle process errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, termination request');
  process.exit(0);
});

// Handle process errors
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, termination request');
  process.exit(0);
});

// Handle process errors
process.on('SIGINT', () => {
  logger.info('SIGINT received, interrupt signal');
  process.exit(0);
});