module.exports = {
  displayName: 'API',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts}',
    '<rootDir>/src/**/*.{test,spec}.{js,ts}',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '../coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/common/(.*)$': '<rootDir>/src/common/$1',
    '^@/modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@/auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@/orders/(.*)$': '<rootDir>/src/orders/$1',
    '^@/products/(.*)$': '<rootDir>/src/products/$1',
    '^@/customers/(.*)$': '<rootDir>/src/customers/$1',
    '^@/tenants/(.*)$': '<rootDir>/src/tenants/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
}