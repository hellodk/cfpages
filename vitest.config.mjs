import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.mjs'],
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-reports/unit/results.xml' },
    passWithNoTests: true,
  },
});
