import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    alias: {
      '@run-iq/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@run-iq/plugin-sdk': path.resolve(__dirname, '../plugin-sdk/src/index.ts'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
