#!/usr/bin/env bash
# RNF-19 (D-44): respalda las tres bases en un solo archivo, con una misma foto de los datos, y conserva los 7 días más nuevos.
# Corre en Windows con Git Bash y en un servidor Linux. Usuario y contraseña: variables de entorno o backend/ms-lives/.env.
set -u
umask 077 # tienen datos personales: en un servidor, otras cuentas no deben poder leerlos
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
DESTINO=${RESPALDOS_DIR:-$RAIZ/respaldos}
CONSERVAR=7

leer_env() { grep -E "^$1=" "$RAIZ/backend/ms-lives/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r'; }
DB_USUARIO=${DB_USUARIO:-$(leer_env DB_USUARIO)}
# Por variable de entorno: en la línea de comandos, cualquier programa del equipo podría verla.
export MYSQL_PWD=${DB_CONTRASENA:-$(leer_env DB_CONTRASENA)}

if [ -z "${MYSQLDUMP:-}" ]; then
  MYSQLDUMP=$(command -v mysqldump || ls "/c/Program Files/MySQL"/*/bin/mysqldump.exe 2>/dev/null | tail -1)
fi

mkdir -p "$DESTINO"
rm -f "$DESTINO"/diario_*.sql.parcial # lo que haya dejado una corrida interrumpida, por ejemplo un apagón
ARCHIVO=$DESTINO/diario_$(date +%F_%H%M).sql
PARCIAL=$ARCHIVO.parcial

registrar() { echo "$(date '+%F %T') $1" >> "$DESTINO/respaldo.log"; }
fallar() {
  rm -f "$PARCIAL"
  registrar "ERROR: $1"
  echo "Respaldo fallido: $1. Ver $DESTINO/respaldo.log" >&2
  exit 1
}

[ -n "$MYSQLDUMP" ] || fallar "no se encontró mysqldump"
[ -n "$DB_USUARIO" ] || fallar "falta DB_USUARIO"

"$MYSQLDUMP" --user="$DB_USUARIO" --single-transaction --no-tablespaces --default-character-set=utf8mb4 \
  --result-file="$PARCIAL" --databases livesmanage_auth livesmanage_clientas livesmanage_lives 2>> "$DESTINO/respaldo.log" \
  || fallar "mysqldump terminó con error"
# shortcut: usa el MySQL local e ignora DB_URL; agregar --host si al desplegar la base queda en otro equipo.
# mysqldump escribe esta línea al final: sin ella, el archivo quedó cortado.
tail -n 1 "$PARCIAL" | grep -q '^-- Dump completed' || fallar "el respaldo quedó incompleto"
mv "$PARCIAL" "$ARCHIVO" || fallar "no se pudo guardar el archivo"

# Se cuentan los días que tienen respaldo, no el calendario: con el PC apagado varias semanas, por fecha se borrarían todos.
ls -1 "$DESTINO"/diario_*.sql | sort -r \
  | awk -F'diario_' -v n="$CONSERVAR" '{ dia = substr($NF, 1, 10); if (dia != ultimo) { ultimo = dia; dias++ } if (dias > n) print }' \
  | while read -r antiguo; do rm -f "$antiguo" || registrar "AVISO: no se pudo borrar $(basename "$antiguo")"; done
registrar "OK $(basename "$ARCHIVO")"
echo "Respaldo listo: $ARCHIVO"
