import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['pruebas/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['pruebas/preparar.ts'],
    coverage: {
      provider: 'v8',
      include: ['servidor/**/*.ts', 'web/src/logica/**/*.ts', 'web/src/componentes/**/*.tsx'],
      thresholds: { lines: 60, functions: 60, statements: 60, branches: 50 },
    },
  },
});
