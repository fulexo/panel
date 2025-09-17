/**
 * @fileoverview Fulexo Worker Service
 * @description Background job processor for Fulexo platform that handles:
 * - WooCommerce data synchronization
 * - Order, product, and shipment processing
 * - Webhook event processing
 * - Cache cleanup and maintenance tasks
 * - Report generation and email notifications
 * @author Fulexo Team
 * @version 1.0.0
 */

import { Worker, QueueEvents, Queue } from 'bullmq';
import Redis from 'ioredis';
import * as client from 'prom-client';
import express from 'express';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
// import { validateEnvOnStartup } from './env.validation.js';
import { logger } from './lib/logger';
import fetch from 'node-fetch';

/**
 * Initialize Prometheus metrics collection
 * Collects default Node.js metrics (memory, CPU, etc.)
 */
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
const connection = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0', {
  maxRetriesPerRequest: null,
});

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env['DATABASE_URL']!
    }
  }
});

// Job processors
const jobProcessors = {
  'sync-orders': async (job: { data: Record<string, unknown> }) => {
    try {
      const { accountId } = job.data;
      if (!accountId) {
        throw new Error('Account ID is required for sync-orders job');
      }
      
      // Order sync processing
      logger.info(`Starting order sync for account: ${accountId}`);
      
      // Import and use SyncService for actual sync implementation
      // Currently simulating sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info(`Order sync completed for account: ${accountId}`);
      return { success: true, accountId };
    } catch (error) {
      logger.error(`Order sync failed for account ${job.data?.['accountId']}:`, error);
      throw error;
    }
  },

  'sync-shipments': async (job: { data: Record<string, unknown> }) => {
    try {
      const { accountId } = job.data;
      if (!accountId) {
        throw new Error('Account ID is required for sync-shipments job');
      }
      
      logger.info(`Starting shipment sync for account: ${accountId}`);
      
      // Processing shipment sync for account
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      logger.info(`Shipment sync completed for account: ${accountId}`);
      return { success: true, accountId };
    } catch (error) {
      logger.error(`Shipment sync failed for account ${job.data?.['accountId']}:`, error);
      throw error;
    }
  },

  'sync-returns': async (job: { data: Record<string, unknown> }) => {
    try {
      const { accountId } = job.data;
      if (!accountId) {
        throw new Error('Account ID is required for sync-returns job');
      }
      
      logger.info(`Starting return sync for account: ${accountId}`);
      
      // Processing return sync for account
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info(`Return sync completed for account: ${accountId}`);
      return { success: true, accountId };
    } catch (error) {
      logger.error(`Return sync failed for account ${job.data?.['accountId']}:`, error);
      throw error;
    }
  },

  'sync-invoices': async (job: { data: Record<string, unknown> }) => {
    try {
      const { accountId } = job.data;
      if (!accountId) {
        throw new Error('Account ID is required for sync-invoices job');
      }
      
      logger.info(`Starting invoice sync for account: ${accountId}`);
      
      // Processing invoice sync for account
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info(`Invoice sync completed for account: ${accountId}`);
      return { success: true, accountId };
    } catch (error) {
      logger.error(`Invoice sync failed for account ${job.data?.['accountId']}:`, error);
      throw error;
    }
  },

  // WooCommerce sync placeholders
  'woo-sync-orders': async (job: { data: Record<string, unknown> }) => {
    const { storeId } = job.data;
    if (!storeId) {
      throw new Error('Store ID is required for woo-sync-orders job');
    }
    
    const start = Date.now();
    // Syncing WooCommerce orders for store
    const store = await prisma.wooStore.findUnique({ where: { id: storeId } });
    if(!store) { 
      throw new Error(`Store not found with ID: ${storeId}`); 
    }
    // Determine last sync
    const last = (store.lastSync && store.lastSync.ordersUpdatedAfter) ? store.lastSync.ordersUpdatedAfter : null;
    const since = last ? new Date(last) : new Date(Date.now() - 7*24*60*60*1000);
    const updatedAfter = since.toISOString();
    let page = 1;
    let imported = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    
    while(page <= maxPages){
      const url = new URL(`/wp-json/wc/${store.apiVersion}/orders`, store.baseUrl);
      url.searchParams.set('per_page', '50');
      url.searchParams.set('page', String(page));
      url.searchParams.set('orderby', 'date_modified');
      url.searchParams.set('order', 'asc');
      url.searchParams.set('modified_after', updatedAfter);
      
      const res = await fetch(url, {
        headers: { Authorization: 'Basic '+Buffer.from(store.consumerKey+':'+store.consumerSecret).toString('base64') },
        timeout: 30000 // 30 second timeout
      } as Record<string, unknown>);
      
      if(!res.ok){ 
        logger.error(`WooCommerce API error: ${res.status} ${res.statusText}`);
        throw new Error('Woo HTTP '+res.status); 
      }
      
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
          total: o.total ? new Decimal(o.total) : null,
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
                price: li.total ? new Decimal(li.total) : null,
              }});
            }
          }
        }
      }
      page++;
      
      // Add delay between requests to avoid rate limiting
      if (page <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }
    // update lastSync
    await prisma.wooStore.update({ where: { id: storeId }, data: { lastSync: { ...(store.lastSync||{}), ordersUpdatedAfter: new Date().toISOString() } } });
    const dur = (Date.now()-start)/1000;
    syncLagGauge.set({ account_id: storeId as string, entity_type: 'orders' }, 0);
    return { success: true, storeId, imported, duration: dur };
  },
  'woo-sync-products': async (job: { data: Record<string, unknown> }) => {
    const { storeId } = job.data;
    if (!storeId) {
      throw new Error('Store ID is required for woo-sync-products job');
    }
    
    // Syncing WooCommerce products for store
    const store = await prisma.wooStore.findUnique({ where: { id: storeId } });
    if(!store) { 
      throw new Error(`Store not found with ID: ${storeId}`); 
    }
    let page = 1; 
    let imported = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    
    while(page <= maxPages){
      const url = new URL(`/wp-json/wc/${store.apiVersion}/products`, store.baseUrl);
      url.searchParams.set('per_page','50');
      url.searchParams.set('page', String(page));
      const res = await fetch(url, {
        headers: { Authorization: 'Basic '+Buffer.from(store.consumerKey+':'+store.consumerSecret).toString('base64') },
        timeout: 30000 // 30 second timeout
      } as Record<string, unknown>);
      if(!res.ok) { 
        logger.error(`WooCommerce API error: ${res.status} ${res.statusText}`);
        throw new Error('Woo HTTP '+res.status); 
      }
      const list = await res.json();
      if(!Array.isArray(list) || list.length===0) break;
      for(const p of list){
        const existing = await prisma.product.findFirst({ where: { tenantId: store.tenantId, sku: p.sku || String(p.id) } });
        const data = {
          tenantId: store.tenantId,
          sku: p.sku || String(p.id),
          name: p.name || null,
          price: p.price ? new (Prisma as Record<string, unknown>).Decimal(p.price) : null,
          stock: (typeof p.stock_quantity==='number') ? p.stock_quantity : null,
          images: Array.isArray(p.images) ? p.images.map((i: Record<string, unknown>)=>i.src).filter(Boolean) : [],
          tags: Array.isArray(p.tags) ? p.tags.map((t: Record<string, unknown>)=>t.name).filter(Boolean) : [],
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
      
      // Add delay between requests to avoid rate limiting
      if (page <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }
    }
    return { success: true, storeId, imported };
  },
  'process-webhook-events': async () => {
    // Poll and process pending webhook events
    const pending = await prisma.webhookEvent.findMany({ 
      where: { status: 'received', provider: 'woocommerce' }, 
      take: 50, 
      orderBy: { createdAt: 'asc' } 
    });
    
    if (!pending || pending.length === 0) {
      return { success: true, processed: 0 };
    }
    
    for(const evt of pending){
      if (!evt.id || !evt.topic || !evt.payload) {
        logger.warn('Invalid webhook event, skipping:', evt);
        continue;
      }
      
      try {
        if(evt.topic.startsWith('order.')){
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
            total: o.total ? new Decimal(o.total) : null,
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
                price: li.total ? new Decimal(li.total) : null,
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
            price: p.price ? new Decimal(p.price) : null,
            stock: (typeof p.stock_quantity==='number') ? p.stock_quantity : null,
            images: Array.isArray(p.images) ? p.images.map((i: Record<string, unknown>)=>i['src'] as string).filter(Boolean) : [],
            tags: Array.isArray(p.tags) ? p.tags.map((t: Record<string, unknown>)=>t['name'] as string).filter(Boolean) : [],
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
        // Webhook event failed
        await prisma.webhookEvent.update({ where: { id: evt.id }, data: { status: 'failed', error: String((err as Record<string, unknown>)?.message || err), attempts: { increment: 1 } } });
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

  'process-request': async (job: Record<string, unknown>) => {
    const { requestId, action } = job.data;
    
    if (!requestId || !action) {
      throw new Error('Request ID and action are required');
    }
    
    // Get the request from database
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { creator: true, tenant: true }
    });
    
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }
    
    // Process the request based on action
    switch (action) {
      case 'approve':
        await prisma.request.update({
          where: { id: requestId },
          data: { 
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewerUserId: job.data.reviewerUserId
          }
        });
        
        // Apply approved changes based on request type
        await applyRequestChanges(request);
        break;
        
      case 'reject':
        await prisma.request.update({
          where: { id: requestId },
          data: { 
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewerUserId: job.data.reviewerUserId
          }
        });
        
        // Send rejection notification
        await sendRejectionNotification(request);
        break;
        
      case 'apply':
        await prisma.request.update({
          where: { id: requestId },
          data: { 
            status: 'APPLIED',
            appliedAt: new Date()
          }
        });
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    logger.info(`Request ${requestId} processed with action: ${action}`);
    return { success: true, requestId, action };
  },

  'cleanup-cache': async (_job: { data: Record<string, unknown> }) => {
    // Running cache cleanup
    
    // Use existing connection instead of creating new one
    try {
      // Get all cache keys
      const keys = await connection.keys('cache:*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await connection.ttl(key);
        if (ttl === -1) {
          // No expiry set, clean if older than 1 hour
          await connection.expire(key, 3600);
          cleaned++;
        }
      }
      
      logger.info(`Cache cleanup completed: ${cleaned} keys processed`);
      return { success: true, cleaned };
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      throw error;
    }
  },

  'cleanup-sessions': async (_job: { data: Record<string, unknown> }) => {
    // Cleaning expired sessions
    
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    
    // Expired sessions cleanup completed
    
    return { success: true, deleted: result.count };
  },

  'generate-report': async (job: { data: Record<string, unknown> }) => {
    const { tenantId, reportType } = job.data;
    // Generating report for tenant
    
    // Generate report based on type
    // This would typically generate a file and upload to MinIO
    
    return { success: true, reportType, tenantId };
  },
  'sync-google-calendar': async (job: { data: Record<string, unknown> }) => {
    const { tenantId } = job.data;
    // Syncing Google Calendar for tenant
    // Fetch OAuth credentials from API or database and sync calendar events
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, tenantId };
  },
  'email-stats': async (job: { data: Record<string, unknown> }) => {
    const { tenantId, period } = job.data;
    // Email stats for tenant
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
    const processor = jobProcessors[job.name as keyof typeof jobProcessors];
    
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
        logger.error(`Job ${job.name} failed on attempt ${attempt}:`, error instanceof Error ? error.message : String(error));
        
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
    await storeJobError(job as Record<string, unknown>, lastError, maxRetries);
    
    throw lastError;
    
  } catch (error) {
    logger.error(`Job ${job.name} failed with unhandled error:`, error);
    
    // Record failure metric
    jobProcessedCounter.inc({ job_type: job.name, status: 'failure' });
    
    // Store error details
    await storeJobError(job as Record<string, unknown>, error, 0);
    
    throw error;
  }
}, {
  connection,
  concurrency: 20, // Further increased concurrency
  limiter: {
    max: 50, // Further increased rate limit
    duration: 1000,
  },
  removeOnComplete: { count: 20 }, // Keep last 20 completed jobs
  removeOnFail: { count: 10 }, // Keep last 10 failed jobs
  stalledInterval: 30 * 1000, // Check for stalled jobs every 30 seconds
  maxStalledCount: 1, // Max number of times a job can be stalled
});

// Helper function to apply request changes
async function applyRequestChanges(request: Record<string, unknown>) {
  const { type, payload } = request;
  
  switch (type) {
    case 'STOCK_ADJUSTMENT':
      if (payload.productId && payload.quantity) {
        await prisma.stockMovement.create({
          data: {
            productId: payload.productId,
            type: 'ADJUSTMENT',
            quantity: payload.quantity,
            relatedId: request.id
          }
        });
        
        // Update product stock
        await prisma.product.update({
          where: { id: payload.productId },
          data: {
            stock: { increment: payload.quantity }
          }
        });
      }
      break;
      
    case 'NEW_PRODUCT':
      if (payload.productData) {
        await prisma.product.create({
          data: {
            ...payload.productData,
            tenantId: request.tenantId
          }
        });
      }
      break;
      
    case 'ORDER_NOTE':
      if (payload.orderId && payload.note) {
        await prisma.order.update({
          where: { id: payload.orderId },
          data: {
            notes: payload.note
          }
        });
      }
      break;
      
    default:
      logger.warn(`Unknown request type: ${type}`);
  }
}

// Helper function to send rejection notification
async function sendRejectionNotification(request: Record<string, unknown>) {
  // This would integrate with your notification system
  logger.info(`Sending rejection notification for request ${request['id']}`);
  // Implementation would depend on your notification service
}

// Helper function to determine if an error is retryable
function isRetryableError(error: unknown) {
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
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  return retryableErrors.some(retryableError => 
    errorMessage.toLowerCase().includes(retryableError.toLowerCase())
  );
}

// Helper function to store job error details
async function storeJobError(job: Record<string, unknown>, error: unknown, retryCount: number) {
  try {
    const errorData = {
      jobId: job['id'],
      jobName: job['name'],
      jobData: job['data'],
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
          jobType: job['name'],
          retryCount,
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
      },
    });
    
    logger.info(`Stored error details for job ${job['id']}`);
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
// const deadLetterQueue = new Queue('fx-jobs-dlq', { connection });

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

events.on('completed', ({ jobId }) => {
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
  logger.error(`Job ${job?.id} has failed:`, err);
});

// Health check and metrics server
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Check worker health
    const isHealthy = worker.isRunning() && !worker.closing;
    
    // Check database connection
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      logger.error('Database health check failed:', error);
    }
    
    // Check Redis connection
    let redisHealthy = false;
    try {
      await connection.ping();
      redisHealthy = true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
    }
    
    const overallHealthy = isHealthy && dbHealthy && redisHealthy;
    
    if (overallHealthy) {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        activeJobs: 0, // (await worker.getJobs()).length,
        memory: process.memoryUsage(),
        version: process.env['npm_package_version'] || '1.0.0',
        checks: {
          worker: isHealthy,
          database: dbHealthy,
          redis: redisHealthy,
        }
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy',
        checks: {
          worker: isHealthy,
          database: dbHealthy,
          redis: redisHealthy,
        }
      });
    }
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
const PORT = process.env['WORKER_PORT'] || 3002;
app.listen(PORT, () => {
  logger.info(`Worker metrics server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  // app.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  // app.close();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start worker
async function start() {
  // Validate environment variables first
  try {
    // validateEnvOnStartup();
  } catch (error) {
    logger.error('Environment validation failed:', (error as Record<string, unknown>).message);
    process.exit(1);
  }
  
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
export { app, worker, prisma, connection };

// Process event handlers (consolidated)
process.on('warning', (warning) => {
  logger.warn('Process warning:', warning);
});

process.on('exit', (code) => {
  logger.info(`Process exiting with code ${code}`);
});

process.on('beforeExit', (code) => {
  logger.info(`Process beforeExit with code ${code}`);
});

process.on('disconnect', () => {
  logger.info('Process disconnected');
});

process.on('message', (message) => {
  logger.info('Process received message:', message);
});

process.on('rejectionHandled', (promise) => {
  logger.info('Promise rejection handled:', promise);
});

process.on('multipleResolves', (type, promise, reason) => {
  logger.warn('Promise multiple resolves:', { type, promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGHUP', () => {
  logger.info('SIGHUP received, reloading configuration');
});

process.on('SIGQUIT', () => {
  logger.info('SIGQUIT received, shutting down gracefully');
  process.exit(0);
});