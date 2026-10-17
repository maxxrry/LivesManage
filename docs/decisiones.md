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
| D-18 | 02/10/2026 | RF-06, RF-08 | Cancelar o restaurar una prenda no cambia el orden de la hoja. |
| D-19 | 02/10/2026 | RF-06 | Cambiar la clienta de una línea: a una existente o nueva, y reglas al unir líneas. |
| D-20 | 02/10/2026 | RF-05, RF-06, RF-07 | Una línea Pagada vuelve a Pendiente si se le agrega o restaura una prenda. |
| D-21 | 02/10/2026 | RF-07 | Marcar el pago no reordena la hoja; fecha y usuario se guardan sin mostrarse. |
| D-22 | 02/10/2026 | RF-05, RF-06, RF-07 | Cualquier cambio en la línea recién anotada anula su Deshacer. Amplía D-11 y D-19. |
| D-23 | 02/10/2026 | RF-04, RF-08 | Pendiente por cobrar, número de clientas y totales con búsqueda activa. |
| D-24 | 02/10/2026 | Todos (3.1.3, RNF-25) | Versión de computador: menú fijo, lista de lives en tabla y E2E también en escritorio. Complementa D-09 y D-16. |
| D-25 | 02/10/2026 | RF-09 | Terminar live con confirmación; bolsa revisada solo En cierre; orden de la hoja en el cierre. |
| D-26 | 03/10/2026 | RF-10 | Forma de entrega en el cierre: grupos, dirección en la ficha y Feria sin detalle. |
| D-27 | 03/10/2026 | RF-11 | Finalizar cierre: líneas de $0, conteo por entrega, No pagó reversible y reabrir. |
| D-28 | 04/10/2026 | RF-12 | Duplicados avisan sin bloquear, renombrar actualiza las líneas, desactivar y reactivar (Admin). |
| D-29 | 04/10/2026 | RF-13 | Indicadores de la ficha: solo lives Cerrados; una compra es una línea Pagada con monto. |
| D-30 | 04/10/2026 | RF-14 | Ranking de los últimos 3 meses por defecto, desempates, inactivas sin desactivadas, contacto por teléfono y WhatsApp. |
| D-31 | 08/10/2026 | RF-01 | Contrato del login, sesión en `localStorage` y mensaje genérico también para usuarios desactivados. |
| D-32 | 08/10/2026 | RF-14 | Pantalla "Estadísticas" (antes "Ranking e inactivas") con gráfico de vendido por live, cobrado y no pagó. |
| D-33 | 14/10/2026 | RF-01, RF-02, RNF-05 a RNF-07 | `ms-auth`: stack, contenido del JWT, `GET /api/auth/yo`, formato de errores y Admin inicial. Complementa D-31. |
| D-34 | 14/10/2026 | RF-01, RNF-07 | api-gateway (rutas, JWT, CORS, límite de intentos de login) y login del front conectado con `VITE_API_URL`. |
| D-35 | 14/10/2026 | RF-02, RF-03 | Gestión de usuarios: contrato REST, reglas (nadie se desactiva ni se cambia el rol a sí mismo, contraseña de 8 caracteres), pantalla Usuarios y menú según el rol. Reemplaza la parte de menú de D-07. |
| D-36 | 14/10/2026 | RF-12, RF-14 | `ms-clientas`: contrato REST de fichas y días de inactividad, reglas de D-28 en Java y conexión del front junto con `ms-lives`. |
| D-37 | 14/10/2026 | RF-04 a RF-08, RF-05 (D-11) | `ms-lives`: contrato REST, anotación con clienta nueva en `ms-clientas`, Deshacer con borrado acotado de la clienta y conexión del front al terminar el cierre. |
| D-38 | 17/10/2026 | RF-09 a RF-11, RF-13, D-28 | Cierre en `ms-lives`, historial de compras, renombrar entre servicios y front conectado a lives y clientas. |

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
- Ranking e inactivas (RF-14) van en `features/clientas`. Desde D-32, la pantalla y el ranking están en `features/estadisticas`; `Inactivas` sigue en `features/clientas`.

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

## D-18 · Cancelar o restaurar no reordena la hoja

RF-08 muestra la última línea modificada arriba. Cancelar o restaurar una prenda (RF-06) no cuenta como modificación para ese orden: si la línea saltara al primer lugar, se movería bajo el dedo justo al tocarla. Sí reordenan anotar (RF-05) y cambiar la clienta de la línea.

## D-19 · Cambiar clienta y unir líneas

- Se puede cambiar a una clienta existente o a una nueva (misma opción "Nueva clienta" de RF-05).
- Si la clienta elegida ya tiene línea en el live, se pide confirmación ("¿Unirlas?") y las prendas pasan a esa línea; la línea original desaparece. Sin unión no hay confirmación.
- Estado de la línea unida: Pagado solo si ambas estaban Pagadas (si no, Pendiente: hay un monto sin cobrar); bolsa revisada solo si ambas lo estaban; entrega la de la línea de destino o, si no tiene, la de la otra.
- Tras cambiar la clienta, el Deshacer de la última anotación (D-11) deja de aplicar.

## D-20 · Cambios de monto en una línea Pagada

