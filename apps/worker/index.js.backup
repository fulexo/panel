const { Worker, QueueEvents, Queue } = require('bullmq');
const Redis = require('ioredis');
const client = require('prom-client');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

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
        activeJobs: await worker.getJobCounts(),
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
  console.log('Worker ready and processing jobs');
}

start().catch(err => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});