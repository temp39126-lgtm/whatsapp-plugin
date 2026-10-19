import { defineConfig } from 'vitest/config';

const testEncryptionKey =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? testEncryptionKey,
    },
  },
});