- Si a una línea Pagada se le agrega una prenda (anotar, RF-05) o se le restaura una cancelada (RF-06), vuelve a Pendiente: hay un monto sin cobrar. Es la misma regla de D-19 al unir líneas. El cambio queda registrado con fecha y usuario como cualquier cambio de pago.
- Si se cancela una prenda de una línea Pagada, sigue Pagado. Devoluciones y saldos a favor quedan fuera de alcance; la pregunta está en "Pendientes por confirmar" del ERS.

## D-21 · Marcar el pago

- Marcar o desmarcar el pago no reordena la hoja, por la misma razón de D-18.
- La fecha, hora y usuario del cambio (RF-07) se guardan en `Linea.pagoActualizado` pero no se muestran por ahora; pueden mostrarse en el historial de la ficha (RF-13) o en el cierre (RF-09).
- Con un live Cerrado, el estado de pago se muestra como texto y no se puede cambiar.

## D-22 · Deshacer solo si la línea no cambió

Deshacer (D-11) devuelve la línea a como estaba antes de anotar, incluido su estado de pago (D-20). Si después de anotar la línea cambió (cancelar o restaurar una prenda, marcar el pago o cambiar la clienta), Deshacer ya no aplica: el aviso se cierra y el servicio rechaza deshacer. Así Deshacer nunca deja como Pagado un monto que nadie cobró. Cambios en otras líneas no afectan el aviso.

Una línea "No pagó" muestra su estado como texto aunque el live sea editable; qué se puede hacer con ella al reabrir un cierre se define en RF-11.

## D-23 · Totales del live

- **Total del live:** suma de las prendas vigentes de todas las líneas.
- **Pagado:** suma de las líneas Pagadas.
- **Pendiente por cobrar:** suma de las líneas Pendientes. Lo "No pagó" no es pendiente (ya no se cobrará); aparece en el resumen del cierre (RF-11).
- **Número de clientas:** todas las líneas del live, aunque una tenga todas sus prendas canceladas: cada clienta que compró queda registrada y su bolsa se revisa en el cierre. Es la misma cuenta de la lista de lives (RF-04).
- Un solo cálculo (`totalesDeLineas`) para la pantalla de live y la lista de lives.
- Los totales son siempre del live completo, también con la búsqueda activa. El criterio de RF-08 ("el total del live es igual a la suma de las líneas visibles") se verifica sin búsqueda; con búsqueda se indica "Mostrando N de M clientas".
- La versión de escritorio de la pantalla de live se hace en RF-08. La lista de lives, el menú y el proyecto de Playwright de escritorio quedan para una tarea aparte.

## D-24 · Versión de computador

La app es mobile-first, pero también se usa en PC (Chrome, Edge y Firefox; ERS 3.1.3 y RNF-25). Desde 1024 px de ancho (`lg` de Tailwind):

- **Menú:** fijo a la izquierda y siempre visible; desaparece el botón ☰. En celular sigue siendo un panel que abre ☰. Es un solo `<nav>` que cambia de estilo, sin duplicar enlaces.
- **Ancho:** cada pantalla define el suyo. Las pantallas comunes (`Pantalla`) llegan a ~1024 px; la pantalla de live a ~1150 px, con la hoja en dos columnas (RF-08).
- **Lista de lives:** tabla con columnas Live, Inicio, Estado, Clientas, Total y Pagado, para comparar montos en columna. La fila completa abre el live. En celular siguen las tarjetas.
- **Pruebas:** Playwright tiene el proyecto `escritorio` (Chromium 1280×800, mouse y teclado) además de `celular` (y `iphone` fuera de Windows, D-16). Todos los E2E corren en ambos; usan `click()`, que funciona con y sin pantalla táctil. Las pruebas que dependen del ancho usan `isMobile` (por ejemplo, el menú en la prueba de humo).

## D-25 · Terminar live y revisar bolsas

- "Terminar live" pide confirmación en la misma pantalla (como D-19) y pasa la sesión de Abierta a En cierre. No se registra la hora de término: el ERS no la pide.
- El check de bolsa revisada solo existe En cierre; durante el live las bolsas aún se arman.
- Corregir una línea (RF-06) con la bolsa ya marcada no la desmarca: si la bolsa no cuadraba, se corrige la línea para que coincida con la bolsa.
- La pantalla de cierre usa el mismo orden de la hoja del live (última modificada arriba), con la búsqueda de RF-08.
- Un live En cierre se abre directamente en su cierre, desde la lista de lives y desde `/lives/:id` (redirige). Reemplaza el último punto de D-17.

## D-26 · Forma de entrega en el cierre

- La entrega se registra solo En cierre, en la misma tarjeta de cada clienta. Retiro y Feria se guardan con un toque; Despacho pide confirmar la dirección de la ficha, ingresar otra o enviar junto con otra clienta del live que ya tenga despacho.
- Despacho exige calle y comuna; la región es Metropolitana si se deja vacía (D-04) y la referencia es opcional.
- Una dirección ingresada o confirmada reemplaza la de la ficha de la clienta: la ficha guarda una sola dirección, sin historial. Sumarse al despacho de otra clienta no cambia la ficha de quien se suma.
- Cambiar la forma de entrega o la dirección de una clienta agrupada la saca del grupo; las demás conservan su entrega. Una entrega que queda sin líneas se elimina (D-05).
- Feria registra solo el tipo. Qué feria y qué día sigue como pregunta abierta del ERS.
- Registrar la entrega no reordena la hoja.

