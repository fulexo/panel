// Test data fixtures for consistent testing

export const mockTenant = {
  id: 'test-tenant-123',
  name: 'Test Tenant',
  slug: 'test-tenant',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  tenantId: 'test-tenant-123',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockFileUpload = {
  id: 'file-123',
  tenantId: 'test-tenant-123',
  filename: 'test-file.jpg',
  originalName: 'test-file.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  key: 'uploads/test-tenant-123/uuid-test-file.jpg',
  status: 'COMPLETED',
  maxSize: 5 * 1024 * 1024, // 5MB
  uploadedAt: new Date('2024-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockJobData = {
  wooSyncProducts: {
    storeId: 'store-123',
    tenantId: 'test-tenant-123',
    syncType: 'products',
  },
  wooSyncOrders: {
    storeId: 'store-123',
    tenantId: 'test-tenant-123',
    syncType: 'orders',
  },
  email: {
    tenantId: 'test-tenant-123',
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<p>Test content</p>',
    text: 'Test content',
    template: 'welcome',
    templateData: { name: 'John Doe' },
    priority: 'normal',
  },
  fileCleanup: {
    tenantId: 'test-tenant-123',
    olderThanHours: 24,
  },
  inventorySync: {
    tenantId: 'test-tenant-123',
    productIds: ['prod-1', 'prod-2', 'prod-3'],
  },
};

export const mockHealthCheck = {
  status: 'healthy',
  services: {
    database: { status: 'healthy', responseTime: 50 },
    redis: { status: 'healthy', responseTime: 10 },
    s3: { status: 'healthy', responseTime: 100 },
    api: { status: 'healthy', responseTime: 5 },
  },
  metrics: {
    uptime: 3600,
    memory: {
      used: 100 * 1024 * 1024, // 100MB
      total: 500 * 1024 * 1024, // 500MB
      percentage: 20,
    },
    cpu: {
      usage: 15.5,
      loadAverage: [0.5, 0.8, 1.2],
    },
  },
  timestamp: new Date('2024-01-01T00:00:00Z'),
};

export const mockDetailedHealthCheck = {
  ...mockHealthCheck,
  additionalChecks: {
    jobQueues: {
      'woo-sync': { waiting: 0, active: 1, completed: 100, failed: 2 },
      'email': { waiting: 5, active: 0, completed: 500, failed: 1 },
      'file-cleanup': { waiting: 0, active: 0, completed: 50, failed: 0 },
    },
    fileSystem: {
      status: 'healthy',
      freeSpace: 10 * 1024 * 1024 * 1024, // 10GB
      totalSpace: 100 * 1024 * 1024 * 1024, // 100GB
    },
    externalServices: {
      'woocommerce-api': { status: 'healthy', responseTime: 200 },
      'email-service': { status: 'healthy', responseTime: 150 },
    },
    tenantCount: 5,
  },
};

export const mockQueueStats = {
  'woo-sync': {
    waiting: 0,
    active: 1,
    completed: 100,
    failed: 2,
  },
  'email': {
    waiting: 5,
    active: 0,
    completed: 500,
    failed: 1,
  },
  'file-cleanup': {
    waiting: 0,
    active: 0,
    completed: 50,
    failed: 0,
  },
  'inventory-sync': {
    waiting: 2,
    active: 1,
    completed: 200,
    failed: 0,
  },
};

export const mockErrorResponses = {
  databaseError: {
    status: 'unhealthy',
    services: {
      database: { status: 'unhealthy', error: 'Database connection failed' },
      redis: { status: 'healthy' },
      s3: { status: 'healthy' },
      api: { status: 'healthy' },
    },
    metrics: mockHealthCheck.metrics,
  },
  redisError: {
    status: 'unhealthy',
    services: {
      database: { status: 'healthy' },
      redis: { status: 'unhealthy', error: 'Redis connection failed' },
      s3: { status: 'healthy' },
      api: { status: 'healthy' },
    },
    metrics: mockHealthCheck.metrics,
  },
  s3Error: {
    status: 'unhealthy',
    services: {
      database: { status: 'healthy' },
      redis: { status: 'healthy' },
      s3: { status: 'unhealthy', error: 'S3 connection failed' },
      api: { status: 'healthy' },
    },
    metrics: mockHealthCheck.metrics,
  },
};

export const mockFileTypes = {
  valid: [
    { filename: 'image.jpg', mimeType: 'image/jpeg' },
    { filename: 'document.pdf', mimeType: 'application/pdf' },
    { filename: 'spreadsheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    { filename: 'text.txt', mimeType: 'text/plain' },
  ],
  invalid: [
    { filename: 'script.exe', mimeType: 'application/x-executable' },
    { filename: 'malware.bat', mimeType: 'application/x-msdownload' },
    { filename: 'virus.scr', mimeType: 'application/x-screensaver' },
  ],
};

export const mockEmailTemplates = {
  welcome: {
    subject: 'Welcome to {{companyName}}, {{firstName}}!',
    html: '<h1>Welcome {{firstName}}!</h1><p>Thank you for joining {{companyName}}.</p>',
    text: 'Welcome {{firstName}}! Thank you for joining {{companyName}}.',
  },
  passwordReset: {
    subject: 'Password Reset for {{companyName}}',
    html: '<h1>Password Reset</h1><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
    text: 'Password Reset: Visit {{resetLink}} to reset your password.',
  },
  orderConfirmation: {
    subject: 'Order Confirmation #{{orderNumber}}',
    html: '<h1>Order Confirmed</h1><p>Your order #{{orderNumber}} has been confirmed.</p>',
    text: 'Order Confirmed: Your order #{{orderNumber}} has been confirmed.',
  },
};