module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.{ts,tsx}',
    '<rootDir>/tests/integration/**/*.{ts,tsx}',
    '<rootDir>/tests/e2e/**/*.{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['@babel/plugin-transform-class-properties', { loose: true }],
      ],
    }],
    '^.+\\.(js|jsx)$': ['babel-jest'],
  },
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    '!apps/**/*.d.ts',
    '!apps/**/node_modules/**',
    '!apps/**/dist/**',
    '!apps/**/.next/**',
    '!apps/**/__tests__/**',
    '!apps/**/*.test.{ts,tsx}',
    '!apps/**/*.spec.{ts,tsx}',
    '!tests/**',
  ],
  globals: {
    'ts-jest': {
      useESM: false
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/$1',
    '^@/components/(.*)$': '<rootDir>/apps/web/components/$1',
    '^@/lib/(.*)$': '<rootDir>/apps/web/lib/$1',
    '^@/types/(.*)$': '<rootDir>/apps/web/types/$1',
    '^@/app/(.*)$': '<rootDir>/apps/web/app/$1',
  },
  testTimeout: 10000,
  projects: [
    {
      displayName: 'unit-api',
      testMatch: ['<rootDir>/tests/unit/api/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'unit-web',
      testMatch: ['<rootDir>/tests/unit/web/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'unit-worker',
      testMatch: ['<rootDir>/tests/unit/worker/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    }
  ]
};