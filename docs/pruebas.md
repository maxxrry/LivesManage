# Pruebas del frontend – LivesManage

## Resumen

Una prueba automática es un programa que usa la app y revisa que el resultado sea el esperado. Si alguien rompe algo más adelante, la prueba falla y avisa antes de que llegue a la tienda.

| | |
| --- | --- |
| Pruebas | **296** unitarias y de componentes (Vitest) + **35** escenarios E2E (Playwright), cada uno en celular y computador |
| Cobertura | **95,1 %** de las líneas del frontend (el ERS pide 60 % en la lógica, RNF-22) |
| Trazabilidad | Cada requisito RF-01 y RF-04 a RF-14 tiene su prueba E2E con el criterio de aceptación del ERS |
| Comando | `npm test` (unitarias) y `npm run e2e` (E2E), desde `frontend/` |

## 1. Los cuatro tipos de prueba

Van de lo más pequeño y rápido a lo más completo y lento. Hay muchas abajo y pocas arriba ("pirámide de pruebas"): las de abajo revisan todos los casos en milisegundos; las de arriba confirman que todo junto funciona.

```
            ┌───────────┐
            │    E2E    │  31   ¿La app completa cumple el criterio del ERS?
          ┌─┴───────────┴─┐
          │  Componente   │  81   ¿La pantalla responde bien a lo que hace  la persona?
        ┌─┴───────────────┴─┐
        │     Servicio      │  88   ¿Se guardan bien los datos?
      ┌─┴───────────────────┴─┐
      │        Lógica         │ 100   ¿La regla calcula bien?
      └───────────────────────┘
```

| Tipo | Qué revisa | Cómo | Ejemplo |
| --- | --- | --- | --- |
| **Lógica** (unitaria) | Una función pura: recibe datos y devuelve un resultado. Sin pantalla ni datos guardados. | Vitest. Archivo `*.test.ts` junto a la función. | `parseAnotacion("flo 6-4")` devuelve nombre `flo` y precios `[6000, 4000]`. |
| **Servicio** | Las operaciones que leen y guardan datos (hoy en memoria; mañana la API). | Vitest. `src/services/*.test.ts`. | `anotar()` para Florencia suma a su línea y no crea otra. |
| **Componente** | Una pantalla dibujada en un navegador simulado (jsdom), usada como lo haría la persona: escribir, tocar botones. | Vitest + Testing Library + user-event. Archivo `*.test.tsx`. | Escribir `flo 6-` y Enter muestra el error y conserva el texto. |
| **E2E** (extremo a extremo) | La app completa en un navegador Chrome real, en tamaño celular (360×740) y computador (1280×800). | Playwright. `e2e/rf-XX.spec.ts`. | Anotar `flo 6-4` en el live y ver que su línea y el total suben $10.000. |

Vitest reemplaza a Jasmine + Karma con la aprobación del profesor (D-10). Se escribe igual: `describe`, `it`, `expect`; `vi.fn()` equivale a `jasmine.createSpy()`.

## 2. Un ejemplo completo: "inactiva a los 61 días" (RF-14)

El criterio de aceptación del ERS dice: *"Una clienta sin compras hace 61 días aparece como inactiva"*. Así se prueba en cada nivel:

**Lógica** (`utils/clientas.ranking.test.ts`): la regla, incluido el límite exacto.

```ts
it('sin compras hace 61 días aparece como inactiva; hace 60, no', () => {
  const historial = [compra('c-1', '2026-09-24', 5), compra('c-2', '2026-09-25', 5)]; // 61 y 60 días antes
  const inactivas = clientasInactivas(clientas, historial, '2026-11-24', 60);
  expect(inactivas.map((i) => [i.clienta.nombre, i.diasSinComprar])).toEqual([['Gabriela Peña', 61]]);
});
```

**Servicio** (`services/clientas.test.ts`): que `listarInactivas()` use los datos guardados y los días configurados.

**Componente** (`features/estadisticas/estadisticas.test.tsx`): que la pantalla muestre a Javiera con "61 días", su teléfono y el enlace a WhatsApp.

**E2E** (`e2e/rf-14.spec.ts`): en el navegador, con la fecha fijada en 24/11/2026, abrir "Inactivas", ver a Javiera, cambiar el criterio a 61 días y ver que desaparece.

Si la regla se rompe, falla primero la prueba de lógica, que dice exactamente qué caso falló. La E2E confirma que, además, todo está bien conectado.

## 3. Técnicas usadas

### Preparar, actuar, verificar

Toda prueba tiene tres pasos:

```ts
it('suma las prendas a la línea existente de la clienta', async () => {
  const antes = await obtenerSesion('s-2');                                  // preparar
  const { linea } = await anotar('s-2', { clientaId: 'c-2' }, [6000, 4000]); // actuar
  expect(precios(linea)).toEqual([6000, 4000, 6000, 4000]);                  // verificar
  expect((await obtenerSesion('s-2')).lineas).toHaveLength(antes.lineas.length);
});
```

