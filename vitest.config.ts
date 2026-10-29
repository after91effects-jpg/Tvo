import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    exclude: ['**/.qa-product-build/**', '**/node_modules/**', '**/.kilo/**', '**/dist/**', '**/build/**'],
  },
});
