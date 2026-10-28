import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['coletor/test/**/*.test.ts', 'site/src/**/*.test.ts'] },
});