## D-27 · Finalizar cierre y reabrir

- Las reglas de cierre viven en una función pura, `revisarCierre` (`utils/cierre.ts`), que usan la pantalla (para mostrar qué falta) y el servicio (para validar al finalizar). Con backend, la validación y el paso a Cerrada van en una transacción.
- Las líneas de $0 (todas sus prendas canceladas) quedan fuera de las reglas de pago y entrega: no se cobran ni se marcan No pagó, y no ensucian las estadísticas de la clienta. Su bolsa sí debe marcarse revisada, como todas.
- El resumen cuenta despachos, retiros y ferias por entrega, no por clienta: dos hermanas agrupadas son un despacho. Solo cuentan las entregas con al menos una línea Pagada (las que efectivamente se harán).
- "No pagó" se marca desde el resumen de finalizar, solo En cierre y solo sobre líneas Pendientes. Se deshace con "Deshacer" en la línea (vuelve a Pendiente), por ejemplo si la clienta pagó días después. Completa D-21.
- Reabrir: solo Admin, desde la pantalla del live Cerrado y con confirmación. El live vuelve a En cierre con sus líneas tal como estaban, incluidas las No pagó.
- No se registra la hora de cierre ni de reapertura: el ERS no las pide.

## D-28 · Registrar y buscar clientas

- **Duplicados:** si el usuario de TikTok o el teléfono ya pertenecen a otra clienta, se avisa quién lo tiene (con enlace a su ficha) y se puede "Guardar igual". No bloquea: unas hermanas pueden compartir teléfono.
- **Comparación:** el usuario de TikTok se compara sin `@`, espacios ni mayúsculas, y se guarda como `@usuario` en minúsculas. El teléfono se compara por sus últimos 9 dígitos (`+56 9 1234 5678` = `912345678`) y se guarda como se escribió.
- **Búsqueda:** por nombre (sin tildes ni mayúsculas, como RF-05), por usuario de TikTok o por teléfono (dígitos).
- **Renombrar:** al cambiar el nombre en la ficha se actualiza la copia `clientaNombre` de todas sus líneas, también en lives Cerrados. Cierra el pendiente de D-03; con backend, `ms-clientas` avisa a `ms-lives`.
- **Desactivar (baja lógica):** solo Admin y con confirmación. La clienta conserva su historial, no aparece en las sugerencias al anotar y se oculta de la lista salvo con "Mostrar desactivadas". La administradora puede reactivarla.
- **Dirección:** opcional; si se ingresa, exige calle y comuna, y la región es Metropolitana por defecto (D-04). La misma validación que el despacho de RF-10.
- **Anonimizar** (3.4, Ley 21.719) queda para una tarea aparte, junto con el backend.

## D-29 · Indicadores e historial de la ficha

- **Base de los indicadores:** solo los lives Cerrados. Un live Abierto o En cierre todavía puede cambiar, así que no suma.
- **Total gastado** (criterio de aceptación del ERS): suma de las líneas Pagadas en lives Cerrados, con la fórmula de `totalesDeLineas` (D-23).
- **Compras:** líneas Pagadas en lives Cerrados con monto mayor a $0 (las de $0 no cuentan, D-27). **Ticket promedio** = total gastado ÷ compras, redondeado a pesos enteros; $0 si no hay compras.
- **Última compra:** fecha del último live Cerrado con una línea Pagada, calculada desde el historial. El campo `ultimaCompra` de la clienta (D-15) se sigue usando para ordenar las sugerencias al anotar; con backend, `ms-clientas` lo calcula con esta misma regla.
- **Prendas canceladas** y **lives sin pago** (líneas No pagó): también solo en lives Cerrados.
- **Historial:** todas sus líneas, también de lives Abiertos o En cierre (con su estado a la vista), el live más reciente primero. Cada fila enlaza al live. Las prendas se muestran como en el cuaderno (`8-5`), con las canceladas tachadas.
- Con backend, el historial lo entrega `ms-lives` (`GET /api/lives/lineas?clientaId=`) y los indicadores se calculan en `ms-clientas` (prueba JUnit según la matriz del ERS).

## D-30 · Ranking y clientas inactivas

- **Compra:** la misma definición de la ficha (D-29): línea Pagada, en un live Cerrado, de más de $0.
- **Ranking:** por total gastado o por número de compras, en un período de días de calendario en hora de Chile, con ambos extremos incluidos (el día del live es el de su inicio). Por defecto, los últimos 3 meses; atajos "Este mes", "3 meses" y "12 meses", además de las fechas "Desde" y "Hasta".
- **Empates:** por total, desempata el número de compras y luego el nombre; por compras, desempata el total y luego el nombre.
- **Desactivadas:** aparecen en el ranking (marcadas "Desactivada"), porque sus compras fueron reales; no aparecen en inactivas, porque no se las va a contactar.
- **Inactiva:** al menos una compra y ninguna en los últimos N días; es decir, más de N días de calendario desde su última compra (con N = 60, a los 60 días todavía no es inactiva y a los 61 sí). Se ordena por más días sin comprar.
- **Días de inactividad (N):** configuración de toda la tienda, 60 por defecto. Solo la administradora la cambia, con un entero de 1 a 365. Con backend, la guarda `ms-clientas`.
- **Contacto:** usuario de TikTok, teléfono como enlace `tel:` y enlace a WhatsApp (`wa.me/56` + los 9 dígitos del teléfono, D-28) cuando el teléfono tiene 9 dígitos.

