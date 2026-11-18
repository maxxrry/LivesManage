# Arma el frontend y lo sirve con Caddy, que también da HTTPS y pasa /api/* al gateway (Caddyfile).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# URL pública de la app (https://DOMINIO). Sin ella el frontend usaría los datos simulados.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" && npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
