import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig, loadEnv } from 'vite';

// Один .env в корне монорепо; .env.local переопределяет порты под worktree (ADR-006).
const envDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  const apiPort = env.API_PORT ?? '3000';
  const webPort = Number(env.WEB_PORT ?? 5173);

  return {
    envDir,
    plugins: [react()],
    resolve: {
      conditions: ['@family-wishlist/source', ...defaultClientConditions],
    },
    server: {
      port: webPort,
      strictPort: true,
      // Один origin, как в проде (ADR-002, ADR-006).
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
  };
});
