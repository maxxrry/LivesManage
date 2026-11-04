#!/usr/bin/env bash
# Prueba de respaldar.sh con un mysqldump falso: no necesita MySQL ni toca respaldos reales.
# Uso: bash scripts/respaldar.test.sh
set -u
AQUI=$(cd "$(dirname "$0")" && pwd)
fallas=0

ver() { # ver "descripción" condición...
  local nombre=$1; shift
  if "$@"; then echo "OK    $nombre"; else echo "FALLA $nombre"; fallas=$((fallas + 1)); fi
}

TEMPORAL=$(mktemp -d)
trap 'rm -rf "$TEMPORAL"' EXIT

# Según $STUB: ok escribe un respaldo completo, cortado no termina de escribirlo y falla sale con error dejando un trozo.
cat > "$TEMPORAL/mysqldump-falso" <<'FALSO'
#!/usr/bin/env bash
echo "$*" > "$ARGUMENTOS"
printf '%s' "$MYSQL_PWD" > "$ARGUMENTOS.clave"
for a in "$@"; do case "$a" in --result-file=*) salida=${a#--result-file=} ;; esac; done
case "$STUB" in
  ok) printf 'datos\n-- Dump completed on 2026-11-04\n' > "$salida" ;;
  cortado) printf 'datos a medias\n' > "$salida" ;;
  falla) printf 'datos a medias\n' > "$salida"; exit 2 ;;
esac
FALSO
chmod +x "$TEMPORAL/mysqldump-falso"

respaldar() { # respaldar <modo>
  STUB=$1 ARGUMENTOS="$TEMPORAL/args" RESPALDOS_DIR="$TEMPORAL/r" MYSQLDUMP="$TEMPORAL/mysqldump-falso" \
    DB_USUARIO=usuario DB_CONTRASENA=secreta bash "$AQUI/respaldar.sh" >/dev/null 2>&1
}
diarios() { ls -1 "$TEMPORAL/r"/diario_*.sql 2>/dev/null | wc -l | tr -d ' '; }
igual() { [ "$1" = "$2" ]; }

# Un respaldo correcto queda completo y sin archivos a medias.
respaldar ok; codigo=$?
ver "un respaldo correcto termina sin error" igual "$codigo" 0
ver "deja un archivo" igual "$(diarios)" 1
ver "no deja archivos a medias" igual "$(ls -1 "$TEMPORAL/r"/*.parcial 2>/dev/null | wc -l | tr -d ' ')" 0
ver "incluye las tres bases" grep -q "livesmanage_auth livesmanage_clientas livesmanage_lives" "$TEMPORAL/args"
if grep -q secreta "$TEMPORAL/args"; then visible=si; else visible=no; fi
ver "la contraseña no va en la línea de comandos" igual "$visible" no

# La contraseña llega a mysqldump, y un resto de una corrida interrumpida no queda para siempre.
ver "la contraseña llega por variable de entorno" igual "$(cat "$TEMPORAL/args.clave")" secreta
echo "datos personales" > "$TEMPORAL/r/diario_2026-01-01_2300.sql.parcial"
respaldar ok
ver "limpia lo que dejó una corrida interrumpida" test ! -e "$TEMPORAL/r/diario_2026-01-01_2300.sql.parcial"

# Sin variables de entorno usa el .env, que en Windows trae finales de línea \r\n.
mkdir -p "$TEMPORAL/copia/scripts" "$TEMPORAL/copia/backend/ms-lives"
cp "$AQUI/respaldar.sh" "$TEMPORAL/copia/scripts/"
printf 'DB_USUARIO=del_env\r\nDB_CONTRASENA=clave=con=iguales\r\n' > "$TEMPORAL/copia/backend/ms-lives/.env"
STUB=ok ARGUMENTOS="$TEMPORAL/args-env" MYSQLDUMP="$TEMPORAL/mysqldump-falso" bash "$TEMPORAL/copia/scripts/respaldar.sh" >/dev/null 2>&1
ver "lee el usuario del .env" grep -q -- "--user=del_env " "$TEMPORAL/args-env"
ver "lee la contraseña del .env, sin el \\r" igual "$(cat "$TEMPORAL/args-env.clave")" "clave=con=iguales"

# Muchas corridas el mismo día no borran los días anteriores (RNF-19).
rm -f "$TEMPORAL/r"/diario_*.sql
echo ayer > "$TEMPORAL/r/diario_2026-01-01_2300.sql"
for m in 01 02 03 04 05 06 07 08 09; do echo hoy > "$TEMPORAL/r/diario_2026-01-02_10$m.sql"; done
respaldar ok
ver "varias corridas en un día no borran el día anterior" test -e "$TEMPORAL/r/diario_2026-01-01_2300.sql"

# Conserva los 7 días con respaldo más nuevos, aunque el PC haya estado apagado semanas: no se mira la fecha de hoy.
rm -f "$TEMPORAL/r"/diario_*.sql
for d in 01 02 03 04 05 06 07 08 09; do echo viejo > "$TEMPORAL/r/diario_2026-01-${d}_2300.sql"; done
echo manual > "$TEMPORAL/r/livesmanage_2026-10-17_1650.sql"
respaldar ok
ver "conserva 7 días" igual "$(diarios)" 7
ver "borra los más antiguos" test ! -e "$TEMPORAL/r/diario_2026-01-03_2300.sql"
ver "mantiene los más nuevos" test -e "$TEMPORAL/r/diario_2026-01-09_2300.sql"
ver "no toca los respaldos manuales" test -e "$TEMPORAL/r/livesmanage_2026-10-17_1650.sql"

# Un respaldo fallido o incompleto no reemplaza ni borra nada, y queda registrado.
for modo in falla cortado; do
  antes=$(diarios)
  respaldar "$modo"; codigo=$?
  ver "$modo: termina con error" test "$codigo" -ne 0
  ver "$modo: no agrega ni borra respaldos" igual "$(diarios)" "$antes"
  ver "$modo: no deja archivos a medias" igual "$(ls -1 "$TEMPORAL/r"/*.parcial 2>/dev/null | wc -l | tr -d ' ')" 0
  ver "$modo: lo anota en el registro" grep -q "ERROR" "$TEMPORAL/r/respaldo.log"
  : > "$TEMPORAL/r/respaldo.log"
done

[ "$fallas" -eq 0 ] && echo "Todo bien" || { echo "$fallas prueba(s) fallaron"; exit 1; }
