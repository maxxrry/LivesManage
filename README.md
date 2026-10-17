# LivesManage

Aplicación web para una tienda de ropa que vende por lives de TikTok. Reemplaza el cuaderno donde se anota, durante el live, quién compra y cuánto ("Gabriela Peña 6-6-5 = 17.000"), y guía el cierre posterior: revisión de bolsas, cobro y forma de entrega.

Proyecto del ramo Desarrollo FullStack 2 (Duoc UC), para un cliente real.

## Estado

| Parte | Estado |
| --- | --- |
| Frontend (React) | En desarrollo, con **datos simulados en memoria**: cada recarga de página vuelve a los datos iniciales. |
| Backend (Spring Boot, microservicios) | En construcción: `ms-auth` (login, JWT y usuarios), `api-gateway`, `ms-clientas` y `ms-lives` (lives, anotación, cierre) listos; todo el front puede usarlos. el login y Usuarios del front ya pueden usarlos. Plan completo en [docs/plan-backend.md](docs/plan-backend.md). |

Requisitos implementados en el frontend: RF-01 a RF-03 (login, acceso por rol y usuarios; con backend real o simulado) y RF-04 a RF-14 (lives, pantalla de live, cierre, clientas, ficha, ranking e inactivas). El detalle está en [docs/ERS.md](docs/ERS.md) y en la sección "Estado actual" de [CLAUDE.md](CLAUDE.md).

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

Abrir http://localhost:5173 e ingresar con un usuario de prueba (solo existen en los datos simulados):

| Correo | Contraseña | Rol |
| --- | --- | --- |
| admin@livesmanage.cl | admin123 | Administradora |
| vendedora@livesmanage.cl | vende123 | Vendedora |
| antigua@livesmanage.cl | antigua123 | Desactivada (no puede entrar) |

La app parte en la lista de lives; "Continuar" entra al live abierto de los datos simulados.

Para verla desde un celular en la misma red Wi-Fi: `npm run dev -- --host` y abrir en el celular la dirección "Network" que muestra Vite.

## Backend

Requisitos: **JDK 21** y **MySQL 8**. Maven no se instala: cada servicio trae `mvnw`.

Crear la base y su usuario una vez, en MySQL como root:

```sql
CREATE DATABASE livesmanage_auth;
CREATE DATABASE livesmanage_clientas;
CREATE DATABASE livesmanage_lives;
CREATE USER 'livesmanage'@'localhost' IDENTIFIED BY 'tu-contrasena';
GRANT ALL PRIVILEGES ON livesmanage_auth.* TO 'livesmanage'@'localhost';
GRANT ALL PRIVILEGES ON livesmanage_clientas.* TO 'livesmanage'@'localhost';
GRANT ALL PRIVILEGES ON livesmanage_lives.* TO 'livesmanage'@'localhost';
```

Después, desde la carpeta de cada servicio (`backend/ms-auth`, `backend/ms-clientas`, `backend/ms-lives` y `backend/api-gateway`; el `.env` se busca en la carpeta desde la que se arranca):

```bash
cp .env.example .env     # completar los valores; el .env nunca se sube
./mvnw spring-boot:run   # en Windows: .\mvnw.cmd spring-boot:run
./mvnw test              # pruebas (usan H2 en memoria, no necesitan MySQL)
```

`ms-auth` corre en http://localhost:8081 y su Swagger está en http://localhost:8081/swagger-ui.html. La primera vez crea la Admin definida en `ADMIN_CORREO` y `ADMIN_CONTRASENA`.

`ms-clientas` corre en http://localhost:8083 y `ms-lives` en http://localhost:8082 (Swagger en `/swagger-ui.html` de cada uno). El front los usa a través del gateway.

`api-gateway` corre en http://localhost:8080 y es la única dirección que usa el front. Su `.env` lleva el mismo `JWT_SECRET` que `ms-auth`.

**Front con el backend real:** crear `frontend/.env.local` con `VITE_API_URL=http://localhost:8080` y levantar MySQL, los cuatro servicios (`ms-auth`, `ms-clientas`, `ms-lives`, `api-gateway`) y `npm run dev`. Todo se guarda en MySQL: usuarios, clientas, lives y cierres. Se entra con la Admin de `ADMIN_CORREO`. Sin ese archivo, el front funciona como antes, solo con datos simulados (los usuarios de prueba de arriba).

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
