# Documentación de la API – LivesManage

Fecha: 17-11-2026 · Generada desde el OpenAPI (Swagger) de cada microservicio.

## 1. Visión general

LivesManage expone una API REST dividida en tres microservicios Spring Boot, detrás de un API Gateway.

| Componente | Puerto local | Base de datos | Requisitos |
| --- | --- | --- | --- |
| api-gateway | 8080 | — | RF-02, RNF-07 |
| ms-auth | 8081 | `livesmanage_auth` | RF-01 a RF-03 |
| ms-lives | 8082 | `livesmanage_lives` | RF-04 a RF-11 |
| ms-clientas | 8083 | `livesmanage_clientas` | RF-12 a RF-14 |

- **URL base:** todas las llamadas del frontend van al gateway, por ejemplo `http://localhost:8080/api/lives`. El gateway enruta `/api/auth/**` y `/api/usuarios/**` a ms-auth, `/api/clientas/**` y `/api/configuracion/**` a ms-clientas, y `/api/lives/**` a ms-lives.
- **Formato:** JSON en UTF-8. Montos en pesos chilenos como enteros (`6000` = $6.000). Fechas en ISO 8601.
- **Swagger UI:** cada servicio publica su documentación interactiva en `/swagger-ui.html` y el OpenAPI en `/v3/api-docs`.

## 2. Autenticación y roles

1. `POST /api/auth/login` con correo y contraseña devuelve un token JWT (HS256, válido 8 horas, RNF-06).
2. Toda otra llamada envía el encabezado `Authorization: Bearer <token>`. El gateway valida el token y cada servicio revisa el rol (RNF-07).
3. Roles: **ADMIN** (administradora) y **VENDEDOR** (vendedora). La columna "Acceso" de cada tabla indica quién puede usar cada ruta.
4. Tras 10 inicios de sesión fallidos desde una misma IP en 15 minutos, el gateway responde 429 hasta que pase la ventana.

## 3. Errores

Todos los errores tienen la misma forma:

```json
{ "mensaje": "La línea no existe.", "campos": { "precios": "Precios no válidos." } }
```

`campos` solo aparece en errores de validación, con el mensaje de cada campo.

| Código | Cuándo |
| --- | --- |
| 400 | Datos inválidos (Bean Validation o reglas de formato) |
| 401 | Sin token, token vencido o inválido |
| 403 | El rol no tiene permiso (ej: la vendedora en `/api/usuarios`) |
| 404 | El recurso no existe |
| 409 | Regla del dominio (ej: ya hay un live Abierto, el live está Cerrado, quedan líneas Pendientes) |
| 429 | Demasiados inicios de sesión fallidos |

## 4. ms-auth: usuarios y sesión

Puerto local 8081, base `livesmanage_auth`, RF-01 a RF-03.

| Método | Ruta | Descripción | Acceso | Éxito |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Iniciar sesión (RF-01) | Pública | 200 |
| GET | `/api/auth/yo` | Usuario de la sesión, con sus datos al día | Admin y Vendedora | 200 |
| GET | `/api/usuarios` | Listar usuarios, ordenados por nombre | Solo Admin | 200 |
| POST | `/api/usuarios` | Crear un usuario con su contraseña inicial | Solo Admin | 201 |
| PUT | `/api/usuarios/{id}` | Editar nombre, correo y rol | Solo Admin | 200 |
| PATCH | `/api/usuarios/{id}/activo` | Desactivar o reactivar | Solo Admin | 200 |

### 4.1 POST `/api/auth/login`

Iniciar sesión (RF-01). 401 con un mensaje genérico si el correo no existe, la contraseña no coincide o el usuario está desactivado.

- **Acceso:** Pública
- **Respuesta exitosa:** 200 con `LoginResponse`
- **Cuerpo:** `LoginRequest`

### 4.2 GET `/api/auth/yo`

Usuario de la sesión, con sus datos al día.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `UsuarioDto`

