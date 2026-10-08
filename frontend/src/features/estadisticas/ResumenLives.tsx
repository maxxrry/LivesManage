import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { listarSesiones } from '../../services/sesionesService';
import type { SesionResumen } from '../../types/dominio';
import { ETIQUETAS_ESTADO_PAGO } from '../../types/etiquetas';
import { formatearDiaMes, textoDia } from '../../utils/fechas';
import { formatearClp } from '../../utils/montos';
import { nombreSesion, resumenDeLives, rutaDeSesion } from '../../utils/sesion';

// Colores validados para daltonismo y contraste (skill dataviz): rosado de marca y azul.
// El azul va en hex: en Tailwind 4, blue-600 es otro tono y no es el que se validó.
const COBRADO = 'bg-marca-600';
const NO_PAGO = 'bg-[#2563eb]';
const TEXTO_NO_PAGO = ETIQUETAS_ESTADO_PAGO.NO_PAGO;

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <dt className="text-sm text-gray-600">{titulo}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{valor}</dd>
      {detalle && <dd className="text-sm text-gray-600">{detalle}</dd>}
    </div>
  );
}

function Muestra({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded-sm ${color}`} aria-hidden="true" />
      {texto}
    </span>
  );
}

/** D-32: cuánto se vendió en cada live del período y qué parte se cobró. */
export function ResumenLives({ rango }: { rango: { desde: string; hasta: string } }) {
  const [sesiones, setSesiones] = useState<SesionResumen[] | null>(null);
  const [error, setError] = useState('');
  const idTitulo = useId();

  useEffect(() => {
    let vigente = true;
    listarSesiones().then(
      (s) => vigente && setSesiones(s),
      (e: Error) => vigente && setError(e.message),
    );
    return () => {
      vigente = false;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (!sesiones) return <p className="text-sm text-gray-500">Cargando…</p>;

  const resumen = resumenDeLives(sesiones, rango);
  if (resumen.lives.length === 0) {
    return (
      <p role="status" className="text-sm text-gray-500">
        No hay lives cerrados entre el {textoDia(rango.desde)} y el {textoDia(rango.hasta)}.
      </p>
    );
  }

  const mayor = Math.max(...resumen.lives.map((l) => l.sesion.total));
  const ancho = (monto: number) => `${mayor ? (monto / mayor) * 100 : 0}%`;
  const porcentajeNoPago = resumen.vendido ? Math.round((resumen.noPago / resumen.vendido) * 100) : 0;

  return (
    <section aria-label="Estadísticas de lives" className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Cifra titulo="Vendido" valor={formatearClp(resumen.vendido)} />
        <Cifra titulo="Cobrado" valor={formatearClp(resumen.cobrado)} />
        <Cifra titulo={TEXTO_NO_PAGO} valor={formatearClp(resumen.noPago)} detalle={`${porcentajeNoPago} % de lo vendido`} />
        <Cifra titulo="Lives" valor={String(resumen.lives.length)} />
      </dl>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={idTitulo} className="font-semibold">
            Vendido por live
          </h2>
          <p className="flex gap-4 text-sm text-gray-600">
            <Muestra color={COBRADO} texto="Cobrado" />
            <Muestra color={NO_PAGO} texto={TEXTO_NO_PAGO} />
          </p>
        </div>

        <ul aria-labelledby={idTitulo} className="mt-3 divide-y divide-gray-100">
          {resumen.lives.map(({ sesion, cobrado, noPago }) => (
            <li key={sesion.id}>
              <Link
                to={rutaDeSesion(sesion)}
                className="-mx-2 block min-h-11 rounded-md px-2 py-2 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-marca-600"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <span className="tabular-nums text-gray-600">{formatearDiaMes(sesion.inicio)}</span>{' '}
                    <span className="font-medium">{nombreSesion(sesion)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatearClp(sesion.total)}</span>
                </span>
                {/* La barra repite las cifras de abajo: es solo visual. */}
                <span className="mt-1.5 flex h-3 gap-0.5" style={{ width: ancho(sesion.total) }} aria-hidden="true">
                  {cobrado > 0 && <span className={`rounded-l ${noPago ? '' : 'rounded-r'} ${COBRADO}`} style={{ flexGrow: cobrado }} />}
                  {noPago > 0 && <span className={`rounded-r ${cobrado ? '' : 'rounded-l'} ${NO_PAGO}`} style={{ flexGrow: noPago }} />}
                </span>
                <span className="mt-1 block text-sm tabular-nums text-gray-600">
                  Cobrado {formatearClp(cobrado)}
                  {noPago > 0 && ` · ${TEXTO_NO_PAGO} ${formatearClp(noPago)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
