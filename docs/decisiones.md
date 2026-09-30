# Decisiones – LivesManage

Registro de decisiones de diseño que complementan o precisan el ERS (`docs/ERS.md`). Cada decisión indica fecha y requisitos afectados. Si una decisión cambia, se agrega una nueva que la reemplace; no se edita la anterior.

| **ID** | **Fecha** | **RF afectado** | **Decisión** |
| --- | --- | --- | --- |
| D-01 | 30/09/2026 | Todos (3.1.1) | Estilos del frontend con Tailwind CSS 4 (`@tailwindcss/vite`). |
| D-02 | 30/09/2026 | Todos (3.1.1) | Routing con React Router en modo librería (`createBrowserRouter`), sin modo framework. |
| D-03 | 30/09/2026 | RF-05, RF-08, RF-12 | Nombre de la clienta en la línea. |
| D-04 | 30/09/2026 | RF-10, RF-12 | Dirección con campos separados. |
| D-05 | 30/09/2026 | RF-10, RF-11 | Modelo de entrega con una sola fuente de verdad. |
| D-06 | 30/09/2026 | RF-03, RF-14 | Organización de carpetas de `features/`. |
| D-07 | 30/09/2026 | RF-01, RF-02, RF-03 | Tipos `Usuario` y `Rol` desde la base del frontend. |
| D-08 | 30/09/2026 | RF-04 a RF-11 | Valores de enums y etiquetas visibles. |
| D-09 | 30/09/2026 | Todos (3.5) | Navegadores de Playwright. |

## D-01 · Estilos con Tailwind CSS

Se usa Tailwind CSS 4 con su plugin de Vite. Se eligió sobre CSS Modules y librerías de componentes por la rapidez para diseñar mobile-first y la consistencia de espaciados y tamaños táctiles.

## D-02 · Routing con React Router

Se usa `react-router` en modo librería (`createBrowserRouter`). Se eligió sobre TanStack Router por ser el estándar, con más documentación y más conocido en el contexto del ramo.

## D-03 · Nombre de la clienta en la línea

El contrato de la API de lives incluye `clientaId` y `clientaNombre` en cada línea. En el backend, `ms-lives` guarda una copia del nombre para que un live no dependa de que `ms-clientas` responda.

Pendiente: cómo se actualiza la copia al renombrar una clienta. Se define al implementar el backend.

## D-04 · Dirección con campos separados

```ts
Direccion = {
  calle: string;       // texto libre: calle, número, depto
  comuna: string;      // obligatoria
  region: string;      // por defecto "Metropolitana"
  referencia?: string; // opcional
}
```

## D-05 · Entrega: una sola fuente de verdad

- `Linea.entregaId` apunta a su entrega. `Entrega` no guarda la lista de líneas; se obtiene filtrando las líneas por `entregaId`.
- `Entrega = { id, sesionId, tipo: DESPACHO | RETIRO | FERIA, direccion? }`.
- Una entrega solo agrupa líneas de la misma sesión.
- Cualquier línea puede tener entrega; solo es obligatoria para las líneas `PAGADO` al finalizar el cierre (RF-11).

## D-06 · Carpetas de features

- `features/usuarios` es aparte de `features/auth`: RF-03 (gestión de usuarios) es independiente del login (RF-01).
- Ranking e inactivas (RF-14) van en `features/clientas`.

## D-07 · Usuario y Rol

Se definen desde ya los tipos `Usuario` y `Rol = 'ADMIN' | 'VENDEDOR'`, con un usuario simulado `ADMIN`. El menú muestra todas las pantallas hasta implementar RF-02.

## D-08 · Enums en mayúsculas y mapa de etiquetas

| **Concepto** | **Valores** |
| --- | --- |
| Estado de sesión | `ABIERTA`, `EN_CIERRE`, `CERRADA` |
| Estado de prenda | `VIGENTE`, `CANCELADA` |
| Estado de pago | `PENDIENTE`, `PAGADO`, `NO_PAGO` |
| Tipo de entrega | `DESPACHO`, `RETIRO`, `FERIA` |

Los textos visibles ("Pagado", "No pagó", "En cierre", ...) viven en un solo mapa de etiquetas y nunca se repiten dentro de los componentes.

## D-09 · Playwright solo con Chromium

Por ahora las pruebas E2E corren solo en Chromium con viewport de celular (360 × 740). El proyecto WebKit (iPhone), que cubre Safari en celular (3.1.3), se agrega cuando esté la pantalla de live (RF-05).