### 4.3 GET `/api/usuarios`

Listar usuarios, ordenados por nombre.

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `UsuarioDto[]`

### 4.4 POST `/api/usuarios`

Crear un usuario con su contraseña inicial. 409 si el correo ya existe.

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 201 con `UsuarioDto`
- **Cuerpo:** `NuevoUsuario`

### 4.5 PUT `/api/usuarios/{id}`

Editar nombre, correo y rol. 409 si el correo ya existe o si la Admin intenta cambiar su propio rol.

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `UsuarioDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `EdicionUsuario`

### 4.6 PATCH `/api/usuarios/{id}/activo`

Desactivar o reactivar. 409 si la Admin intenta desactivarse a sí misma.

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `UsuarioDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `CambioActivo`

### Modelos de ms-auth

**CambioActivo**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `activo` | booleano | sí |  |

**EdicionUsuario**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nombre` | texto | sí | largo máx. 100 |
| `correo` | texto (correo) | sí | largo máx. 254 |
| `rol` | ADMIN \| VENDEDOR | sí |  |

**LoginRequest**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `correo` | texto (correo) | sí | largo máx. 254 |
| `contrasena` | texto | sí | largo mín. 1 |

**LoginResponse**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `token` | texto | no |  |
| `usuario` | UsuarioDto | no |  |

**NuevoUsuario**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nombre` | texto | sí | largo máx. 100 |
| `correo` | texto (correo) | sí | largo máx. 254 |
| `rol` | ADMIN \| VENDEDOR | sí |  |
| `contrasena` | texto | sí | largo mín. 8 |

**UsuarioDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `nombre` | texto | no |  |
| `correo` | texto | no |  |
| `rol` | ADMIN \| VENDEDOR | no |  |
| `activo` | booleano | no |  |

## 5. ms-lives: lives, líneas, prendas, cierre

Puerto local 8082, base `livesmanage_lives`, RF-04 a RF-11.

| Método | Ruta | Descripción | Acceso | Éxito |
| --- | --- | --- | --- | --- |
| GET | `/api/lives` | Lives con sus totales, el más reciente primero (RF-04) | Admin y Vendedora | 200 |
| POST | `/api/lives` | Abrir un live (RF-04) | Admin y Vendedora | 201 |
| GET | `/api/lives/{id}` | Un live con su hoja completa (RF-08) | Admin y Vendedora | 200 |
| POST | `/api/lives/{id}/anotaciones` | Anotar una compra (RF-05) | Admin y Vendedora | 201 |
| DELETE | `/api/lives/{id}/anotaciones/{anotacionId}` | Deshacer una anotación (D-11) | Admin y Vendedora | 204 |
| POST | `/api/lives/{id}/finalizar` | Finalizar el cierre (RF-11) | Admin y Vendedora | 200 |
| PUT | `/api/lives/{id}/lineas/{lineaId}/bolsas` | Bolsas de la clienta y si ya se entregaron (D-47) | Admin y Vendedora | 200 |
| PATCH | `/api/lives/{id}/lineas/{lineaId}/clienta` | Cambiar la clienta de una línea; si ya tenía línea, se unen (RF-06, D-19) | Admin y Vendedora | 200 |
| PUT | `/api/lives/{id}/lineas/{lineaId}/entrega` | Registrar la forma de entrega (RF-10, D-47) | Admin y Vendedora | 200 |
| PUT | `/api/lives/{id}/lineas/{lineaId}/no-pago` | Marcar No pagó o volver a Pendiente (RF-11) | Admin y Vendedora | 200 |
| PATCH | `/api/lives/{id}/lineas/{lineaId}/pago` | Pasar la línea de Pendiente a Pagado o al revés (RF-07) | Admin y Vendedora | 200 |
| PATCH | `/api/lives/{id}/lineas/{lineaId}/prendas/{prendaId}` | Cancelar o restaurar una prenda (RF-06) | Admin y Vendedora | 200 |
| POST | `/api/lives/{id}/reabrir` | Reabrir un live Cerrado (solo Admin, RF-11) | Solo Admin | 200 |
| POST | `/api/lives/{id}/terminar` | Terminar el live: pasa de Abierta a En cierre (RF-09) | Admin y Vendedora | 200 |
| POST | `/api/lives/clientas/{clientaId}/sincronizar-nombre` | Igualar el nombre de la clienta en sus líneas al de su ficha (lo llama ms-clientas al editarla, D-28) *(entre servicios)* | Admin y Vendedora | 204 |
| GET | `/api/lives/compras-por-clienta` | Compras por clienta para el ranking y las inactivas (lo llama ms-clientas, D-42) *(entre servicios)* | Admin y Vendedora | 200 |
| GET | `/api/lives/en-bodega` | Clientas con bolsas en bodega (D-47) | Admin y Vendedora | 200 |
| GET | `/api/lives/lineas` | Líneas de una clienta con su live y su entrega, el live más reciente primero | Admin y Vendedora | 200 |

