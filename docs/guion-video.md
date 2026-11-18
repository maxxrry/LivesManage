# Guion del video – Despliegue y presentación de LivesManage

Duración sugerida: 8 a 10 minutos. Graba la pantalla con OBS o la Xbox Game Bar (Win + G) y, para el celular, su grabador de pantalla.

**Antes de grabar**

- Ten abiertos: el repo en GitHub, VS Code con el repo, el panel de DigitalOcean, DuckDNS y una terminal.
- **Nunca muestres el `.env` con valores reales**, ni las claves al generarlas. Si hace falta, muestra `.env.example`.
- Si el Droplet ya está creado, puedes mostrar la creación con uno nuevo y borrarlo después, o mostrar el existente explicando cómo se configuró.
- Deja un live de prueba con algunas clientas para la demo, o anótalas en vivo.

| # | Tiempo | Qué se ve | Qué se dice |
| --- | --- | --- | --- |
| 1 | 0:00 – 0:45 | Portada con el nombre del proyecto, y una foto o imagen del cuaderno | "LivesManage es una app web para una tienda de ropa que vende por lives de TikTok. Reemplaza el cuaderno donde se anota, durante el live, quién compra y cuánto, y después guía el cobro, la entrega y el seguimiento de las clientas." |
| 2 | 0:45 – 1:45 | Diagrama de arquitectura de `docs/despliegue.md` | "El frontend es React con TypeScript. El backend son tres microservicios Spring Boot, cada uno con su propia base MySQL, detrás de un API Gateway que valida el token JWT. Todo corre en un servidor de DigitalOcean con Docker Compose, y Caddy entrega el frontend y el HTTPS." |
| 3 | 1:45 – 2:45 | VS Code: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `Caddyfile` | "Un mismo Dockerfile compila los cuatro servicios Java en dos etapas: Maven compila y la imagen final solo lleva el Java de ejecución, con un usuario sin privilegios. El frontend se compila con Node y lo sirve Caddy. En el compose solo Caddy publica los puertos 80 y 443; MySQL y los servicios quedan en la red interna. Los secretos van en un `.env` que nunca se sube al repositorio." |
| 4 | 2:45 – 3:30 | DigitalOcean: crear el Droplet (Docker on Ubuntu 24.04, 4 GB, Nueva York) | "Uso los créditos del GitHub Student Pack. Creo un Droplet con la imagen de Docker sobre Ubuntu, de 4 GB, porque son cuatro servicios Java más MySQL." |
| 5 | 3:30 – 3:50 | DuckDNS: poner la IP del Droplet en el subdominio | "El dominio es gratuito, de DuckDNS. Lo apunto a la IP del servidor para que Caddy pueda obtener el certificado." |
| 6 | 3:50 – 5:00 | Terminal: `ssh`, `ufw`, `git clone`, `cp .env.example .env` (sin mostrar los valores), `docker compose up -d --build` | "Me conecto por SSH y dejo el firewall solo con SSH y web. Descargo el repo, completo el `.env` con claves generadas al azar y levanto todo con un solo comando." (Si la compilación es larga, corta el video y retoma cuando termine.) |
| 7 | 5:00 – 5:30 | `docker compose ps` y `docker compose logs web` con "certificate obtained" | "Los seis contenedores están arriba y Caddy ya obtuvo el certificado HTTPS de Let's Encrypt." |
| 8 | 5:30 – 8:00 | Celular con la URL y el candado. Demo: entrar → Abrir live → anotar `flo 6-6-5`, `ana 5000` y `flo 6 4` (muestra el error) → lápiz → Pagado → Terminar live → Finalizar cierre con No pagó → ficha de la clienta con bolsas y entrega → filtro "Con bolsas en bodega" → Estadísticas | "Así se usa durante un live: se escribe el nombre y los precios como en el cuaderno, la app suma sola y avisa si algo está mal escrito, sin crear clientas duplicadas. Al terminar se cobra y se cierra. Después, en la ficha de cada clienta, se registran sus bolsas y si siguen en bodega, y en Estadísticas se ve lo vendido y quién dejó de comprar." |
| 9 | 8:00 – 8:45 | Computador: la misma app en pantalla grande; menú Usuarios y Cambiar mi contraseña | "Es la misma app en el computador. La Admin gestiona usuarios y cada usuario puede cambiar su contraseña. Las contraseñas se guardan cifradas con BCrypt y la sesión dura 8 horas." |
| 10 | 8:45 – 9:30 | Terminal: la línea del `crontab` de respaldos, y `git pull && docker compose up -d --build` | "Cada noche se respaldan las tres bases y se conservan siete días. Para publicar una versión nueva basta con `git pull` y volver a levantar." |
| 11 | 9:30 – 10:00 | GitHub: las pruebas (Vitest, Playwright, JUnit) y los documentos en `docs/` | "El proyecto tiene pruebas unitarias y de punta a punta para cada requisito, y la documentación completa: el ERS, el manual de usuario y la documentación de la API. Gracias." |

**Consejos**

- Graba cada parte por separado y júntalas después: así un error no obliga a repetir todo.
- Sube el tamaño de la letra de la terminal y de VS Code (Ctrl + +) para que se lea en el video.
- Si `docker compose up --build` tarda, deja la imagen de los registros y corta al resultado.
