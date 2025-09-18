module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/apps'],
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        jsx: 'react-jsx',
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest'],
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    '!apps/**/*.d.ts',
    '!apps/**/node_modules/**',
    '!apps/**/dist/**',
    '!apps/**/.next/**',
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
      displayName: 'api',
      testMatch: ['<rootDir>/apps/api/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      displayName: 'worker',
      testMatch: ['<rootDir>/apps/worker/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    }
  ]
};