## D-31 · Login: contrato y sesión en el navegador

- **Contrato con `ms-auth`** (pasando por el API Gateway):

  ```
  POST /api/auth/login   { correo, contrasena }
  200 → { token, usuario: { id, nombre, correo, rol, activo } }   (usuario con la forma de D-07)
  401 → correo inexistente, contraseña incorrecta o usuario desactivado
  ```

- **Mensaje genérico:** "Correo o contraseña incorrectos." en los tres casos, también para un usuario desactivado, para no revelar qué correos existen (RF-01).
- **Sesión:** la respuesta se guarda tal cual en `localStorage` (clave `livesmanage.sesion`), para que cerrar la pestaña en pleno live no obligue a volver a entrar. Cerrar sesión borra la clave.
- **Datos al día:** `usuarioActual()` no confía en la copia guardada: hoy lee el usuario de los datos simulados y, con backend, lo pide a `ms-auth`. Así un cambio de rol se nota sin volver a entrar.
- **Conexión con el backend:** solo cambian `iniciarSesion` y `usuarioActual` en `usuariosService.ts`. `tokenActual()` entrega el JWT para el header `Authorization: Bearer`. El manejo de un token vencido (401 en otra llamada → volver al login) se agrega al conectar.
- **Usuarios de prueba** (solo en el mock, listados en el README): Administradora, Vendedora y una ex vendedora desactivada. Las contraseñas viven en un mapa aparte; el tipo `Usuario` no tiene contraseña, porque la API nunca la devuelve.
- **Pruebas:** Vitest y Playwright parten con la Admin conectada (`src/test/setup.ts` y `storageState` en `playwright.config.ts`); las pruebas de RF-01 parten sin sesión.

## D-32 · Pantalla Estadísticas

Pedido de la tienda: ver, además del ranking, cómo le fue a cada live.

- **Nombre:** "Ranking e inactivas" (ERS 3.1.1) pasa a ser **Estadísticas** (`/estadisticas`), con tres pestañas: Lives, Ranking e Inactivas. RF-14 se cumple igual; se agrega la pestaña Lives.
- **Pestaña Lives:** cifras del período (vendido, cobrado, no pagó con su % de lo vendido, número de lives) y el gráfico "Vendido por live": una fila por live, el más reciente primero, con una barra partida en Cobrado y No pagó y las cifras escritas debajo. Cada fila abre su live.
- **Qué cuenta:** solo lives Cerrados con inicio en el período, como D-29 y D-30. En un live Cerrado no quedan Pendientes, así que No pagó = total − pagado; no hace falta un campo nuevo en la API (`listarSesiones` ya trae total y pagado). Regla en `resumenDeLives` (`utils/sesion.ts`).
- **Barras horizontales** sin librería de gráficos: caben a 360 px con cualquier número de lives y no agregan dependencias. Colores: rosado de marca (Cobrado) y azul `#2563eb` (No pagó), validados para daltonismo y contraste; la leyenda y las cifras escritas hacen que no dependa solo del color.
- **Período compartido** por Lives y Ranking: Este mes, 3 meses (por defecto), 12 meses y "Otro…", que muestra Desde y Hasta. "Ordenar por" queda solo en Ranking. Inactivas no usa período.
- **Datos simulados sin cambios:** hoy hay un solo live Cerrado, así que el gráfico muestra una barra. Se verá completo con el backend.
- **Con backend:** hoy la pantalla pide todos los lives (`listarSesiones`) y filtra el período en el navegador. Al conectar `ms-lives`, el período va en la consulta (`GET /api/lives?estado=CERRADA&desde=&hasta=`), como en el ranking, para no traer todo el historial.
- **Enlace antiguo:** `/ranking` redirige a `/estadisticas`.
- **Fuera por ahora:** clientas y ticket promedio por live, prendas canceladas por live.

## D-33 · ms-auth: JWT, usuario actual y errores

Primer microservicio del backend (paso 1 de `docs/plan-backend.md`).