### 5.1 GET `/api/lives`

Lives con sus totales, el más reciente primero (RF-04).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `SesionResumenDto[]`

### 5.2 POST `/api/lives`

Abrir un live (RF-04). 409 si ya hay uno Abierto.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 201 con `SesionDto`
- **Cuerpo:** `NuevaSesion`

### 5.3 GET `/api/lives/{id}`

Un live con su hoja completa (RF-08).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `SesionDetalleDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 5.4 POST `/api/lives/{id}/anotaciones`

Anotar una compra (RF-05). Suma a la línea de la clienta o la crea; con { nuevaClienta } también crea la clienta.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 201 con `ResultadoAnotar`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `NuevaAnotacion`

### 5.5 DELETE `/api/lives/{id}/anotaciones/{anotacionId}`

Deshacer una anotación (D-11). 409 si la línea cambió después (D-22) o el live ya no está Abierto.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 204 sin cuerpo
- **Parámetros:** `id` (ruta, texto, obligatorio), `anotacionId` (ruta, texto, obligatorio)

### 5.6 POST `/api/lives/{id}/finalizar`

Finalizar el cierre (RF-11). 409 si quedan líneas Pendientes.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `SesionDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 5.7 PUT `/api/lives/{id}/lineas/{lineaId}/bolsas`

Bolsas de la clienta y si ya se entregaron (D-47). En cierre o Cerrado.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `LineaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio)
- **Cuerpo:** `DatosBolsas`

### 5.8 PATCH `/api/lives/{id}/lineas/{lineaId}/clienta`

Cambiar la clienta de una línea; si ya tenía línea, se unen (RF-06, D-19).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `LineaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio)
- **Cuerpo:** `Destino`

### 5.9 PUT `/api/lives/{id}/lineas/{lineaId}/entrega`

Registrar la forma de entrega (RF-10, D-47). En cierre o Cerrado. Despacho exige dirección, que queda en la ficha de la clienta.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `EntregaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio)
- **Cuerpo:** `DatosEntrega`

### 5.10 PUT `/api/lives/{id}/lineas/{lineaId}/no-pago`

Marcar No pagó o volver a Pendiente (RF-11). Solo En cierre y sobre líneas no Pagadas.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `LineaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio)
- **Cuerpo:** `CambioNoPago`

### 5.11 PATCH `/api/lives/{id}/lineas/{lineaId}/pago`

Pasar la línea de Pendiente a Pagado o al revés (RF-07).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `LineaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio)

### 5.12 PATCH `/api/lives/{id}/lineas/{lineaId}/prendas/{prendaId}`

Cancelar o restaurar una prenda (RF-06).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `LineaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio), `lineaId` (ruta, texto, obligatorio), `prendaId` (ruta, texto, obligatorio)

### 5.13 POST `/api/lives/{id}/reabrir`

