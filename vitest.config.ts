import react from '@vitejs/plugin-react';
import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineConfig } from 'vitest/config';

// Пакет shared читается из исходников, без сборки (см. exports в packages/shared/package.json).
const sourceCondition = '@family-wishlist/source';

const nodeResolve = {
  resolve: { conditions: [sourceCondition, ...defaultServerConditions] },
  ssr: { resolve: { conditions: [sourceCondition, ...defaultServerConditions] } },
};

export default defineConfig({
  test: {
    projects: [
      {
        ...nodeResolve,
        test: {
          name: 'shared',
          root: 'packages/shared',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        ...nodeResolve,
        test: {
          name: 'api',
          root: 'apps/api',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: { conditions: [sourceCondition, ...defaultClientConditions] },
        test: {
          name: 'web',
          root: 'apps/web',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
