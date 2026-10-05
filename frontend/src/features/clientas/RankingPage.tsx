import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { rankingClientas } from '../../services/clientasService';
import type { CriterioRanking, PosicionRanking } from '../../utils/clientas';
import { diaChile, restarMeses } from '../../utils/fechas';
import { formatearClp } from '../../utils/montos';
import { Desactivada } from './ClientasPage';
import { Inactivas } from './Inactivas';

interface OpcionesProps<T extends string> {
  etiqueta: string;
  opciones: readonly (readonly [T, string])[];
  valor: T | null;
  onElegir: (valor: T) => void;
}

/** Botones excluyentes (aria-pressed), como la forma de entrega del cierre. */
function Opciones<T extends string>({ etiqueta, opciones, valor, onElegir }: OpcionesProps<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex gap-1">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          aria-pressed={valor === clave}
          onClick={() => onElegir(clave)}
          className={`min-h-11 flex-1 rounded-md border px-3 text-sm font-semibold sm:flex-none ${
            valor === clave ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

const VISTAS = [
  ['ranking', 'Ranking'],
  ['inactivas', 'Inactivas'],
] as const;

/** RF-14: ranking de clientas y clientas inactivas. */
export function RankingPage() {
  const [vista, setVista] = useState<(typeof VISTAS)[number][0]>('ranking');
  return (
    <Pantalla titulo="Ranking e inactivas">
      <div className="mt-3 space-y-4">
        <Opciones etiqueta="Vista" opciones={VISTAS} valor={vista} onElegir={setVista} />
        {vista === 'ranking' ? <Ranking /> : <Inactivas />}
      </div>
    </Pantalla>
  );
}

const CRITERIOS = [
  ['TOTAL', 'Total gastado'],
  ['COMPRAS', 'Compras'],
] as const;

const ATAJOS = [
  ['mes', 'Este mes'],
  ['3', '3 meses'],
  ['12', '12 meses'],
] as const;
type Atajo = (typeof ATAJOS)[number][0];

function rangoDe(atajo: Atajo, hoy: string) {
  return { desde: atajo === 'mes' ? `${hoy.slice(0, 8)}01` : restarMeses(hoy, Number(atajo)), hasta: hoy };
}

/** "2026-09-24" → "24/09/2026". */
const textoDia = (dia: string) => dia.split('-').reverse().join('/');

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none';

/** Ranking por total gastado o por compras en un rango de fechas; por defecto, los últimos 3 meses (D-30). */
function Ranking() {
  const [hoy] = useState(() => diaChile(new Date()));
  const [criterio, setCriterio] = useState<CriterioRanking>('TOTAL');
  const [rango, setRango] = useState(() => rangoDe('3', hoy));
  // Cada resultado guarda la consulta que lo pidió: al cambiar el orden o el período, el anterior no se muestra.
  const [resultado, setResultado] = useState<{ consulta: string; ranking: PosicionRanking[] } | null>(null);
  const [error, setError] = useState('');
  const fechasCompletas = Boolean(rango.desde && rango.hasta);
  const rangoValido = fechasCompletas && rango.desde <= rango.hasta;
  const consulta = `${criterio} ${rango.desde} ${rango.hasta}`;
  const ranking = resultado?.consulta === consulta ? resultado.ranking : null;

  useEffect(() => {
    if (!rangoValido) return;
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
  }, [criterio, rango, rangoValido]);

  const atajo = ATAJOS.find(([clave]) => {
    const r = rangoDe(clave, hoy);
    return r.desde === rango.desde && r.hasta === rango.hasta;
  })?.[0];

  return (
    <section aria-label="Ranking" className="space-y-4">
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <Opciones etiqueta="Ordenar por" opciones={CRITERIOS} valor={criterio} onElegir={setCriterio} />
        <Opciones etiqueta="Período" opciones={ATAJOS} valor={atajo ?? null} onElegir={(a) => setRango(rangoDe(a, hoy))} />
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
        <p className="text-sm text-gray-500">Cuentan las compras pagadas en lives cerrados.</p>
      </div>

      {!rangoValido ? (
        <p role="alert" className="text-sm text-red-700">
          {fechasCompletas
            ? 'Elige un período válido: la fecha "Desde" no puede ser posterior a "Hasta".'
            : 'Completa las fechas "Desde" y "Hasta".'}
        </p>
      ) : error ? (
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