- **Stack:** Java 21 (Temurin LTS) y Spring Boot 4.1.1, la versión estable de start.spring.io al crearlo. Todos los servicios usan esa misma versión. Swagger con springdoc 3.1.1 en `/swagger-ui.html`.
- **JWT** firmado con HS256 usando `JWT_SECRET` (al menos 32 caracteres), que es la misma clave en el gateway y en cada microservicio. Así cada uno valida el token y revisa el rol sin preguntarle a `ms-auth` (RNF-07). Se usa el soporte JWT de Spring Security (`oauth2-resource-server`), sin librerías extra. Contenido: `sub` = id del usuario, `nombre`, `rol` (`ADMIN` o `VENDEDOR`), `iss` = `ms-auth` (los servicios rechazan otro emisor) y vencimiento a las 8 horas (RNF-06). Cada servicio convierte `rol` en `ROLE_ADMIN` o `ROLE_VENDEDOR`.
- **Usuario actual:** `GET /api/auth/yo` con el token devuelve el usuario al día (forma de D-07). Si el usuario fue desactivado o ya no existe, responde 401. Es lo que llamará `usuarioActual()` (D-31).
- **Errores:** todos los servicios responden `{ mensaje, campos? }`. `mensaje` se puede mostrar tal cual y `campos` trae el error de cada campo cuando la validación falla (400). El login malo responde 401 con "Correo o contraseña incorrectos." (D-31). Un token ausente, vencido o alterado responde 401 "Tu sesión expiró o no es válida. Vuelve a iniciar sesión.", y la falta de permiso responde 403. Los errores 4xx de Spring (ruta inexistente, tipo de contenido equivocado) conservan su código y nunca se convierten en 500.
- **Contraseñas:** BCrypt de costo 12 (RNF-05). Una contraseña de más de 72 bytes (el límite de BCrypt) se rechaza como credencial inválida. Si el correo no existe, igual se compara contra un hash de relleno, para que el tiempo de respuesta no revele qué correos existen.
- **Correo:** se guarda y se compara en minúsculas y sin espacios.
- **Admin inicial:** si la tabla de usuarios está vacía al arrancar, se crea una Admin con `ADMIN_CORREO` y `ADMIN_CONTRASENA` (mínimo 8 caracteres). Si faltan, el servicio avisa en el log.
- **Configuración:** variables de entorno, o un `.env` local en la carpeta del servicio (lo ignora `backend/.gitignore`; ver `.env.example`). Las pruebas usan H2 en memoria (perfil `test`) y no necesitan MySQL.
- **Pendiente:** limitar los intentos de login (unos 10 cada 15 minutos) se agrega en el api-gateway. Las tablas las crea Hibernate (`ddl-auto: update`); antes de cargar datos reales se pasa a migraciones.

## D-34 · api-gateway y login del front conectado

Paso 2 de `docs/plan-backend.md`.

- **Gateway:** Spring Cloud Gateway en su versión servlet (`gateway-server-webmvc`, Spring Cloud 2025.1.3). Es el mismo stack que los microservicios, así que la validación del JWT se configura igual que en `ms-auth`. Escucha en el puerto 8080. Las rutas se agregan a medida que existe cada servicio; hoy solo `/api/auth/**` y `/api/usuarios/**` → `ms-auth` (`AUTH_URL`).
- **JWT:** deja pasar sin token solo `POST /api/auth/login`. Todo lo demás exige un token firmado con `JWT_SECRET`, vigente y con `iss` = `ms-auth`; si no, responde 401 `{ mensaje }` sin llegar al servicio. El rol no se revisa aquí: lo revisa cada microservicio (RNF-07).
- **CORS:** solo los orígenes de `CORS_ORIGENES` (por defecto `http://localhost:5173`), con los headers `Authorization` y `Content-Type`. Para usar la API desde GitHub Pages hay que agregar esa URL.
- **Límite de intentos de login** (cierra el pendiente de D-33): después de 10 logins fallidos desde una misma IP en 15 minutos, responde 429 "Demasiados intentos. Espera unos minutos y vuelve a intentar." hasta que pasa la ventana. Solo cuentan los fallidos, para que las vendedoras detrás del mismo Wi-Fi no se bloqueen entre ellas. Cada intento se cuenta antes de reenviarlo y se descuenta si no falló, así que muchos intentos en paralelo no pasan todos. La ruta se compara ya decodificada, igual que Spring Security, para que `/api/auth/logi%6E` también cuente. El contador vive en memoria (una sola instancia) y usa la IP de la conexión; con varias instancias o detrás de un proxy habrá que cambiarlo. Límite conocido: en una IP compartida (el Wi-Fi de la tienda), 10 fallos de una persona bloquean a todas por 15 minutos. Se aceptó porque se inicia sesión pocas veces (el token dura 8 horas).
- **Frontend:** `src/services/api.ts` tiene `pedirApi` (fetch, sin dependencias), que agrega el token y convierte la respuesta de error en un `ErrorApi` con el código HTTP y el `mensaje` del backend. Con `VITE_API_URL` (en `frontend/.env.local`, que git ignora) `iniciarSesion` y `usuarioActual` usan la API real; sin la variable siguen los datos simulados. Así funcionan Vitest, GitHub Pages y la demo.
- **Errores del login:** un 401 muestra siempre "Correo o contraseña incorrectos." (D-31). Un 429 o la falta de conexión muestran su propio mensaje.
- **Token vencido** (cierra el pendiente de D-31): si cualquier llamada con token responde 401, `pedirApi` borra la sesión y vuelve a `/login`. Hoy la única llamada con token es `GET /api/auth/yo`. Una respuesta 200 que no es JSON, o un login sin `token` y `usuario`, muestra "El servidor respondió algo inesperado.".
- **Mientras ms-lives y ms-clientas sigan simulados:** con login real, `usuarioConectado()` devuelve el usuario guardado en la sesión (el id real no existe en los datos simulados). Se borra al conectar esos servicios.
- **Pruebas:** Vitest fuerza `VITE_API_URL` vacía (`vite.config.ts`) y las E2E de Playwright levantan su propio servidor en el puerto 5174 con la variable vacía. Así ninguna prueba depende del backend ni reutiliza un `npm run dev` en modo API.

