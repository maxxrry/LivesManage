import { defineConfig, devices } from '@playwright/test';

// D-09: Chromium a 360 px (mobile-first) y WebKit como iPhone.
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
    // Safari en celular (ERS 3.1.3). El WebKit de Playwright para Windows no trae
    // jxl.dll ni libsharpyuv.dll y no arranca, así que este proyecto corre en Linux/macOS.
    ...(process.platform === 'win32' ? [] : [{ name: 'iphone', use: { ...devices['iPhone 13'] } }]),
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
