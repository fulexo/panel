// Test utility functions and helpers

import { PrismaService } from '../../apps/api/src/prisma.service';
import { EnvService } from '../../apps/api/src/config/env.service';

// Mock implementations for common services
export const createMockPrismaService = (overrides: Partial<PrismaService> = {}): PrismaService => ({
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  $executeRaw: jest.fn().mockResolvedValue(undefined),
  tenant: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(5),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  fileUpload: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  ...overrides,
} as unknown as PrismaService);

export const createMockEnvService = (overrides: Partial<EnvService> = {}): EnvService => ({
  redisUrl: 'redis://localhost:6379',
  s3Endpoint: 'https://minio.example.com',
  s3Bucket: 'test-bucket',
  s3AccessKey: 'test-access-key',
  s3SecretKey: 'test-secret-key',
  nodeEnv: 'test',
  jwtSecret: 'test-jwt-secret',
  jwtExpiresIn: '1h',
  ...overrides,
} as unknown as EnvService);

// Test data generators
export const generateMockTenant = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-tenant-123',
  name: 'Test Tenant',
  slug: 'test-tenant',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const generateMockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'ADMIN',
  tenantId: 'test-tenant-123',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const generateMockFileUpload = (overrides: Record<string, unknown> = {}) => ({
  id: 'file-123',
  tenantId: 'test-tenant-123',
  filename: 'test-file.jpg',
  originalName: 'test-file.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  key: 'uploads/test-tenant-123/uuid-test-file.jpg',
  status: 'COMPLETED',
  maxSize: 5 * 1024 * 1024,
  uploadedAt: new Date('2024-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

// Async test helpers
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await waitFor(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

// Mock queue helpers
export const createMockQueue = (overrides: Record<string, unknown> = {}) => ({
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  getWaiting: jest.fn().mockResolvedValue([]),
  getActive: jest.fn().mockResolvedValue([]),
  getCompleted: jest.fn().mockResolvedValue([]),
  getFailed: jest.fn().mockResolvedValue([]),
  pause: jest.fn(),
  resume: jest.fn(),
  clean: jest.fn(),
  ...overrides,
});

// Error simulation helpers
export const simulateDatabaseError = (prismaService: PrismaService) => {
  jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('Database connection failed'));
};

export const simulateRedisError = (envService: EnvService) => {
  jest.spyOn(envService, 'redisUrl', 'get').mockReturnValue('redis://invalid-host:6379');
};

export const simulateS3Error = (envService: EnvService) => {
  jest.spyOn(envService, 's3Endpoint', 'get').mockReturnValue('https://invalid-s3-endpoint.com');
};

// Performance testing helpers
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;
  return { result, executionTime };
};

export const runConcurrentTests = async <T>(
  testFn: () => Promise<T>,
  concurrency: number = 10
): Promise<T[]> => {
  const promises = Array(concurrency).fill(null).map(() => testFn());
  return Promise.all(promises);
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidMimeType = (mimeType: string): boolean => {
  const validMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  return validMimeTypes.includes(mimeType);
};

// File size helpers
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const parseFileSize = (sizeString: string): number => {
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
  if (!match) throw new Error('Invalid file size format');
  const [, value, unit] = match;
  return parseFloat(value) * units[unit.toUpperCase() as keyof typeof units];
};

// Date helpers
export const createDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

export const isWithinDateRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

// String helpers
export const generateRandomString = (length: number = 10): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateRandomEmail = (): string => {
  const domains = ['example.com', 'test.com', 'demo.org'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const username = generateRandomString(8);
  return `${username}@${domain}`;
};

// Array helpers
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};