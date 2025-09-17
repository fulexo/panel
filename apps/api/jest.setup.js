// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/fulexo_test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.MINIO_ENDPOINT = 'localhost'
process.env.MINIO_PORT = '9000'
process.env.MINIO_ACCESS_KEY = 'test'
process.env.MINIO_SECRET_KEY = 'test123'
process.env.MINIO_BUCKET = 'test-bucket'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}))

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
  }))
})

// Mock MinIO
jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn(),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
    getObject: jest.fn(),
    removeObject: jest.fn(),
  })),
}))

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}))

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
    verify: jest.fn(),
  })),
}))

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

// Mock jose
jest.mock('jose', () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
  generateKeyPair: jest.fn(),
}))

// Mock speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
  qrcode: {
    toDataURL: jest.fn(),
  },
}))

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}))

// Mock pdfkit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    pipe: jest.fn(),
    text: jest.fn(),
    font: jest.fn(),
    fontSize: jest.fn(),
    fillColor: jest.fn(),
    rect: jest.fn(),
    end: jest.fn(),
  }))
})

// Mock prom-client
jest.mock('prom-client', () => ({
  register: {
    clear: jest.fn(),
    metrics: jest.fn(),
  },
  Counter: jest.fn(),
  Histogram: jest.fn(),
  Gauge: jest.fn(),
}))

// Mock compression
jest.mock('compression', () => jest.fn())

// Mock helmet
jest.mock('helmet', () => jest.fn())

// Mock cookie-parser
jest.mock('cookie-parser', () => jest.fn())

// Mock express-rate-limit
jest.mock('express-rate-limit', () => jest.fn())

// Mock isomorphic-dompurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input) => input),
}))

// Mock workbox modules
jest.mock('workbox-precaching', () => ({}))
jest.mock('workbox-routing', () => ({}))
jest.mock('workbox-strategies', () => ({}))
jest.mock('workbox-expiration', () => ({}))
jest.mock('workbox-cacheable-response', () => ({}))
jest.mock('workbox-google-analytics', () => ({}))
jest.mock('workbox-navigation-preload', () => ({}))
jest.mock('workbox-range-requests', () => ({}))
jest.mock('workbox-streams', () => ({}))
jest.mock('workbox-background-sync', () => ({}))
jest.mock('workbox-broadcast-update', () => ({}))
jest.mock('workbox-window', () => ({}))
jest.mock('workbox-webpack-plugin', () => ({}))