Reabrir un live Cerrado (solo Admin, RF-11).

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `SesionDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 5.14 POST `/api/lives/{id}/terminar`

Terminar el live: pasa de Abierta a En cierre (RF-09).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `SesionDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 5.15 POST `/api/lives/clientas/{clientaId}/sincronizar-nombre`

Igualar el nombre de la clienta en sus líneas al de su ficha (lo llama ms-clientas al editarla, D-28).

- **Acceso:** Admin y Vendedora (la usa otro microservicio)
- **Respuesta exitosa:** 204 sin cuerpo
- **Parámetros:** `clientaId` (ruta, texto, obligatorio)

### 5.16 GET `/api/lives/compras-por-clienta`

Compras por clienta para el ranking y las inactivas (lo llama ms-clientas, D-42). Solo líneas Pagadas de más de $0 en lives Cerrados. Período en días de Chile (aaaa-mm-dd), opcional.

- **Acceso:** Admin y Vendedora (la usa otro microservicio)
- **Respuesta exitosa:** 200 con `ResumenCompras[]`
- **Parámetros:** `desde` (consulta, texto (fecha aaaa-mm-dd)), `hasta` (consulta, texto (fecha aaaa-mm-dd))

### 5.17 GET `/api/lives/en-bodega`

Clientas con bolsas en bodega (D-47).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `BolsasEnBodega[]`

### 5.18 GET `/api/lives/lineas`

Líneas de una clienta con su live y su entrega, el live más reciente primero.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `CompraClienta[]`
- **Parámetros:** `clientaId` (consulta, texto, obligatorio)

### Modelos de ms-lives

**BolsasEnBodega**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `clientaId` | texto | no |  |
| `bolsas` | entero | no |  |

**CambioNoPago**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `noPago` | booleano | sí |  |

**CambioPagoDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `fecha` | texto | no |  |
| `usuarioId` | texto | no |  |

**CompraClienta**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `sesion` | SesionDto | no |  |
| `linea` | LineaDto | no |  |
| `entrega` | EntregaDto | no |  |

**DatosBolsas**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `bolsas` | entero | no | mín. 0, máx. 99 |
| `entregada` | booleano | no |  |

**DatosEntrega**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `tipo` | DESPACHO \| RETIRO \| FERIA | sí |  |
| `direccion` | DireccionDto | no |  |

**Destino**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `clientaId` | texto | no | largo máx. 36 |
| `nuevaClienta` | texto | no | largo máx. 100 |
| `unoSolo` | booleano | no |  |

**DireccionDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `calle` | texto | sí | largo máx. 200 |
| `comuna` | texto | sí | largo máx. 100 |
| `region` | texto | no | largo máx. 100 |
| `referencia` | texto | no | largo máx. 200 |

**EntregaDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `sesionId` | texto | no |  |
| `tipo` | DESPACHO \| RETIRO \| FERIA | no |  |
| `direccion` | DireccionDto | no |  |

**LineaDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `sesionId` | texto | no |  |
| `clientaId` | texto | no |  |
| `clientaNombre` | texto | no |  |
| `prendas` | PrendaDto[] | no |  |
| `estadoPago` | PENDIENTE \| PAGADO \| NO_PAGO | no |  |
| `pagoActualizado` | CambioPagoDto | no |  |
| `bolsas` | entero | no |  |
| `entregada` | booleano | no |  |
| `entregaId` | texto | no |  |
| `actualizada` | texto | no |  |

**NuevaAnotacion**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `destino` | Destino | sí |  |
| `precios` | entero[] | sí | al menos 0, hasta 50 |

