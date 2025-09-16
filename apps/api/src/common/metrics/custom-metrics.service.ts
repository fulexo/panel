import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class CustomMetricsService {
  // Business metrics
  private readonly ordersTotal = new Counter({
    name: 'fulexo_orders_total',
    help: 'Total number of orders processed',
    labelNames: ['tenant_id', 'status', 'source'],
  });

  private readonly ordersValue = new Counter({
    name: 'fulexo_orders_value_total',
    help: 'Total value of orders processed',
    labelNames: ['tenant_id', 'currency'],
  });

  private readonly customersTotal = new Counter({
    name: 'fulexo_customers_total',
    help: 'Total number of customers',
    labelNames: ['tenant_id'],
  });

  private readonly productsTotal = new Counter({
    name: 'fulexo_products_total',
    help: 'Total number of products',
    labelNames: ['tenant_id', 'active'],
  });

  // Sync metrics
  private readonly syncDuration = new Histogram({
    name: 'fulexo_sync_duration_seconds',
    help: 'Duration of sync operations',
    labelNames: ['tenant_id', 'store_id', 'entity_type'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  });

  private readonly syncErrors = new Counter({
    name: 'fulexo_sync_errors_total',
    help: 'Total number of sync errors',
    labelNames: ['tenant_id', 'store_id', 'entity_type', 'error_type'],
  });

  private readonly syncLag = new Gauge({
    name: 'fulexo_sync_lag_seconds',
    help: 'Sync lag in seconds',
    labelNames: ['tenant_id', 'store_id', 'entity_type'],
  });

  // Authentication metrics
  private readonly authAttempts = new Counter({
    name: 'fulexo_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['tenant_id', 'result', 'method'],
  });

  private readonly activeSessions = new Gauge({
    name: 'fulexo_active_sessions',
    help: 'Number of active sessions',
    labelNames: ['tenant_id'],
  });

  // Database metrics
  private readonly dbConnections = new Gauge({
    name: 'fulexo_db_connections',
    help: 'Number of database connections',
    labelNames: ['state'],
  });

  private readonly dbQueryDuration = new Histogram({
    name: 'fulexo_db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });

  // Cache metrics
  private readonly cacheHits = new Counter({
    name: 'fulexo_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type', 'key_pattern'],
  });

  private readonly cacheMisses = new Counter({
    name: 'fulexo_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type', 'key_pattern'],
  });

  // File upload metrics
  private readonly fileUploads = new Counter({
    name: 'fulexo_file_uploads_total',
    help: 'Total number of file uploads',
    labelNames: ['tenant_id', 'file_type', 'size_bucket'],
  });

  private readonly fileUploadSize = new Histogram({
    name: 'fulexo_file_upload_size_bytes',
    help: 'File upload size in bytes',
    labelNames: ['tenant_id', 'file_type'],
    buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824],
  });

  // Email metrics
  private readonly emailsSent = new Counter({
    name: 'fulexo_emails_sent_total',
    help: 'Total number of emails sent',
    labelNames: ['tenant_id', 'type', 'status'],
  });

  // Webhook metrics
  private readonly webhookEvents = new Counter({
    name: 'fulexo_webhook_events_total',
    help: 'Total number of webhook events',
    labelNames: ['tenant_id', 'store_id', 'provider', 'topic', 'status'],
  });

  private readonly webhookProcessingDuration = new Histogram({
    name: 'fulexo_webhook_processing_duration_seconds',
    help: 'Webhook processing duration',
    labelNames: ['tenant_id', 'store_id', 'provider', 'topic'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  });

  constructor() {
    // Register all metrics
    register.registerMetric(this.ordersTotal);
    register.registerMetric(this.ordersValue);
    register.registerMetric(this.customersTotal);
    register.registerMetric(this.productsTotal);
    register.registerMetric(this.syncDuration);
    register.registerMetric(this.syncErrors);
    register.registerMetric(this.syncLag);
    register.registerMetric(this.authAttempts);
    register.registerMetric(this.activeSessions);
    register.registerMetric(this.dbConnections);
    register.registerMetric(this.dbQueryDuration);
    register.registerMetric(this.cacheHits);
    register.registerMetric(this.cacheMisses);
    register.registerMetric(this.fileUploads);
    register.registerMetric(this.fileUploadSize);
    register.registerMetric(this.emailsSent);
    register.registerMetric(this.webhookEvents);
    register.registerMetric(this.webhookProcessingDuration);
  }

  // Business metrics methods
  recordOrder(tenantId: string, status: string, source: string, value?: number, currency?: string): void {
    this.ordersTotal.inc({ tenant_id: tenantId, status, source });
    if (value && currency) {
      this.ordersValue.inc({ tenant_id: tenantId, currency }, value);
    }
  }

  recordCustomer(tenantId: string): void {
    this.customersTotal.inc({ tenant_id: tenantId });
  }

  recordProduct(tenantId: string, active: boolean): void {
    this.productsTotal.inc({ tenant_id: tenantId, active: active.toString() });
  }

  // Sync metrics methods
  recordSyncDuration(tenantId: string, storeId: string, entityType: string, duration: number): void {
    this.syncDuration.observe({ tenant_id: tenantId, store_id: storeId, entity_type: entityType }, duration);
  }

  recordSyncError(tenantId: string, storeId: string, entityType: string, errorType: string): void {
    this.syncErrors.inc({ tenant_id: tenantId, store_id: storeId, entity_type: entityType, error_type: errorType });
  }

  setSyncLag(tenantId: string, storeId: string, entityType: string, lagSeconds: number): void {
    this.syncLag.set({ tenant_id: tenantId, store_id: storeId, entity_type: entityType }, lagSeconds);
  }

  // Authentication metrics methods
  recordAuthAttempt(tenantId: string, result: 'success' | 'failure', method: string): void {
    this.authAttempts.inc({ tenant_id: tenantId, result, method });
  }

  setActiveSessions(tenantId: string, count: number): void {
    this.activeSessions.set({ tenant_id: tenantId }, count);
  }

  // Database metrics methods
  setDbConnections(state: 'active' | 'idle' | 'waiting', count: number): void {
    this.dbConnections.set({ state }, count);
  }

  recordDbQuery(operation: string, table: string, duration: number): void {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  // Cache metrics methods
  recordCacheHit(cacheType: string, keyPattern: string): void {
    this.cacheHits.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  recordCacheMiss(cacheType: string, keyPattern: string): void {
    this.cacheMisses.inc({ cache_type: cacheType, key_pattern: keyPattern });
  }

  // File upload metrics methods
  recordFileUpload(tenantId: string, fileType: string, size: number): void {
    const sizeBucket = this.getSizeBucket(size);
    this.fileUploads.inc({ tenant_id: tenantId, file_type: fileType, size_bucket: sizeBucket });
    this.fileUploadSize.observe({ tenant_id: tenantId, file_type: fileType }, size);
  }

  // Email metrics methods
  recordEmailSent(tenantId: string, type: string, status: 'success' | 'failed'): void {
    this.emailsSent.inc({ tenant_id: tenantId, type, status });
  }

  // Webhook metrics methods
  recordWebhookEvent(tenantId: string, storeId: string, provider: string, topic: string, status: 'success' | 'failed'): void {
    this.webhookEvents.inc({ tenant_id: tenantId, store_id: storeId, provider, topic, status });
  }

  recordWebhookProcessing(tenantId: string, storeId: string, provider: string, topic: string, duration: number): void {
    this.webhookProcessingDuration.observe({ tenant_id: tenantId, store_id: storeId, provider, topic }, duration);
  }

  private getSizeBucket(size: number): string {
    if (size < 1024) return '<1KB';
    if (size < 10240) return '1-10KB';
    if (size < 102400) return '10-100KB';
    if (size < 1048576) return '100KB-1MB';
    if (size < 10485760) return '1-10MB';
    if (size < 104857600) return '10-100MB';
    return '>100MB';
  }
}