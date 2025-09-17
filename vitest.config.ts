import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './apps'),
      '@/components': resolve(__dirname, './apps/web/components'),
      '@/lib': resolve(__dirname, './apps/web/lib'),
      '@/types': resolve(__dirname, './apps/web/types'),
      '@/app': resolve(__dirname, './apps/web/app'),
    },
  },
});