**NuevaSesion**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nombre` | texto | no | largo máx. 100 |

**PrendaDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `precio` | entero | no |  |
| `estado` | VIGENTE \| CANCELADA | no |  |

**ResultadoAnotar**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `anotacionId` | texto | no |  |
| `linea` | LineaDto | no |  |

**ResumenCompras**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `clientaId` | texto | no |  |
| `totalGastado` | entero | no |  |
| `compras` | entero | no |  |
| `ultimaCompra` | texto (fecha y hora ISO) | no |  |

**SesionDetalleDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `sesion` | SesionDto | no |  |
| `lineas` | LineaDto[] | no |  |
| `entregas` | EntregaDto[] | no |  |

**SesionDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `nombre` | texto | no |  |
| `inicio` | texto | no |  |
| `estado` | ABIERTA \| EN_CIERRE \| CERRADA | no |  |

**SesionResumenDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `nombre` | texto | no |  |
| `inicio` | texto | no |  |
| `estado` | ABIERTA \| EN_CIERRE \| CERRADA | no |  |
| `clientas` | entero | no |  |
| `total` | entero | no |  |
| `totalPagado` | entero | no |  |

## 6. ms-clientas: fichas y estadísticas

Puerto local 8083, base `livesmanage_clientas`, RF-12 a RF-14.

| Método | Ruta | Descripción | Acceso | Éxito |
| --- | --- | --- | --- | --- |
| GET | `/api/clientas` | Listar clientas (también las desactivadas), por nombre | Admin y Vendedora | 200 |
| POST | `/api/clientas` | Registrar una clienta | Admin y Vendedora | 201 |
| GET | `/api/clientas/{id}` | Ficha de una clienta | Admin y Vendedora | 200 |
| PUT | `/api/clientas/{id}` | Editar una clienta; un campo vacío se borra | Admin y Vendedora | 200 |
| DELETE | `/api/clientas/{id}` | Borrar una clienta recién creada (Deshacer de una anotación, D-11) *(entre servicios)* | Admin y Vendedora | 204 |
| PATCH | `/api/clientas/{id}/activa` | Desactivar o reactivar (solo Admin) | Solo Admin | 200 |
| PUT | `/api/clientas/{id}/direccion` | Guardar la dirección de un despacho en la ficha (RF-10; lo llama ms-lives) *(entre servicios)* | Admin y Vendedora | 200 |
| GET | `/api/clientas/{id}/indicadores` | Indicadores de la ficha | Admin y Vendedora | 200 |
| GET | `/api/clientas/duplicados` | Otra clienta con el mismo usuario de TikTok o teléfono (avisa, no bloquea) | Admin y Vendedora | 200 |
| GET | `/api/clientas/inactivas` | Clientas activas sin comprar hace más de los días configurados | Admin y Vendedora | 200 |
| GET | `/api/clientas/ranking` | Ranking por total gastado o por compras | Admin y Vendedora | 200 |
| GET | `/api/configuracion/dias-inactividad` | Días sin comprar para que una clienta cuente como inactiva | Admin y Vendedora | 200 |
| PUT | `/api/configuracion/dias-inactividad` | Cambiar los días de inactividad (solo Admin, 1 a 365) | Solo Admin | 200 |

### 6.1 GET `/api/clientas`

Listar clientas (también las desactivadas), por nombre.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `ClientaDto[]`

### 6.2 POST `/api/clientas`

Registrar una clienta.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 201 con `ClientaDto`
- **Cuerpo:** `DatosClienta`

### 6.3 GET `/api/clientas/{id}`

Ficha de una clienta.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `ClientaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 6.4 PUT `/api/clientas/{id}`

Editar una clienta; un campo vacío se borra.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `ClientaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `DatosClienta`

### 6.5 DELETE `/api/clientas/{id}`

Borrar una clienta recién creada (Deshacer de una anotación, D-11). 409 si se creó hace más de 10 minutos: después, una clienta solo se desactiva.

- **Acceso:** Admin y Vendedora (la usa otro microservicio)
- **Respuesta exitosa:** 204 sin cuerpo
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 6.6 PATCH `/api/clientas/{id}/activa`

Desactivar o reactivar (solo Admin).

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `ClientaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `CambioActiva`

### 6.7 PUT `/api/clientas/{id}/direccion`