### TDD: primero la prueba, después el código

Las reglas (parser, totales, cierre, indicadores, ranking) se escribieron así:

1. **Rojo:** se escribe la prueba antes que el código, y falla. Eso demuestra que la prueba sí revisa algo.
2. **Verde:** se escribe el código mínimo para que pase.
3. **Refactor:** se ordena el código; las pruebas siguen en verde.

Ejemplo: las 15 pruebas de ranking e inactivas fallaron primero ("la función no existe") y pasaron después de implementarla.

### Errores: primero reproducirlos con una prueba

Cada error encontrado en la revisión de código se corrigió en dos pasos: una prueba que lo reproduce (falla) y después la corrección (pasa). Así el error no puede volver sin que se note. Ejemplo (RF-12): al seguir el enlace de un aviso de duplicado, la ficha guardaba los datos sobre la clienta equivocada; la prueba *"seguir el enlace del aviso abre la otra ficha sin el formulario de la anterior"* lo dejó cubierto.

### Tablas de casos (`it.each`)

El parser tiene 24 casos. En vez de 24 pruebas casi iguales, una tabla; agregar un caso es agregar una fila:

```ts
it.each([
  ['flo 6-4', 'flo', [6000, 4000]],
  ['flo 6 - 4', 'flo', [6000, 4000]],
  ['Cami 2 6-4', 'Cami 2', [6000, 4000]], // D-12: nombres con números
])('"%s" → nombre "%s"', (texto, nombre, precios) => {
  expect(parseAnotacion(texto)).toEqual({ nombre, precios });
});
```

### Buscar como lo haría la persona

Las pruebas de pantalla buscan por lo que se ve (un botón llamado "Guardar", un campo llamado "Nombre"), no por detalles internos como clases CSS. Así una prueba solo falla si cambia algo que la persona notaría, y de paso se comprueba que la pantalla es accesible.

```ts
await usuario.type(campo, 'flo 6-{Enter}');
expect(screen.getByRole('alert')).toHaveTextContent('Falta un precio después del guion');
expect(campo).toHaveValue('flo 6-'); // el texto no se pierde
```

### Mocks: reemplazar una parte para controlarla

Un *mock* reemplaza una pieza real por una controlada por la prueba. Se usan dos:

- **Datos simulados** (`services/mock/datos.ts`): mientras no hay backend, los servicios responden con datos en memoria que tienen la misma forma que tendrá la API. Antes de cada prueba se reinician (`reiniciarDatos()` en `src/test/setup.ts`), para que ninguna dependa de lo que hizo otra.
- **Funciones simuladas** (`vi.mock` + `vi.fn`): sirven para provocar lo que es difícil de lograr de verdad, como una caída de conexión (RNF-13):

```ts
vi.mocked(anotar).mockRejectedValueOnce(new Error('Sin conexión.'));
// ... la persona anota "flo 6-4" ...
expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó la anotación. Sin conexión.');
expect(campo).toHaveValue('flo 6-4'); // no pierde lo que escribió
```

### Fecha fija

"61 días sin comprar" depende de qué día es hoy. Para que la prueba dé lo mismo cualquier día, se fija la fecha: `vi.useFakeTimers({ toFake: ['Date'] })` en Vitest y `page.clock.setFixedTime(...)` en Playwright. Las reglas además reciben "hoy" como parámetro, así que la prueba de lógica no necesita trucos.

## 4. Cómo correrlas

Desde `frontend/`:

| Comando | Qué hace |
| --- | --- |
| `npm test` | Todas las unitarias y de componentes (unos 30 s). |
| `npm run test:watch` | Igual, y se repiten solas al guardar un archivo. |
| `npx vitest src/features/live` | Solo las de una carpeta. |
| `npm run coverage` | Pruebas + cobertura. Abrir `coverage/index.html`. |
| `npm run e2e` | Todas las E2E, en celular y computador (levanta la app sola). |
| `npx playwright test --grep @RF-05` | Solo las E2E de un requisito. |
| `npx playwright test --ui` | E2E en modo visual, paso a paso. |

La configuración está en `vite.config.ts` (bloque `test`), `src/test/setup.ts` y `playwright.config.ts`.

## 5. Cómo leer los resultados

- **Todo verde:** `Tests 296 passed`. El nombre de cada prueba es una frase del comportamiento esperado, así que con `--reporter=verbose` el reporte se lee como una lista de lo que la app hace.
- **Una prueba falla:** Vitest muestra lo esperado (`Expected`) y lo obtenido (`Received`). Hay que decidir si el error está en el código o en la prueba; nunca se borra ni se salta una prueba para que pase.
- **Desconfiar del verde fácil:** si una prueba nueva pasa a la primera, se revisa que de verdad esté probando algo (por eso TDD empieza en rojo).

