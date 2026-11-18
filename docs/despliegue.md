# Despliegue en DigitalOcean – LivesManage

La app corre en un solo servidor (Droplet) con Docker Compose:

```
Internet ──HTTPS──▶ Caddy (web) ──▶ /           → frontend React (archivos estáticos)
                                └─▶ /api/*      → api-gateway :8080 ──▶ ms-auth :8081
                                                                    ├─▶ ms-lives :8082
                                                                    └─▶ ms-clientas :8083
                                                MySQL 8.4 (3 bases) ◀──┘
```

- Solo Caddy queda expuesto (puertos 80 y 443). MySQL, el gateway y los servicios viven en la red interna de Docker.
- Caddy pide y renueva solo el certificado HTTPS (Let's Encrypt).
- Archivos del despliegue: `docker-compose.yml`, `.env.example`, `backend/Dockerfile` (uno para los 4 servicios), `backend/mysql-init.sql`, `frontend/Dockerfile` y `frontend/Caddyfile`.

## 0. Lo que necesitas

- Cuenta en DigitalOcean con los créditos del [GitHub Student Pack](https://education.github.com/pack) (revisa el monto vigente en la página del pack).
- Un dominio. El gratuito más simple es [DuckDNS](https://www.duckdns.org): entras con GitHub y eliges un subdominio, por ejemplo `livesmanage.duckdns.org`.
- Docker Desktop en tu PC, para probar antes (paso 1).

## 1. Probar en tu PC con Docker Desktop

1. Abre Docker Desktop y espera a que diga "Engine running".
2. En la raíz del repo, copia `.env.example` como `.env` y complétalo:
   - `DOMINIO=localhost`
   - El resto con claves de prueba (cada una de 32 caracteres o más; la de la Admin, de al menos 8).
3. Levanta todo:

   ```bash
   docker compose up -d --build
   ```

   La primera vez tarda varios minutos: descarga las imágenes y compila los 4 servicios y el frontend.
4. Revisa que todo esté arriba:

   ```bash
   docker compose ps
   ```

5. Abre <https://localhost>. El navegador avisa que el certificado no es de confianza (Caddy usa uno local para `localhost`): acepta para continuar. Entra con `ADMIN_CORREO` y `ADMIN_CONTRASENA`.
6. Para detener: `docker compose down`. Los datos quedan en el volumen `datos-mysql`; `docker compose down -v` los borra.

## 2. Crear el Droplet

En DigitalOcean: **Create → Droplets**.

| Opción | Qué elegir |
| --- | --- |
| Región | New York (la más cercana a Chile con buena latencia) |
| Imagen | **Marketplace → Docker on Ubuntu 24.04** (trae Docker y Docker Compose instalados) |
| Tamaño | Basic, Regular: **4 GB RAM / 2 vCPU**. Con 2 GB no alcanza para los 4 servicios Java y MySQL |
| Autenticación | **SSH key** (recomendado) o contraseña larga |
| Nombre | `livesmanage` |

Anota la **IP pública** del Droplet.

## 3. Apuntar el dominio

En DuckDNS, escribe la IP del Droplet en tu subdominio y toca **update ip**. Comprueba desde tu PC:

```bash
nslookup livesmanage.duckdns.org
```

Debe responder la IP del Droplet. Sin esto, Caddy no puede obtener el certificado HTTPS.

## 4. Preparar el servidor

Conéctate (reemplaza la IP):

```bash
ssh root@IP_DEL_DROPLET
```

Firewall: solo SSH y web.

```bash
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable && ufw status
```

Si `ufw status` muestra reglas para `2375` o `2376` (las agrega la imagen de Docker), bórralas con `ufw delete allow 2375/tcp` y `ufw delete allow 2376/tcp`.

Memoria de intercambio de 2 GB, para que la primera compilación no se quede sin RAM:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 5. Descargar la app y configurarla

```bash
git clone https://github.com/maxxrry/LivesManage.git /opt/LivesManage
```

Si el repositorio es privado, GitHub pide usuario y un token de acceso (Settings → Developer settings → Personal access tokens) en vez de la contraseña.

```bash
cd /opt/LivesManage && cp .env.example .env
```

Genera una clave distinta para cada secreto (repite el comando por cada una):

```bash
openssl rand -base64 36
```

Edita el `.env` con `nano .env`:

- `DOMINIO`: tu subdominio, sin `https://` (ej: `livesmanage.duckdns.org`).
- `JWT_SECRET`, `DB_CONTRASENA` y `MYSQL_ROOT_PASSWORD`: tres claves generadas.
- `ADMIN_CORREO` y `ADMIN_CONTRASENA`: la primera Admin. Cámbiale la contraseña desde la app apenas entres.

Guarda con Ctrl+O, Enter y sal con Ctrl+X. El `.env` nunca se sube a git.

## 6. Levantar la app

```bash
docker compose up -d --build
```

La primera vez tarda de 10 a 15 minutos. Para ver el avance y los registros:

```bash
docker compose ps
```

```bash
docker compose logs -f web
```

Cuando Caddy obtiene el certificado aparece una línea con `certificate obtained successfully`. Sal de los registros con Ctrl+C (la app sigue corriendo).

## 7. Comprobar

1. Abre `https://TU_DOMINIO` en el celular y en el computador. Debe verse el candado de HTTPS.
2. Entra con la Admin y cambia su contraseña (**Cambiar mi contraseña**).
3. Crea la Vendedora en **Usuarios** y entra con ella en el celular.
4. Abre un live de prueba, anota (`flo 6-6-5`), termínalo y ciérralo.
5. Comprueba que la API exige sesión: abrir `https://TU_DOMINIO/api/lives` en el navegador, sin entrar, responde 401.

## 8. Respaldos diarios (RNF-19)

Crea la carpeta y programa el respaldo de las tres bases a las 23:00, conservando 7 días:

```bash
mkdir -p /root/respaldos && crontab -e
```

Agrega esta línea al final:

```
0 23 * * * cd /opt/LivesManage && docker compose exec -T mysql sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --databases livesmanage_auth livesmanage_lives livesmanage_clientas' | gzip > /root/respaldos/livesmanage_$(date +\%F).sql.gz && find /root/respaldos -name '*.sql.gz' -mtime +7 -delete
```

Para tener una copia fuera del servidor, activa también **Backups** en el Droplet (DigitalOcean guarda una imagen semanal, con costo adicional) o descarga los archivos de vez en cuando:

```bash
scp root@IP_DEL_DROPLET:/root/respaldos/*.sql.gz .
```

Para restaurar un respaldo:

```bash
gunzip -c /root/respaldos/livesmanage_AAAA-MM-DD.sql.gz | docker compose exec -T mysql sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD"'
```

## 9. Actualizar a una versión nueva

```bash
cd /opt/LivesManage && git pull && docker compose up -d --build
```

Docker reconstruye solo lo que cambió. Los datos de MySQL y el certificado se conservan en sus volúmenes.

## 10. Problemas frecuentes

| Qué pasa | Qué revisar |
| --- | --- |
| El navegador no carga o no hay HTTPS | `nslookup TU_DOMINIO` da la IP del Droplet; el firewall permite 80 y 443; `docker compose logs web` |
| "No se pudo conectar con el servidor" | `docker compose ps`: los 4 servicios deben estar `Up`. `docker compose logs api-gateway ms-auth` |
| Un servicio se reinicia solo | `docker compose logs NOMBRE`. Si dice `OutOfMemory`, revisa que el Droplet sea de 4 GB y que exista el swap |
| `falta ... en .env` al levantar | Falta ese valor en el `.env` |
| La primera anotación después de levantar tarda unos segundos | Es normal: recién encendidos, los servicios responden más lento la primera vez (esperan hasta 15 segundos entre ellos). Por eso conviene una anotación de prueba (paso 7) antes del primer live real |
| La Admin no puede entrar | `ADMIN_CORREO` y `ADMIN_CONTRASENA` solo se usan si la tabla de usuarios está vacía; si ya existía, vale la contraseña que tenga |
