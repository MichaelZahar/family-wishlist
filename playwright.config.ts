import { defineConfig, devices } from '@playwright/test';

// Один .env в корне; .env.local переопределяет порты под worktree (ADR-006).
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Файла нет — значения берутся из окружения (CI) или по умолчанию.
  }
}

const webPort = Number(process.env.WEB_PORT ?? 5173);
const baseURL = `http://localhost:${webPort}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
});
