import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.mjs',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4318',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm run build && PORT=4318 NTC3_VAULT_PATH=.local/e2e-vault NTC3_DESKTOP_DIST=artifacts/ntech-c3/dist/public node artifacts/api-server/dist/index.mjs',
    url: 'http://127.0.0.1:4318/api/healthz',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
