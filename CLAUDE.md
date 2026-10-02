# LivesManage

App web para una tienda de ropa que vende por lives de TikTok. Reemplaza el cuaderno donde una persona anota, durante el live, quién compra y cuánto ("Gabriela Peña 6-6-5 = 17.000"), y guía el cierre posterior (bolsas, cobro, entrega) y el seguimiento de clientas.

Proyecto del ramo Desarrollo FullStack 2 (Duoc UC) y para un cliente real.

**Fuente de verdad: `docs/ERS.md`.** Antes de implementar un RF, lee su sección y su criterio de aceptación en la matriz (3.5). Si el ERS no cubre un caso, pregunta; no inventes requisitos.

## Estado actual

- Fase: frontend primero, con datos simulados. El backend aún no existe.
- Hecho: base del frontend (Vite + React + TS 6, Tailwind 4, React Router, Vitest, Playwright en Chromium 360×740). Tipos del dominio en `src/types/` (textos visibles solo en `etiquetas.ts`), servicios simulados en `src/services/` (live Abierto con 5 líneas, live Cerrado, usuario ADMIN), router con pantallas vacías de 3.1.1 y layout con menú.
- Hecho: RF-05. Parser (`features/live/parseAnotacion.ts`), sugerencias, `anotar()`/`deshacerAnotacion()` simulados, pantalla de live con total del live, hoja en formato cuaderno y aviso con Deshacer. Cobertura con `npm run coverage`. Guía de pruebas en `docs/pruebas.md`.
- Hecho: RF-04. Lista de lives con fecha, estado, clientas, total y pagado (`SesionResumen`, totales calculados por el servicio), abrir live con nombre opcional y "Continuar" si ya hay uno Abierto.
- Decisiones D-01 a D-17 en `docs/decisiones.md`.
- Siguiente: RF-06 (corregir línea), RF-07 (pago) y RF-08 (totales completos y búsqueda), que completan la pantalla de live.

## Estructura

```
docs/ERS.md            requisitos (RF-01 a RF-15, RNF, matriz de trazabilidad)
docs/decisiones.md     decisiones que precisan el ERS (D-01, D-02, ...)
docs/pruebas.md        cómo se organizan y corren las pruebas del frontend
frontend/              React + Vite + TypeScript, Vitest, Playwright
backend/
  api-gateway/         Spring Cloud Gateway, valida JWT       :8080
  ms-auth/             usuarios, roles, login                  :8081
  ms-lives/            sesiones, líneas, prendas, pagos, entregas  :8082
  ms-clientas/         fichas, direcciones, estadísticas        :8083
  ms-importacion/      foto del cuaderno → API de Claude        :8084
```

Cada microservicio tiene su propia base MySQL (`livesmanage_auth`, `livesmanage_lives`, ...). Nada de joins entre bases: se consulta por REST (WebClient).

## Comandos

```bash
# frontend/
npm run dev                       # http://localhost:5173
npm test                          # Vitest
npm run coverage                  # Vitest + cobertura (coverage/index.html)
npx playwright test               # E2E, viewport de celular
npx playwright test --grep @RF-05 # solo un requisito
npm run lint

# backend/<servicio>/
./mvnw spring-boot:run
./mvnw test
```

## Reglas del dominio (no romper)

- **Sesión de live**: Abierta → En cierre → Cerrada. Solo una Abierta a la vez. Cerrada es solo lectura (solo Admin reabre).
- **Línea**: una por clienta por sesión. Anotar para una clienta que ya tiene línea suma a esa línea.
- **Prenda**: solo tiene precio. Sin talla, descripción ni código. Estado Vigente o Cancelada; nunca se borra.
- **Precios**: en la sintaxis van en miles (`6` = $6.000); en el sistema son CLP enteros (`int`/`long`, nunca `float`/`double`).
- **Totales**: siempre calculados desde las prendas vigentes. El backend es la fuente de verdad; nunca se guarda un total escrito a mano.
- **Pago** (por línea): Pendiente, Pagado o No pagó. "No pagó" solo se asigna al finalizar el cierre.
- **Entrega**: Despacho (exige dirección), Retiro o Feria. Varias clientas pueden compartir una entrega (hermanas).
- **No existen** productos, stock, SKU ni categorías. Si una tarea parece necesitarlos, para y pregunta.
- Nombres de dominio en español como en el ERS: `Sesion`, `Linea`, `Prenda`, `Clienta`, `Entrega`.

## Sintaxis rápida (RF-05)

Función pura, sin dependencias de UI, con tests primero:

```ts
parseAnotacion("flo 6-4")    // { nombre: "flo", precios: [6000, 4000] }
parseAnotacion("flo 6 - 4")  // igual: acepta espacios alrededor del guion
parseAnotacion("flo 6-")     // { error: "..." } y la UI conserva el texto
```

Precios: enteros de 1 a 999 (miles). Los decimales (3,5) están pendientes de confirmar: no los implementes hasta que el ERS lo diga.

## Frontend

- Mobile-first: diseñar a 360 px de ancho, sin scroll horizontal, áreas táctiles de al menos 44×44 px.
- Pantalla de live: totales fijos arriba, campo de anotación siempre visible, líneas debajo.
- Solo `src/services/` habla con la API. Mientras no haya backend, los servicios devuelven datos simulados con la misma forma que tendrá la API real.
- Montos con `Intl.NumberFormat('es-CL')` ($17.000). Fechas dd/mm/aaaa, zona America/Santiago. Textos en español de Chile.

## Backend

- Capas controller → service → repository. DTOs en la API; nunca exponer entidades.
- `@Valid` + Bean Validation, `ResponseEntity`, `@RestControllerAdvice` para errores, SLF4J para logs, Lombok.
- Configuración y secretos por variables de entorno. Swagger/OpenAPI en cada servicio.
- Operaciones de varios pasos (anotar, finalizar cierre) en una transacción.

## Pruebas y trazabilidad

- Cada RF esencial tiene al menos un test Playwright etiquetado con su ID, en viewport de celular:
  ```ts
  test('suma a línea existente', { tag: '@RF-05' }, async ({ page }) => { /* ... */ });
  ```
- Tests unitarios obligatorios para: parser de sintaxis, cálculo de totales y reglas de cierre.
- Una tarea no está terminada si los tests no pasan. Corre los tests relacionados antes de decir que está lista.

## Forma de trabajo

- Un RF por sesión. Primero un plan corto; espera mi OK antes de tocar código.
- Commits con el ID del requisito: `feat(live): RF-05 anotación rápida`.
- No hagas commit ni push sin que te lo pida.
- Sin línea `Co-Authored-By` ni otra mención a Claude en commits ni PRs.
- No agregues dependencias sin preguntar.
- Si algo del código contradice el ERS, avísame en vez de elegir por tu cuenta.

## Límites

- Nunca subir `.env` ni secretos.
- La clave de la API de Claude (`ANTHROPIC_API_KEY`) vive solo en `ms-importacion`. El frontend nunca llama a `api.anthropic.com`.
- La foto del cuaderno no se guarda después de procesarla.
