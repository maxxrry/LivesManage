import { defineConfig } from '@playwright/test';

// D-09: por ahora solo Chromium en viewport de celular.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'celular',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
