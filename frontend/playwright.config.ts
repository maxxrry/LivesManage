import { defineConfig, devices } from '@playwright/test';

// RF-01: cada E2E parte con la Admin conectada (misma forma que guarda usuariosService). rf-01.spec.ts parte sin sesión.
const sesionAdmin = {
  token: 'simulado-u-1',
  usuario: { id: 'u-1', nombre: 'Administradora', correo: 'admin@livesmanage.cl', rol: 'ADMIN', activo: true },
};

// D-09: Chromium a 360 px (mobile-first) y WebKit como iPhone.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'on-first-retry',
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5174',
          localStorage: [{ name: 'livesmanage.sesion', value: JSON.stringify(sesionAdmin) }],
        },
      ],
    },
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
    {
      // PC con mouse y teclado (ERS 3.1.3, D-24).
      name: 'escritorio',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    // Safari en celular (ERS 3.1.3). El WebKit de Playwright para Windows no trae
    // jxl.dll ni libsharpyuv.dll y no arranca, así que este proyecto corre en Linux/macOS.
    ...(process.platform === 'win32' ? [] : [{ name: 'iphone', use: { ...devices['iPhone 13'] } }]),
  ],
  webServer: {
    // Puerto propio: así nunca reutiliza el `npm run dev` de 5173, que puede estar en modo API (D-34).
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    // Datos simulados aunque exista un .env.local con VITE_API_URL.
    env: { VITE_API_URL: '' },
  },
});