## D-35 · Gestión de usuarios y acceso por rol

Paso 3 de `docs/plan-backend.md`.

- **Contrato** (`ms-auth`, solo Admin; a una Vendedora le responde 403 `{ mensaje }`):

  ```
  GET   /api/usuarios               200 → Usuario[] ordenados por nombre
  POST  /api/usuarios               { nombre, correo, rol, contrasena }  201 → Usuario
  PUT   /api/usuarios/{id}          { nombre, correo, rol }              200 → Usuario
  PATCH /api/usuarios/{id}/activo   { activo }                           200 → Usuario
  400 → { mensaje, campos }   404 → usuario inexistente   409 → correo repetido o regla de abajo
  ```

- **Reglas:**
  - El correo es único, sin importar mayúsculas ni espacios.
  - El nombre es obligatorio (hasta 100 caracteres).
  - La contraseña inicial tiene al menos 8 caracteres y como máximo 72 bytes (el límite de BCrypt).
  - Ningún usuario se borra: se desactiva y se puede reactivar (RF-03).
- **Nadie se desactiva ni se cambia el rol a sí mismo.** Quien hace el cambio sigue siendo Admin activa, así que siempre queda al menos una Admin.
- **El rol se revisa en la base, no solo en el token:** cada operación de `/api/usuarios` comprueba que quien la pide siga siendo Admin activa. Así, una Admin desactivada o pasada a Vendedora pierde el acceso al instante, aunque su JWT (hasta 8 horas) todavía diga ADMIN. En la pantalla, la fila propia dice "(tú)", no tiene Desactivar y el rol aparece bloqueado al editarla.
- **Contraseña:** solo se define al crear el usuario. Editar no la cambia, porque el ERS habla de contraseña inicial. Restablecer una contraseña olvidada queda fuera por ahora.
- **Efecto de desactivar:** el usuario no puede iniciar sesión. Si ya tenía sesión, la pierde en su siguiente llamada a la API, porque `GET /api/auth/yo` responde 401 (D-33).
- **Pantalla Usuarios** (`features/usuarios`):
  - Lista: tarjetas en celular y filas con rol y acciones alineadas en computador.
  - "Nuevo usuario" y "Editar" usan el mismo formulario (`FormularioUsuario`), que se muestra en la misma fila.
  - Desactivar pide confirmación (ERS 3.1.1). Reactivar no la pide.
  - Después de crear o guardar aparece un aviso.
- **RF-02 en el front:**
  - La entrada Usuarios del menú lleva `soloAdmin` y no se muestra a la Vendedora (ERS 3.1.1).
  - Si una Vendedora abre `/usuarios` por URL, ve "No tienes permiso para ver esta pantalla."
  - El front toma el rol de la sesión guardada, y `usuarioActual()` la pone al día cada vez que se llama (la pantalla Usuarios lo llama al abrirse y después de que la Admin edita sus propios datos). La protección real es el 403 de `ms-auth`.
  - Las demás acciones solo de Admin (reabrir cierre, desactivar clienta, días de inactividad) ya revisaban el rol.
- **Datos simulados:** sin `VITE_API_URL`, `usuariosService` aplica las mismas reglas y mensajes sobre los usuarios simulados. Si se cambia el correo, la contraseña simulada pasa al correo nuevo. `reiniciarDatos()` también restaura los usuarios y las contraseñas.

## D-36 · ms-clientas: fichas de clientas

Paso 4 de `docs/plan-backend.md`.

- **Contrato** (por el gateway; las rutas son las que ya anotaba `clientasService.ts`):

  ```
  GET   /api/clientas                         200 → Clienta[] (también las desactivadas), por nombre
  GET   /api/clientas/{id}                    200 → Clienta   404 → "La clienta no existe."
  POST  /api/clientas                         { nombre, usuarioTiktok?, telefono?, direccion? }  201 → Clienta
  PUT   /api/clientas/{id}                    mismo cuerpo; un campo vacío o ausente se borra     200 → Clienta
  GET   /api/clientas/duplicados?usuarioTiktok=&telefono=&excluirId=   200 → { tiktok?, telefono? }
  PATCH /api/clientas/{id}/activa             { activa }   solo Admin                             200 → Clienta
  GET   /api/configuracion/dias-inactividad   200 → { dias }
  PUT   /api/configuracion/dias-inactividad   { dias } (1 a 365), solo Admin                      200 → { dias }
  ```

- **Forma de los datos:** la misma del tipo `Clienta` del front. Los campos opcionales vacíos no se envían. Un error de validación devuelve 400, con un error como `mensaje` (por ejemplo, "Falta la comuna de la dirección.", el mismo texto que el front) y todos en `campos`. Si fallan varios campos, el `mensaje` es el del primero en orden alfabético, para que la respuesta sea siempre la misma. Un choque en la base (dos guardados al mismo tiempo) responde 409 "Intenta de nuevo".
- **Reglas de D-28 en Java** (`Normalizar`):
  - El nombre pierde los espacios sobrantes, también entre palabras. Al teléfono y a la dirección solo se les quitan los espacios del inicio y del final, como en el front.
  - El usuario de TikTok se guarda como `@usuario` en minúsculas.
  - El teléfono se guarda como se escribió y, aparte, sus últimos 9 dígitos, para buscar duplicados con una consulta indexada.
  - La dirección exige calle y comuna; la región es Metropolitana si viene vacía.
  - Los duplicados avisan, no bloquean.
