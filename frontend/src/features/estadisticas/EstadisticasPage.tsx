import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { rankingClientas } from '../../services/clientasService';
import type { CriterioRanking, PosicionRanking } from '../../utils/clientas';
import { diaChile, restarMeses, textoDia } from '../../utils/fechas';
import { formatearClp } from '../../utils/montos';
import { Desactivada } from '../clientas/ClientasPage';
import { Inactivas } from '../clientas/Inactivas';
import { ResumenLives } from './ResumenLives';

interface OpcionesProps<T extends string> {
  etiqueta?: string;
  /** En vez de `etiqueta`, el id de un texto visible que nombra al grupo. */
  etiquetadoPor?: string;
  opciones: readonly (readonly [T, string])[];
  valor: T | null;
  onElegir: (valor: T) => void;
}

/** Botones excluyentes (aria-pressed), como la forma de entrega del cierre. */
function Opciones<T extends string>({ etiqueta, etiquetadoPor, opciones, valor, onElegir }: OpcionesProps<T>) {
  return (
    // flex-wrap: con letra grande o zoom, los botones bajan de línea en vez de causar scroll horizontal.
    <div role="group" aria-label={etiqueta} aria-labelledby={etiquetadoPor} className="flex flex-wrap gap-1">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          aria-pressed={valor === clave}
          onClick={() => onElegir(clave)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-full border px-2 text-sm font-semibold sm:flex-none sm:px-4 ${
            valor === clave ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

/** Pestañas de la pantalla: control segmentado, distinto de los filtros. */
function Pestanas<T extends string>({ etiqueta, opciones, valor, onElegir }: OpcionesProps<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex rounded-lg bg-gray-200/70 p-1 sm:inline-flex">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          aria-pressed={valor === clave}
          onClick={() => onElegir(clave)}
          className={`min-h-11 flex-1 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-marca-600 ${
            valor === clave ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

const VISTAS = [
  ['lives', 'Lives'],
  ['ranking', 'Ranking'],
  ['inactivas', 'Inactivas'],
] as const;

const PERIODOS = [
  ['mes', 'Este mes'],
  ['3', '3 meses'],
  ['12', '12 meses'],
  ['otro', 'Otro…'],
] as const;
type Atajo = Exclude<(typeof PERIODOS)[number][0], 'otro'>;

interface Rango {
  desde: string;
  hasta: string;
}

function rangoDe(atajo: Atajo, hoy: string): Rango {
  return { desde: atajo === 'mes' ? `${hoy.slice(0, 8)}01` : restarMeses(hoy, Number(atajo)), hasta: hoy };
}

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none';

/** RF-14 y D-32: estadísticas de lives, ranking de clientas e inactivas. El período lo comparten Lives y Ranking. */
export function EstadisticasPage() {
  const [vista, setVista] = useState<(typeof VISTAS)[number][0]>('lives');
  const [hoy] = useState(() => diaChile(new Date()));
  const [rango, setRango] = useState(() => rangoDe('3', hoy));
  const [fechasAMano, setFechasAMano] = useState(false);
  const fechasCompletas = Boolean(rango.desde && rango.hasta);
  const rangoValido = fechasCompletas && rango.desde <= rango.hasta;

  const atajo = PERIODOS.find(([clave]) => {
    if (clave === 'otro') return false;
    const r = rangoDe(clave, hoy);
    return r.desde === rango.desde && r.hasta === rango.hasta;
  })?.[0];
  const periodo = fechasAMano || !atajo ? 'otro' : atajo;

  return (
    <Pantalla titulo="Estadísticas">
      <div className="mt-3 space-y-4">
        <Pestanas etiqueta="Vista" opciones={VISTAS} valor={vista} onElegir={setVista} />

        {vista === 'inactivas' ? (
          <Inactivas />
        ) : (
          <>
            <div className="space-y-3">
              <Opciones
                etiqueta="Período"
                opciones={PERIODOS}
                valor={periodo}
                onElegir={(p) => {
                  setFechasAMano(p === 'otro');
                  if (p !== 'otro') setRango(rangoDe(p, hoy));
                }}
              />
              {periodo === 'otro' && (
                <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                  <label className="block text-sm font-medium">
                    Desde
                    <input
                      type="date"
                      value={rango.desde}
                      max={hoy}
                      onChange={(e) => setRango({ ...rango, desde: e.target.value })}
                      className={ENTRADA}
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Hasta
                    <input
                      type="date"
                      value={rango.hasta}
                      max={hoy}
                      onChange={(e) => setRango({ ...rango, hasta: e.target.value })}
                      className={ENTRADA}
                    />
                  </label>
                </div>
              )}
              {rangoValido && (
                <p className="text-sm text-gray-500">
                  Del {textoDia(rango.desde)} al {textoDia(rango.hasta)}.{' '}
                  {vista === 'lives' ? 'Cuentan solo los lives cerrados.' : 'Cuentan las compras pagadas en lives cerrados.'}
                </p>
              )}
            </div>

            {!rangoValido ? (
              <p role="alert" className="text-sm text-red-700">
                {fechasCompletas
                  ? 'Elige un período válido: la fecha "Desde" no puede ser posterior a "Hasta".'
                  : 'Completa las fechas "Desde" y "Hasta".'}
              </p>
            ) : vista === 'lives' ? (
              <ResumenLives rango={rango} />
            ) : (
              <Ranking rango={rango} />
            )}
          </>
        )}
      </div>
    </Pantalla>
  );
}

const CRITERIOS = [
  ['TOTAL', 'Total gastado'],
  ['COMPRAS', 'Compras'],
] as const;

/** Ranking por total gastado o por compras en el período elegido (D-30). */
function Ranking({ rango }: { rango: Rango }) {
  const [criterio, setCriterio] = useState<CriterioRanking>('TOTAL');
  const idOrden = useId();
  // Cada resultado guarda la consulta que lo pidió: al cambiar el orden o el período, el anterior no se muestra.
  const [resultado, setResultado] = useState<{ consulta: string; ranking: PosicionRanking[] } | null>(null);
  const [error, setError] = useState('');
  const consulta = `${criterio} ${rango.desde} ${rango.hasta}`;
  const ranking = resultado?.consulta === consulta ? resultado.ranking : null;

  useEffect(() => {
    let vigente = true;
    rankingClientas(criterio, rango).then(
      (r) => {
        if (!vigente) return;
        setResultado({ consulta: `${criterio} ${rango.desde} ${rango.hasta}`, ranking: r });
        setError('');
      },
      (e: Error) => vigente && setError(e.message),
    );
    return () => {
      vigente = false;
    };
  }, [criterio, rango]);

  return (
    <section aria-label="Ranking" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span id={idOrden} className="text-sm font-medium text-gray-600">
          Ordenar por
        </span>
        <Opciones etiquetadoPor={idOrden} opciones={CRITERIOS} valor={criterio} onElegir={setCriterio} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : !ranking ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : ranking.length === 0 ? (
        <p role="status" className="text-sm text-gray-500">
          No hay compras entre el {textoDia(rango.desde)} y el {textoDia(rango.hasta)}.
        </p>
      ) : (
        <>
          {/* Computador: tabla (D-24). */}
          <table aria-label="Ranking de clientas" className="hidden w-full overflow-hidden rounded-lg bg-white text-sm lg:table">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="w-12 px-3 py-2 font-medium">#</th>
                <th scope="col" className="px-3 py-2 font-medium">Clienta</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Total gastado</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Compras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ranking.map((p, i) => (
                <tr key={p.clienta.id} className="relative hover:bg-marca-50 focus-within:bg-marca-50">
                  <td className="px-3 py-3 font-semibold tabular-nums text-gray-600">{i + 1}</td>
                  <td className="px-3 py-3 font-medium">
                    <Link to={`/clientas/${p.clienta.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                      {p.clienta.nombre}
                    </Link>{' '}
                    {!p.clienta.activa && <Desactivada />}
                  </td>
                  <td className={`px-3 py-3 text-right tabular-nums ${criterio === 'TOTAL' ? 'font-bold' : ''}`}>
                    {formatearClp(p.totalGastado)}
                  </td>
                  <td className={`px-3 py-3 text-right tabular-nums ${criterio === 'COMPRAS' ? 'font-bold' : ''}`}>
                    {p.compras}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Celular: tarjetas. */}
          <ol aria-label="Ranking de clientas" className="space-y-2 lg:hidden">
            {ranking.map((p, i) => (
              <li key={p.clienta.id}>
                <Link
                  to={`/clientas/${p.clienta.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-marca-600"
                >
                  <span className="w-6 font-semibold tabular-nums text-gray-600">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.clienta.nombre}</span>
                    {!p.clienta.activa && <Desactivada />}
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    <span className={`block ${criterio === 'TOTAL' ? 'font-bold' : ''}`}>{formatearClp(p.totalGastado)}</span>
                    <span className={`block text-gray-600 ${criterio === 'COMPRAS' ? 'font-bold text-gray-900' : ''}`}>
                      {p.compras} {p.compras === 1 ? 'compra' : 'compras'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
