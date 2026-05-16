import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/services/draft/**'],
      reporter: ['text', 'text-summary'],
    },
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
  },
});