- **Roles:** las dos usuarias gestionan clientas. Desactivar o reactivar y cambiar los días de inactividad son solo de la Admin, y el rol se toma del JWT. A diferencia de ms-auth (D-35), aquí no se revisa en una base de usuarios, porque ms-clientas no la tiene. Se aceptó porque son dos acciones de bajo impacto y reversibles. Si se quisiera, se puede preguntar a `GET /api/auth/yo`.
- **Configuración:** una tabla `configuracion` de una fila. Sin fila, los días son 60.
- **Pendiente para el paso 7** (necesita ms-lives): `ultimaCompra` (D-15), ranking, inactivas y el aviso a ms-lives al renombrar, para actualizar `clientaNombre` en las líneas (D-28).
- **El front sigue simulado:** la pantalla de live simulada busca a las clientas en los datos simulados, así que conectar solo Clientas dejaría el modo real a medias. `clientasService` se conecta junto con `sesionesService` cuando exista ms-lives.
- **Código repetido entre servicios:** `SeguridadConfig`, `ManejadorErrores`, `ReglaException` y `ErrorRespuesta` se copiaron de ms-auth. Se prefirió repetir unas pocas clases a mantener una librería compartida entre microservicios.

## D-37 · ms-lives: lives, anotación, correcciones y pagos

Paso 5 de `docs/plan-backend.md`.

- **Contrato** (por el gateway; rutas que ya anotaba `sesionesService.ts`):

  ```
  GET    /api/lives                                  200 → SesionResumen[] (totales calculados), el más reciente primero
  POST   /api/lives                                  { nombre? }   201 → Sesion   409 si ya hay uno Abierto
  GET    /api/lives/{id}                             200 → SesionDetalle { sesion, lineas, entregas }
  POST   /api/lives/{id}/anotaciones                 { destino: { clientaId } | { nuevaClienta }, precios[] }   201 → { anotacionId, linea }
  DELETE /api/lives/{id}/anotaciones/{anotacionId}   204   409 si ya no se puede deshacer
  PATCH  /api/lives/{id}/lineas/{lineaId}/prendas/{prendaId}   200 → Linea
  PATCH  /api/lives/{id}/lineas/{lineaId}/clienta    { clientaId } | { nuevaClienta }   200 → Linea (la unida, si había otra)
  PATCH  /api/lives/{id}/lineas/{lineaId}/pago       200 → Linea
  ```

  Las fechas van en ISO 8601 (UTC) y los montos en CLP enteros. Para deshacer hace falta el id del live: al conectar el front, `deshacerAnotacion` recibe también `sesionId`.
- **Solo un live Abierto, garantizado por la base:** la columna `sesion.abierta` vale `true` mientras el live está Abierto y `null` en los demás estados, y tiene un índice único. Dos aperturas al mismo tiempo no pasan. Del mismo modo, la línea tiene un índice único `(sesion_id, clienta_id)`, que asegura una línea por clienta por live.
- **Reglas** iguales al `sesionesService` simulado: precios de $1.000 a $999.000 en miles; D-18 a D-23, incluidos D-20 (anotar o restaurar en una línea Pagada la vuelve Pendiente) y D-19 (al unir líneas, las prendas pasan a la línea de destino). Los totales se calculan en `Totales`, con la misma fórmula que `totalesDeLineas`.
- **Anotaciones** (tabla `anotacion`): cada una guarda quién, cuándo y cuánto (RNF-09), y lo necesario para deshacerla. Deshacer funciona mientras la línea no cambie (D-22) y el live siga Abierto. La anotación deshecha queda registrada, marcada como no deshacible.
- **Clientas:** al anotar a una clienta nueva, ms-lives la crea en ms-clientas. Al anotar a una existente, usa la copia del nombre si ya tiene línea en el live y solo pregunta a ms-clientas si es su primera línea (D-03). Las llamadas reenvían el JWT de la usuaria. Si anotar falla después de crear la clienta, ms-lives la borra para no dejarla suelta.
- **Deshacer y la clienta creada (D-11):** ms-clientas tiene `DELETE /api/clientas/{id}`, que solo funciona durante los primeros 10 minutos después de crear la clienta (columna `creada`). Así cumple D-11 sin servir para borrar fichas con historial. Pasado ese plazo responde 409 y la clienta se desactiva como siempre. Si el borrado falla, Deshacer igual se completa y se deja un aviso en el log. El borrado se pide recién cuando la base confirmó el resto. Del mismo modo, si anotar o cambiar a una clienta nueva falla después de crearla (incluso al confirmar), la clienta se borra. Límite conocido: cualquier usuaria con sesión podría llamar a ese `DELETE` directamente sobre una clienta creada hace menos de 10 minutos. En el paso 7, ms-clientas además revisará en ms-lives que la clienta no tenga líneas.
- **Concurrencia:** `Linea` tiene bloqueo optimista (`@Version`). Si dos usuarias cambian la misma línea al mismo tiempo, la segunda recibe 409 "Intenta de nuevo" en vez de pisar el cambio de la primera. Una anotación nueva anula el Deshacer de las anteriores de esa línea (D-22); el `sesionesService` simulado del front aplica la misma regla.
- **RestClient en vez de WebClient** para las llamadas entre servicios: es el cliente síncrono actual de Spring y viene con Spring Web, sin agregar `spring-boot-starter-webflux`. Reemplaza la mención a WebClient de CLAUDE.md.
- **Errores de ms-clientas:** un 4xx (dato inválido, sesión vencida, sin permiso) llega al front con su código y su mensaje. Si ms-clientas no responde, la respuesta es 503 "No se pudo consultar las clientas". A una clienta desactivada no se le crea una línea nueva (409).
- **Entregas:** la tabla y el modelo ya existen, porque al unir líneas hay que mover y limpiar entregas (D-05, D-19). Registrarlas (RF-10) llega en el paso 6.
- **El front sigue simulado:** conectar lives sin el cierre dejaría el modo real a medias. `sesionesService` y `clientasService` se conectan juntos al terminar el paso 6.

