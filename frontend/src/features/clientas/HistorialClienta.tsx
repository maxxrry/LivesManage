import { Fragment } from 'react';
import { Link } from 'react-router';
import type { CompraClienta, Linea } from '../../types/dominio';
import { ETIQUETAS_ESTADO_PAGO, ETIQUETAS_ESTADO_SESION, ETIQUETAS_TIPO_ENTREGA } from '../../types/etiquetas';
import { indicadoresDeClienta } from '../../utils/clientas';
import { formatearFecha } from '../../utils/fechas';
import { formatearClp, totalLinea } from '../../utils/montos';
import { nombreSesion, rutaDeSesion } from '../../utils/sesion';

/** "6-6-5" como en el cuaderno; las canceladas tachadas. */
function Prendas({ linea }: { linea: Linea }) {
  return linea.prendas.map((p, i) => (
    <Fragment key={p.id}>
      {i > 0 && '-'}
      {p.estado === 'CANCELADA' ? (
        <s className="text-gray-400">
          {p.precio / 1000}
          <span className="sr-only"> (cancelada)</span>
        </s>
      ) : (
        p.precio / 1000
      )}
    </Fragment>
  ));
}

function Pago({ linea }: { linea: Linea }) {
  const color = { PAGADO: 'text-marca-700', NO_PAGO: 'text-red-700', PENDIENTE: 'text-gray-600' }[linea.estadoPago];
  return <span className={`font-semibold ${color}`}>{ETIQUETAS_ESTADO_PAGO[linea.estadoPago]}</span>;
}

/** Live con enlace; si aún no está Cerrado, su estado (no suma a los indicadores, D-29). */
function Live({ compra }: { compra: CompraClienta }) {
  const { sesion } = compra;
  return (
    <>
      <Link to={rutaDeSesion(sesion)} className="inline-flex min-h-11 items-center font-medium text-marca-700 hover:underline">
        {formatearFecha(sesion.inicio)}
      </Link>
      <span className="ml-2 text-gray-600">{nombreSesion(sesion)}</span>
      {sesion.estado !== 'CERRADA' && (
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {ETIQUETAS_ESTADO_SESION[sesion.estado]}
        </span>
      )}
    </>
  );
}

const entregaDe = (c: CompraClienta) => (c.entrega ? ETIQUETAS_TIPO_ENTREGA[c.entrega.tipo] : '—');

/** RF-13: indicadores e historial por live de la ficha. */
export function HistorialClienta({ historial }: { historial: CompraClienta[] }) {
  const ind = indicadoresDeClienta(historial);
  const indicadores = [
    ['Total gastado', formatearClp(ind.totalGastado)],
    ['Compras', String(ind.compras)],
    ['Ticket promedio', formatearClp(ind.ticketPromedio)],
    ['Última compra', ind.ultimaCompra ? formatearFecha(ind.ultimaCompra) : '—'],
    ['Prendas canceladas', String(ind.prendasCanceladas)],
    ['Lives sin pago', String(ind.livesSinPago)],
  ];

  return (
    <>
      <section aria-labelledby="titulo-indicadores" className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 id="titulo-indicadores" className="font-semibold">Indicadores</h2>
        <p className="text-sm text-gray-500">Solo cuentan los lives cerrados.</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {indicadores.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-sm text-gray-600">{etiqueta}</dt>
              <dd className="text-lg font-bold tabular-nums">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="titulo-historial" className="space-y-2">
        <h2 id="titulo-historial" className="font-semibold">Historial por live</h2>
        {historial.length === 0 ? (
          <p role="status" className="text-sm text-gray-500">Aún no tiene compras.</p>
        ) : (
          <>
            {/* Computador: tabla (D-24). */}
            <table aria-label="Historial por live" className="hidden w-full overflow-hidden rounded-lg bg-white text-sm lg:table">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Live</th>
                  <th scope="col" className="px-3 py-2 font-medium">Prendas</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                  <th scope="col" className="px-3 py-2 font-medium">Pago</th>
                  <th scope="col" className="px-3 py-2 font-medium">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {historial.map((c) => (
                  <tr key={c.linea.id}>
                    <td className="px-3 py-3"><Live compra={c} /></td>
                    <td className="px-3 py-3 tabular-nums"><Prendas linea={c.linea} /></td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatearClp(totalLinea(c.linea.prendas))}</td>
                    <td className="px-3 py-3"><Pago linea={c.linea} /></td>
                    <td className="px-3 py-3 text-gray-700">{entregaDe(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: tarjetas. */}
            <ul aria-label="Historial por live" className="space-y-2 lg:hidden">
              {historial.map((c) => (
                <li key={c.linea.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center"><Live compra={c} /></div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="tabular-nums"><Prendas linea={c.linea} /></span>
                    <span className="font-semibold tabular-nums">{formatearClp(totalLinea(c.linea.prendas))}</span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3">
                    <Pago linea={c.linea} />
                    <span className="text-gray-700">Entrega: {entregaDe(c)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
