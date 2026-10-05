# LivesManage

Aplicación web para una tienda de ropa que vende por lives de TikTok. Reemplaza el cuaderno donde se anota, durante el live, quién compra y cuánto ("Gabriela Peña 6-6-5 = 17.000"), y guía el cierre posterior: revisión de bolsas, cobro y forma de entrega.

Proyecto del ramo Desarrollo FullStack 2 (Duoc UC), para un cliente real.

## Estado

| Parte | Estado |
| --- | --- |
| Frontend (React) | En desarrollo, con **datos simulados en memoria**: cada recarga de página vuelve a los datos iniciales. |
| Backend (Spring Boot, microservicios) | Aún no implementado. |

Requisitos implementados en el frontend: RF-04 a RF-12 (lives, pantalla de live, cierre y clientas). El detalle está en [docs/ERS.md](docs/ERS.md) y en la sección "Estado actual" de [CLAUDE.md](CLAUDE.md).

## Requisitos

- **Node.js 22.12 o superior** (probado con Node 24) y npm.
- Git.
- Para las pruebas E2E: los navegadores de Playwright (se instalan con un comando, ver abajo).

## Instalación

```bash
git clone https://github.com/maxxrry/LivesManage.git
cd LivesManage/frontend
npm install
npx playwright install chromium   # solo para las pruebas E2E
```

## Ejecutar

```bash
cd frontend
npm run dev
```

Abrir http://localhost:5173. La app parte en la lista de lives; "Continuar" entra al live abierto de los datos simulados.

Para verla desde un celular en la misma red Wi-Fi: `npm run dev -- --host` y abrir en el celular la dirección "Network" que muestra Vite.

## Pruebas

Desde `frontend/`:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Pruebas unitarias y de componentes (Vitest). |
| `npm run coverage` | Lo mismo, con reporte de cobertura en `coverage/index.html`. |
| `npm run e2e` | Pruebas E2E (Playwright) en celular (360×740) y computador (1280×800). Levanta la app sola. |
| `npx playwright test --grep @RF-05` | Solo las E2E de un requisito. |
| `npx playwright test --ui` | E2E en modo visual, paso a paso. |
| `npm run lint` | ESLint. |
| `npm run build` | Revisión de tipos y build de producción en `dist/`. |

Cómo están organizadas las pruebas y su trazabilidad con el ERS: [docs/pruebas.md](docs/pruebas.md).

## Estructura

```
docs/
  ERS.md          requisitos (RF, RNF, matriz de trazabilidad)
  decisiones.md   decisiones que precisan el ERS (D-01, D-02, ...)
  pruebas.md      guía de pruebas del frontend
frontend/
  src/
    features/     una carpeta por área: lives, live, cierre, clientas, ...
    components/   layout y componentes comunes
    services/     única capa que habla con la API (hoy, datos simulados)
    types/        tipos del dominio y textos de los estados
    utils/        montos, fechas, totales y reglas de cierre
  e2e/            pruebas Playwright, etiquetadas por requisito (@RF-05, ...)
backend/          (pendiente) gateway y microservicios Spring Boot
```

## Notas para Windows

- Si PowerShell muestra "la ejecución de scripts está deshabilitada", usar `npm.cmd` en vez de `npm` (por ejemplo `npm.cmd run dev`), o permitir scripts locales una vez con `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- El navegador WebKit (Safari) de Playwright no arranca en Windows, por lo que el proyecto E2E `iphone` solo corre en Linux y macOS (ver D-16 en [docs/decisiones.md](docs/decisiones.md)).