## D-38 · Cierre en ms-lives y front conectado

Paso 6 de `docs/plan-backend.md`.

- **Contrato del cierre** (`ms-lives`, por el gateway):

  ```
  POST  /api/lives/{id}/terminar                       200 → Sesion (En cierre)
  PATCH /api/lives/{id}/lineas/{lineaId}/bolsa         200 → Linea
  PUT   /api/lives/{id}/lineas/{lineaId}/entrega       { tipo, direccion? }   200 → Entrega
  PATCH /api/lives/{id}/lineas/{lineaId}/entrega       { entregaId }          200 → Entrega (sumarse a un despacho)
  PUT   /api/lives/{id}/lineas/{lineaId}/no-pago       { noPago }             200 → Linea
  POST  /api/lives/{id}/finalizar                      200 → Sesion (Cerrada)   409 con lo que falta
  POST  /api/lives/{id}/reabrir                        solo Admin             200 → Sesion (En cierre)
  GET   /api/lives/lineas?clientaId=                   200 → CompraClienta[] (sin clientaId, todas)
  POST  /api/lives/clientas/{clientaId}/sincronizar-nombre                    204 (lo llama ms-clientas)
  ```

- **Reglas** iguales al `sesionesService` simulado (D-25 a D-27). `RevisionCierre` repite las reglas de `revisarCierre`, con prueba unitaria: bolsas sin revisar, líneas Pendientes y Pagadas sin entrega. Las líneas de $0 quedan fuera de pago y entrega. Los mensajes de error son los mismos del front.
- **Dirección del despacho:** ms-lives la guarda en la ficha con `PUT /api/clientas/{id}/direccion` (nuevo en ms-clientas) antes de tocar su base. Si ms-clientas falla, no se guarda nada y se muestra el error. Si en cambio falla después la base de ms-lives, la ficha ya tiene la dirección nueva y la entrega no; reintentar la deja igual, así que se aceptó.
- **Renombrar (D-28):** cada vez que se guarda una ficha, ms-clientas avisa a ms-lives una vez confirmada su transacción. ms-lives lee el nombre de la ficha (no lo recibe de quien llama, así nadie puede poner otro) y lo copia solo en las líneas que tienen otro nombre, avanzando su versión para que un cambio simultáneo no lo pise. Si ms-lives no responde, la ficha queda guardada, se deja un aviso en el log y volver a guardar la ficha lo repara. Las llamadas entre servicios esperan como máximo 2 s para conectar y 5 s para responder.
- **Reabrir:** el rol de Admin se toma del JWT, como desactivar clientas en ms-clientas (D-36).
- **Front:** con `VITE_API_URL`, `sesionesService` y `clientasService` llaman a la API a través de `pedirConSesion` (en `usuariosService`, agrega el token). Sin la variable, siguen con los datos simulados. `deshacerAnotacion` ahora recibe también el id del live. `usuarioConectado()` ya no lee la sesión guardada en modo API, porque nada en ese modo lo usa.
- **Ranking e inactivas (hasta el paso 7):** con la API se calculan en el front, con las mismas funciones de `utils/clientas.ts`, sobre las fichas de ms-clientas, las compras de `GET /api/lives/lineas` y los días configurados. Funcionan, pero traen todo el historial. `ultimaCompra` (D-15) todavía no viene de ms-clientas, así que las sugerencias al anotar no se ordenan por compra reciente en el modo real.
- **Anotar seguido:** con la API, guardar una anotación tarda unos milisegundos. Si en ese tiempo ya escribieron la siguiente, el campo ya no la borra al terminar (`CampoAnotacion`); solo se limpia si el texto sigue siendo el enviado.
- **Prueba de punta a punta:** con MySQL, los cuatro servicios y el front en modo API, se recorrió en Chromium a 360 px un live completo: abrir, anotar clientas nuevas, Deshacer (borró la clienta en ms-clientas), pagar, terminar, bolsas, despacho con dirección, No pagó y cerrar. Después se revisaron la ficha (dirección e historial), Estadísticas y el renombre en las líneas. Sin errores.
