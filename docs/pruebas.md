# Pruebas – LivesManage (frontend)

Cómo están organizadas las pruebas del frontend, cómo se corren y qué concepto ilustra cada una. Los ejemplos son de RF-05 (anotar compra con sintaxis rápida).

## 1. Tipos de prueba

| **Tipo** | **Qué prueba** | **Herramienta** | **Dónde** | **Ejemplo RF-05** |
| --- | --- | --- | --- | --- |
| Unitaria de lógica | Una función pura: misma entrada, misma salida, sin pantalla. | Vitest | junto al archivo, `*.test.ts` | `parseAnotacion.test.ts`, `sugerirClientas.test.ts`, `montos.test.ts` |
| Unitaria de servicio | Las reglas del servicio sobre los datos simulados. | Vitest | `src/services/*.test.ts` | `anotar.test.ts` |
| De componente | Un componente React renderizado: props, estado y lo que hace la usuaria. | Vitest + Testing Library + user-event (jsdom) | junto al componente, `*.test.tsx` | `LivePage.test.tsx` |
| E2E (extremo a extremo) | La app completa en un navegador real con viewport de celular. | Playwright | `e2e/*.spec.ts` | `e2e/rf-05.spec.ts` |

Hay muchas pruebas rápidas abajo (lógica) y pocas lentas arriba (E2E): las unitarias corren en milisegundos y cubren todos los casos; las E2E confirman el criterio de aceptación del ERS en un navegador.

El profesor aceptó Vitest en vez de Jasmine + Karma (D-10). Los conceptos son los mismos: `describe`, `it` y `expect` tienen igual forma, y `vi.fn()` / `vi.spyOn()` equivalen a `jasmine.createSpy()` / `spyOn()`.

## 2. Configuración del entorno

| **Archivo** | **Qué configura** |
| --- | --- |
| `frontend/vite.config.ts` (bloque `test`) | Vitest: entorno `jsdom` (un DOM simulado en Node), archivo de setup, qué archivos son tests y la cobertura (`v8`, reporte en texto y HTML). |
| `frontend/src/test/setup.ts` | Antes de cada test reinicia los datos simulados (`reiniciarDatos()`), para que cada test parta igual; después de cada test desmonta lo renderizado (`cleanup()`). Carga los matchers de `jest-dom` (`toBeInTheDocument`, `toHaveValue`, ...). |
| `frontend/playwright.config.ts` | Playwright: proyecto `celular` (Chromium 360×740, táctil, es-CL, America/Santiago), proyecto `escritorio` (Chromium 1280×800, mouse y teclado, D-24) y proyecto `iphone` (WebKit, solo Linux/macOS, D-16). Cada E2E corre en todos los proyectos. Levanta `npm run dev` automáticamente. |

## 3. Cómo se corren

Desde `frontend/`:

| **Comando** | **Qué hace** |
| --- | --- |
| `npm test` | Todas las pruebas unitarias y de componentes, una vez. |
| `npm run test:watch` | Igual, pero quedan corriendo y se repiten al guardar un archivo. |
| `npx vitest src/features/live` | Solo las de una carpeta. |
| `npm run coverage` | Pruebas + reporte de cobertura. Abrir `coverage/index.html` en el navegador. |
| `npm run e2e` | Pruebas E2E. |
| `npx playwright test --grep @RF-05` | Solo las E2E de un requisito. |
| `npx playwright test --ui` | E2E en modo visual, paso a paso. |

## 4. Escritura de pruebas

### 4.1 Estructura: preparar, actuar, verificar

```ts
it('suma las prendas a la línea existente de la clienta', async () => {
  const antes = await obtenerSesion('s-2');                                 // preparar

  const { linea } = await anotar('s-2', { clientaId: 'c-2' }, [6000, 4000]); // actuar

  expect(precios(linea)).toEqual([6000, 4000, 6000, 4000]);                 // verificar
  expect((await obtenerSesion('s-2')).lineas).toHaveLength(antes.lineas.length);
});
```

### 4.2 Pruebas con tabla de datos (`it.each`)

