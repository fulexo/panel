// Jest setup file
const dotenv = require('dotenv');
dotenv.config({ path: '.env.test' });

// Import jest-dom for additional matchers
require('@testing-library/jest-dom');

// Global test setup
beforeAll(() => {
  // Setup global test environment
});

afterAll(() => {
  // Cleanup global test environment
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};