### Cobertura

`npm run coverage` mide qué parte del código se ejecutó durante las pruebas. Resultado al terminar la pantalla Estadísticas (D-32):

| Instrucciones | Ramas (`if`, `? :`) | Funciones | Líneas |
| --- | --- | --- | --- |
| 94,1 % | 88,0 % | 93,4 % | 95,1 % |

La cobertura dice qué código **no** se probó; no dice que el código probado sea correcto. Por eso las pruebas revisan resultados concretos (montos, textos, estados) y no solo que el código se ejecute. Lo que queda sin cubrir son sobre todo las pantallas aún vacías (Usuarios, Importar).

## 6. Trazabilidad: requisito → pruebas

Cada E2E lleva la etiqueta de su requisito (`{ tag: '@RF-05' }`) y prueba su criterio de aceptación (ERS 3.5).

| RF | Criterio de aceptación (ERS) | E2E | Pruebas unitarias y de componente |
| --- | --- | --- | --- |
| RF-01 | Con credenciales válidas entra; con inválidas ve un mensaje genérico; un usuario desactivado no entra. | `rf-01.spec.ts` | `usuarios.test.ts`, `LoginPage.test.tsx` |
| RF-04 | Con un live Abierto no se puede abrir otro; la lista muestra los totales. | `rf-04.spec.ts` | `sesiones.test.ts`, `fechas.test.ts`, `LivesPage.test.tsx` |
| RF-05 | "flo 6-4" suma $10.000 a Florencia; "ana 5" crea clienta; "flo 6-" muestra error y conserva el texto. | `rf-05.spec.ts` | `parseAnotacion.test.ts`, `sugerirClientas.test.ts`, `anotar.test.ts`, `LivePage.test.tsx` |
| RF-06 | Quitar una prenda de $6.000 baja la línea y el total en $6.000; restaurarla los repone. | `rf-06.spec.ts` | `corregir.test.ts`, `corregirLinea.test.tsx` |
| RF-07 | Marcar Pagada una línea de $17.000 la destaca y sube el pagado en $17.000. | `rf-07.spec.ts` | `pago.test.ts`, `pagoLinea.test.tsx` |
| RF-08 | El total del live es siempre la suma de las líneas visibles. | `rf-08.spec.ts` | `montos.test.ts`, `TotalesLive.test.tsx`, `hojaYTotales.test.tsx` |
| RF-09 | Al terminar el live desaparece el campo de anotación y el avance cuenta las bolsas. | `rf-09.spec.ts` | `cierre.test.ts`, `CierrePage.test.tsx` |
| RF-10 | Despacho exige dirección; una dirección nueva queda en la ficha; dos clientas agrupadas comparten dirección. | `rf-10.spec.ts` | `entrega.test.ts`, `entregaLinea.test.tsx` |
| RF-11 | No se finaliza con bolsas sin revisar o líneas Pendientes; al finalizar queda de solo lectura. | `rf-11.spec.ts` | `utils/cierre.test.ts`, `services/cierre.test.ts`, `finalizarCierre.test.tsx` |
| RF-12 | Un usuario de TikTok ya registrado muestra aviso de duplicado. | `rf-12.spec.ts` | `utils/clientas.test.ts`, `services/clientas.test.ts`, `clientas.test.tsx` |
| RF-13 | El total gastado es la suma de sus líneas Pagadas en lives cerrados. | `rf-13.spec.ts` | `clientas.indicadores.test.ts`, `sesiones.test.ts`, `clientas.test.tsx` |
| RF-14 | Sin compras hace 61 días aparece como inactiva; el ranking ordena por total gastado. | `rf-14.spec.ts` | `clientas.ranking.test.ts`, `sesion.test.ts` (gráfico de lives, D-32), `fechas.test.ts`, `services/clientas.test.ts`, `estadisticas.test.tsx` |

Además, las E2E de las pantallas con botones (RF-06, 07, 09, 10 y 11) revisan que midan al menos 44×44 px, y `smoke.spec.ts` y `rf-08.spec.ts` revisan que no haya desplazamiento horizontal (RNF-15).

## 7. Lo que estas pruebas no cubren (todavía)

| Pendiente | Por qué | Cuándo |
| --- | --- | --- |
| Login contra el backend real, usuarios y roles (RF-01 a RF-03) e importar cuaderno (RF-15) | Necesitan backend; el login ya se prueba con datos simulados. | Con cada microservicio. |
| Pruebas del backend (JUnit) | El backend aún no existe. | Con el backend (RNF-22). |
| Safari en iPhone (WebKit) | El navegador de prueba de Safari no arranca en Windows (D-16). | En CI con Linux (GitHub Actions). |
| Rendimiento (RNF-01 a RNF-04) y facilidad de uso (RNF-16, RNF-17) | Se miden con el backend real y con la tienda (pruebas de aceptación con usuarias). | Al desplegar. |