El parser tiene 24 casos. En vez de 24 tests casi iguales, una tabla:

```ts
it.each([
  ['flo 6-4', 'flo', [6000, 4000]],
  ['flo 6 - 4', 'flo', [6000, 4000]],
  ['Cami 2 6-4', 'Cami 2', [6000, 4000]], // D-12: nombres con números
])('"%s" → nombre "%s"', (texto, nombre, precios) => {
  expect(parseAnotacion(texto)).toEqual({ nombre, precios });
});
```

Agregar un caso es agregar una fila, y el reporte muestra cada fila como un test separado.

### 4.3 Pruebas de componente: como lo usaría la persona

Se busca por lo que la persona ve (rol y texto accesible), no por clases CSS, y se simula lo que hace con `user-event`:

```ts
it('"flo 6-" muestra el error y conserva el texto', async () => {
  const { usuario, campo } = await abrirLive();

  await usuario.type(campo!, 'flo 6-{Enter}');

  expect(screen.getByRole('alert')).toHaveTextContent('Falta un precio después del guion');
  expect(campo).toHaveValue('flo 6-');
});
```

Este test recorre props y estado: `CampoAnotacion` recibe `clientas` y `onAnotar` por props, guarda `texto` y `error` en su estado, y la prueba verifica el resultado en pantalla.

### 4.4 Desarrollo guiado por pruebas (TDD)

Las funciones de lógica de RF-05 se escribieron con el ciclo rojo → verde → refactor:

1. **Rojo:** se escriben los tests antes que el código. Con `parseAnotacion` aún sin implementar, fallaron los 24, lo que demuestra que los tests sí verifican algo.
2. **Verde:** se escribe el código mínimo para que pasen (24 de 24).
3. **Refactor:** se mejora el código y se vuelven a correr los tests; siguen en verde.

## 5. Uso de mocks

Un mock reemplaza una dependencia para controlar su comportamiento. Hay dos niveles en el proyecto:

1. **Datos simulados (`src/services/mock/datos.ts`):** mientras no hay backend, los servicios responden con datos en memoria que tienen la misma forma que la API. Toda la app y todas las pruebas los usan.
2. **Mock de una función (`vi.mock` + `vi.fn`):** en `LivePage.test.tsx` se reemplaza `anotar` por una función espía que, por defecto, llama a la real:

```ts
vi.mock('../../services/sesionesService', async (original) => {
  const real = await original<typeof import('../../services/sesionesService')>();
  return { ...real, anotar: vi.fn(real.anotar) };
});
```

   Así se pueden simular situaciones difíciles de provocar de verdad, como una caída de conexión (RNF-13):

```ts
vi.mocked(anotar).mockRejectedValueOnce(new Error('Sin conexión.'));
// ... la persona anota "flo 6-4" ...
expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
expect(campo).toHaveValue('flo 6-4'); // el texto no se pierde
```

   Y también verificar que algo **no** ocurrió: con "flo 6-" el servicio nunca se llama (`expect(anotar).not.toHaveBeenCalled()`). Vitest limpia el registro de llamadas antes de cada test (`clearMocks`, activo por defecto).

## 6. Análisis de resultados

- **Lectura del reporte:** `npm test` muestra archivos y tests pasados o fallidos. Con `--reporter=verbose` se ve el nombre de cada test, que está escrito como una frase del comportamiento esperado.
- **Cuando un test falla**, Vitest muestra el valor esperado (`Expected`) y el recibido (`Received`). Hay que decidir si el error está en el código o en el test. Ejemplo real de este proyecto: ESLint marcó que `LivePage` cambiaba el estado de forma sincrónica dentro de un efecto; se corrigió el componente (no se desactivó la regla) y los tests confirmaron que el comportamiento seguía igual.
- **Desconfiar de un verde fácil:** cuando todos los tests de un archivo nuevo pasaron a la primera, se revisó que de verdad se estuvieran ejecutando (`--reporter=verbose`) y que el mock se limpiara entre tests.
- **Limitaciones del entorno:** el proyecto WebKit de Playwright no arranca en Windows por dos DLL faltantes del navegador, no por un error de la app. Se documentó en D-16.