Guardar la dirección de un despacho en la ficha (RF-10; lo llama ms-lives).

- **Acceso:** Admin y Vendedora (la usa otro microservicio)
- **Respuesta exitosa:** 200 con `ClientaDto`
- **Parámetros:** `id` (ruta, texto, obligatorio)
- **Cuerpo:** `DireccionDto`

### 6.8 GET `/api/clientas/{id}/indicadores`

Indicadores de la ficha. Solo cuentan los lives Cerrados. Una compra es una línea Pagada de más de $0.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `IndicadoresClienta`
- **Parámetros:** `id` (ruta, texto, obligatorio)

### 6.9 GET `/api/clientas/duplicados`

Otra clienta con el mismo usuario de TikTok o teléfono (avisa, no bloquea).

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `Duplicados`
- **Parámetros:** `usuarioTiktok` (consulta, texto), `telefono` (consulta, texto), `excluirId` (consulta, texto)

### 6.10 GET `/api/clientas/inactivas`

Clientas activas sin comprar hace más de los días configurados.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `ClientaInactiva[]`

### 6.11 GET `/api/clientas/ranking`

Ranking por total gastado o por compras. Período en días de calendario de Chile (aaaa-mm-dd), con ambos extremos incluidos.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `PosicionRanking[]`
- **Parámetros:** `criterio` (consulta, TOTAL | COMPRAS, obligatorio), `desde` (consulta, texto (fecha aaaa-mm-dd), obligatorio), `hasta` (consulta, texto (fecha aaaa-mm-dd), obligatorio)

### 6.12 GET `/api/configuracion/dias-inactividad`

Días sin comprar para que una clienta cuente como inactiva.

- **Acceso:** Admin y Vendedora
- **Respuesta exitosa:** 200 con `DiasInactividad`

### 6.13 PUT `/api/configuracion/dias-inactividad`

Cambiar los días de inactividad (solo Admin, 1 a 365).

- **Acceso:** Solo Admin
- **Respuesta exitosa:** 200 con `DiasInactividad`
- **Cuerpo:** `DiasInactividad`

### Modelos de ms-clientas

**CambioActiva**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `activa` | booleano | sí |  |

**ClientaDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `id` | texto | no |  |
| `nombre` | texto | no |  |
| `usuarioTiktok` | texto | no |  |
| `telefono` | texto | no |  |
| `direccion` | DireccionDto | no |  |
| `activa` | booleano | no |  |
| `ultimaCompra` | texto (fecha y hora ISO) | no |  |

**ClientaInactiva**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `clienta` | ClientaDto | no |  |
| `ultimaCompra` | texto (fecha y hora ISO) | no |  |
| `diasSinComprar` | entero | no |  |

**DatosClienta**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `nombre` | texto | sí | largo máx. 100 |
| `usuarioTiktok` | texto | no | largo máx. 60 |
| `telefono` | texto | no | largo máx. 30 |
| `direccion` | DireccionDto | no |  |

**DiasInactividad**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `dias` | entero | sí | mín. 1, máx. 365 |

**DireccionDto**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `calle` | texto | sí | largo máx. 200 |
| `comuna` | texto | sí | largo máx. 100 |
| `region` | texto | no | largo máx. 100 |
| `referencia` | texto | no | largo máx. 200 |

**Duplicados**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `tiktok` | ClientaDto | no |  |
| `telefono` | ClientaDto | no |  |

**IndicadoresClienta**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `totalGastado` | entero | no |  |
| `compras` | entero | no |  |
| `ticketPromedio` | entero | no |  |
| `ultimaCompra` | texto (fecha y hora ISO) | no |  |
| `prendasCanceladas` | entero | no |  |
| `livesSinPago` | entero | no |  |

**PosicionRanking**

| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |
| `clienta` | ClientaDto | no |  |
| `totalGastado` | entero | no |  |
| `compras` | entero | no |  |

