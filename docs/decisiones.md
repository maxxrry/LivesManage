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
| D-10 | 01/10/2026 | Todos (3.5) | Tailwind y Vitest aceptados por el profesor frente a la pauta del ramo. |
| D-11 | 01/10/2026 | RF-05 | Deshacer elimina lo recién anotado. |
| D-12 | 01/10/2026 | RF-05, RF-12 | El nombre de la clienta puede contener números; los precios son el último grupo. |
| D-13 | 01/10/2026 | RF-05 | Tocar una sugerencia anota directamente. |
| D-14 | 01/10/2026 | RF-12 | Editar clienta desde su ficha y acceso a la ficha desde la línea del live. |
| D-15 | 01/10/2026 | RF-05, RF-13, RF-14 | `Clienta.ultimaCompra` en el contrato de la API de clientas. |
| D-16 | 01/10/2026 | Todos (3.5) | El proyecto WebKit (iPhone) de Playwright corre solo en Linux y macOS. Complementa D-09. |
| D-17 | 02/10/2026 | RF-04 | Nombre por defecto, sin confirmación al abrir y enlace de cada live. |

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

## D-10 · Tailwind y Vitest aceptados frente a la pauta

La pauta del ramo menciona Bootstrap (IE2.1.2, IE2.1.4) y Jasmine + Karma (IE2.2.1, IE2.2.2). El profesor acepta mantener Tailwind (D-01) y Vitest, cubriendo los mismos conceptos: componentes con props y estado, diseño responsivo, mocks, análisis de resultados y cobertura (`npm run coverage`).

## D-11 · Deshacer elimina lo recién anotado

El aviso de RF-05 ofrece Deshacer durante unos segundos. Deshacer elimina las prendas de esa anotación, y también la línea y la clienta si la anotación las creó. Es la única excepción a "una prenda nunca se borra": no es una cancelación (RF-06) sino anular un error de tipeo, y así no infla las cancelaciones de la clienta (RF-13). Se puede revisar si en el uso real no convence.

## D-12 · Nombres con números

El nombre de una clienta puede empezar con números o contenerlos. En la sintaxis rápida, los precios son siempre el último grupo `número(-número)*` del texto y todo lo anterior es el nombre:

- `Cami 2 6-4` → nombre "Cami 2", precios 6.000 y 4.000.
- `flo 6 4` (sin guion) → nombre "flo 6", precio 4.000. Las sugerencias y el aviso con Deshacer permiten detectar el error.

Una clienta nueva se crea con el nombre tal como se escribió y se corrige después en su ficha (D-14).

## D-13 · Tocar una sugerencia anota directamente

Enter o Agregar anotan a la sugerencia destacada. Tocar otra sugerencia anota de inmediato a esa clienta, si los precios son válidos, para no sumar un toque extra (RNF-16).

## D-14 · Editar clienta

La ficha de la clienta tendrá un botón Editar para completar o corregir sus datos (nombre, usuario de TikTok, teléfono, dirección), y desde cada línea del live se podrá abrir la ficha de esa clienta. Se implementa con RF-12 y RF-13.

## D-15 · Última compra en la clienta

La API de clientas devuelve cada clienta con `ultimaCompra` (fecha de su última línea Pagada en un live Cerrado, según la definición de compra de 3.2.5), calculada por `ms-clientas`. Se usa para ordenar las sugerencias de RF-05 (compra más reciente primero) y después para la ficha (RF-13) y las clientas inactivas (RF-14). Una clienta sin compras no tiene el campo.

## D-16 · WebKit solo en Linux y macOS

Al agregar el proyecto WebKit (iPhone 13) según D-09, el navegador no arranca en Windows: el WebKit que distribuye Playwright 1.63 para Windows no trae `jxl.dll` ni `libsharpyuv.dll`. El proyecto `iphone` queda definido en `playwright.config.ts`, pero se omite cuando el sistema es Windows. En Linux y macOS (por ejemplo, en un CI) corre junto al proyecto `celular` (Chromium a 360 px). Se revisa al actualizar Playwright.

## D-17 · Abrir y listar lives

- Un live sin nombre se muestra como "Live del dd/mm" (fecha de inicio, hora de Chile). Ese texto se arma al mostrarlo; no se guarda como nombre.
- Abrir un live no pide confirmación: el formulario tiene Cancelar y abrir no es una acción importante en el sentido de 3.1.1.
- Cada live de la lista abre `/lives/:id`, cualquiera sea su estado. Cuando exista la pantalla de cierre (RF-09), los lives En cierre podrán ir directo a ella.