## 7. Cobertura de código

`npm run coverage` mide qué parte del código se ejecutó durante las pruebas:

| **Métrica** | **Qué mide** |
| --- | --- |
| Statements | Instrucciones ejecutadas. |
| Branches | Caminos de cada `if`, `? :`, `&&`, `??` recorridos. |
| Functions | Funciones llamadas al menos una vez. |
| Lines | Líneas ejecutadas. |

Resultado al terminar RF-05 (01/10/2026):

| **Ámbito** | **Statements** | **Branches** | **Functions** | **Lines** |
| --- | --- | --- | --- | --- |
| Total | 86,9 % | 84,0 % | 85,4 % | 88,8 % |
| `features/live` (RF-05) | 93,2 % | 87,8 % | 93,0 % | 95,5 % |

Cómo leerlo:

- Las pantallas vacías (Login, Cierre, Usuarios, ...) tienen 0 %: aún no tienen lógica; se cubren al implementar su RF.
- La columna *Uncovered Line #s* y el reporte HTML marcan en rojo las líneas no ejecutadas. En RF-05 quedan sin cubrir, por ejemplo, el mensaje de error al cargar un live inexistente y la navegación con flechas entre sugerencias. Son candidatos para próximas pruebas.
- La cobertura indica qué código no se probó, no que el código probado sea correcto. Por eso las pruebas verifican resultados concretos (montos, textos, estado del campo) y no solo que el código se ejecute.

## 8. Trazabilidad con el ERS

Cada prueba E2E lleva la etiqueta de su RF y prueba su criterio de aceptación (ERS 3.5):

| **RF** | **Criterio de aceptación** | **Unitarias** | **E2E** |
| --- | --- | --- | --- |
| RF-04 | Con un live Abierto no se puede abrir otro; la lista muestra los totales de cada live. | `sesiones.test.ts`, `fechas.test.ts`, `LivesPage.test.tsx` | `e2e/rf-04.spec.ts` (`@RF-04`): totales de la lista, no abrir otro y continuar, tocar un live abre su pantalla |
| RF-05 | "flo 6-4" suma $10.000 a la línea existente de Florencia; "ana 5" crea clienta y línea; "flo 6-" muestra error y conserva el texto. | `parseAnotacion.test.ts`, `sugerirClientas.test.ts`, `montos.test.ts`, `anotar.test.ts`, `LivePage.test.tsx` | `e2e/rf-05.spec.ts` (`@RF-05`): los tres casos del criterio y Deshacer (D-11) |
| RF-06 | Quitar una prenda de $6.000 baja la línea y el total del live en $6.000; restaurarla los repone. | `corregir.test.ts`, `corregirLinea.test.tsx` | `e2e/rf-06.spec.ts` (`@RF-06`): quitar y restaurar $6.000, prendas de 44×44 px, cambiar clienta uniendo líneas (D-19) |
| RF-07 | Marcar Pagada una línea de $17.000 la destaca y sube el total pagado en $17.000. | `pago.test.ts`, `pagoLinea.test.tsx` | `e2e/rf-07.spec.ts` (`@RF-07`): marcar y desmarcar con total pagado, botón de 44×44 px |
| RF-08 | Tras cada acción, el total del live es igual a la suma de las líneas visibles. | `montos.test.ts` (`totalesDeLineas`), `TotalesLive.test.tsx`, `hojaYTotales.test.tsx` | `e2e/rf-08.spec.ts` (`@RF-08`): suma de líneas visibles tras anotar, cancelar y pagar; búsqueda; versión de computador a 1280 px |
| RF-09 | Al terminar el live desaparece el campo de anotación y el avance cuenta las bolsas revisadas. | `cierre.test.ts`, `CierrePage.test.tsx` | `e2e/rf-09.spec.ts` (`@RF-09`): terminar con confirmación, avance de bolsas, abrir un live nuevo tras terminar, check de 44 px |
