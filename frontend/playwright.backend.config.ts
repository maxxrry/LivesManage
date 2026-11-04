import { tmpdir } from 'node:os';
import { defineConfig, devices } from '@playwright/test';

// E2E contra el backend real (D-43): los cuatro servicios con H2 en memoria y puertos propios, para no tocar MySQL
// ni chocar con una app ya abierta. Se parte desde una carpeta temporal para que no se lea el .env de cada servicio.
const JWT_SECRET = 'clave-solo-para-pruebas-de-al-menos-32-caracteres';
export const GATEWAY = 'http://localhost:18080';
export const ADMIN = { correo: 'admin-e2e@livesmanage.cl', contrasena: 'admin-e2e-123' };
const FRONT = 'http://localhost:5175';

function servicio(carpeta: string, urlLista: string, env: Record<string, string>) {
  const mvnw = process.platform === 'win32' ? '.\\mvnw.cmd' : './mvnw';
  return {
    command: `${mvnw} -q spring-boot:run -Dspring-boot.run.useTestClasspath=true "-Dspring-boot.run.workingDirectory=${tmpdir()}"`,
    cwd: `../backend/${carpeta}`,
    url: urlLista,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { JWT_SECRET, ...env },
  };
}

const conBase = (nombre: string, puerto: number, env: Record<string, string> = {}) => ({
  // H2 crea la base con esta contraseña. No puede ir vacía: en Windows una variable vacía no existe.
  DB_URL: `jdbc:h2:mem:${nombre};MODE=MySQL;DB_CLOSE_DELAY=-1`,
  DB_USUARIO: 'sa',
  DB_CONTRASENA: 'e2e',
  PORT: String(puerto),
  ...env,
});

export default defineConfig({
  testDir: './e2e-backend',
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  timeout: 60_000,
  use: {
    ...devices['Pixel 5'],
    browserName: 'chromium',
    viewport: { width: 360, height: 740 },
    baseURL: FRONT,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
  },
  webServer: [
    servicio('ms-auth', 'http://localhost:18081/v3/api-docs', conBase('auth', 18081, { ADMIN_CORREO: ADMIN.correo, ADMIN_CONTRASENA: ADMIN.contrasena })),
    servicio('ms-clientas', 'http://localhost:18083/v3/api-docs', conBase('clientas', 18083, { LIVES_URL: 'http://localhost:18082' })),
    servicio('ms-lives', 'http://localhost:18082/v3/api-docs', conBase('lives', 18082, { CLIENTAS_URL: 'http://localhost:18083' })),
    servicio('api-gateway', `${GATEWAY}/api/auth/yo`, {
      PORT: '18080',
      AUTH_URL: 'http://localhost:18081',
      CLIENTAS_URL: 'http://localhost:18083',
      LIVES_URL: 'http://localhost:18082',
      CORS_ORIGENES: FRONT,
    }),
    {
      command: 'npm run dev -- --port 5175 --strictPort',
      url: FRONT,
      reuseExistingServer: false,
      env: { VITE_API_URL: GATEWAY },
    },
  ],
});
