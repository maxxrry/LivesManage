import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { registrarBolsas, registrarEntrega } from '../../services/sesionesService';
import type { CompraClienta, Direccion, Linea } from '../../types/dominio';
import { ETIQUETAS_BOLSAS, ETIQUETAS_ESTADO_PAGO, ETIQUETAS_ESTADO_SESION, ETIQUETAS_TIPO_ENTREGA } from '../../types/etiquetas';
import type { IndicadoresClienta } from '../../utils/clientas';
import { formatearFecha } from '../../utils/fechas';
import { formatearClp, formatearPrecio, totalLinea } from '../../utils/montos';
import { nombreSesion, rutaDeSesion } from '../../utils/sesion';
import { EntregaLinea } from './EntregaLinea';

/** "6.000 6.000 5.000"; las canceladas tachadas. */
function Prendas({ linea }: { linea: Linea }) {
  return linea.prendas.map((p, i) => (
    <Fragment key={p.id}>
      {i > 0 && ' '}
      {p.estado === 'CANCELADA' ? (
        <s className="text-gray-400">
          {formatearPrecio(p.precio)}
          <span className="sr-only"> (cancelada)</span>
        </s>
      ) : (
        formatearPrecio(p.precio)
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

interface CambiosCompra {
  clientaNombre: string;
  direccionFicha?: Direccion;
  /** Recarga el historial; con `ficha`, también los datos de la clienta (un Despacho puede guardar su dirección). */
  onCambio: (ficha: boolean) => Promise<void>;
}

/** D-47: bolsas, si siguen en bodega y forma de entrega de una compra. Desde que termina el live, también Cerrado. */
function BolsasYEntrega({ compra, clientaNombre, direccionFicha, onCambio }: { compra: CompraClienta } & CambiosCompra) {
  const { sesion, linea } = compra;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  if (sesion.estado === 'ABIERTA') return null;

  /** Recarga después de guardar; si falla, avisa sin decir que no se guardó (evita que se repita el toque). */
  async function recargar(ficha: boolean) {
    try {
      await onCambio(ficha);
    } catch {
      setError('Se guardó, pero no se pudo actualizar la pantalla. Recarga la página.');
    }
  }

  async function guardarBolsas(bolsas: number, entregada: boolean) {
    setError('');
    setEnviando(true);
    try {
      await registrarBolsas(sesion.id, linea.id, { bolsas, entregada });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar las bolsas.');
      setEnviando(false);
      return;
    }
    await recargar(false);
    setEnviando(false);
  }

  const fecha = formatearFecha(sesion.inicio);
  const boton = 'min-h-11 min-w-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold hover:border-gray-500 disabled:opacity-50';
  return (
    <div role="group" aria-label={`Bolsas y entrega del live ${fecha}`} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Bolsas</span>
        <button type="button" aria-label="Quitar una bolsa" disabled={enviando || linea.bolsas === 0}
          onClick={() => void guardarBolsas(linea.bolsas - 1, linea.entregada)} className={boton}>
          −
        </button>
        <output aria-label="Bolsas" className="w-6 text-center font-semibold tabular-nums">{linea.bolsas}</output>
        <button type="button" aria-label="Agregar una bolsa" disabled={enviando || linea.bolsas >= 99}
          onClick={() => void guardarBolsas(linea.bolsas + 1, linea.entregada)} className={boton}>
          +
        </button>
        <div className="flex min-w-48 flex-1 gap-1">
          {[false, true].map((entregada) => (
            <button
              key={String(entregada)}
              type="button"
              aria-pressed={linea.bolsas > 0 && linea.entregada === entregada}
              disabled={enviando || linea.bolsas === 0}
              onClick={() => void guardarBolsas(linea.bolsas, entregada)}
              className={`min-h-11 flex-1 rounded-md border px-2 text-sm font-semibold disabled:opacity-50 ${
                linea.bolsas > 0 && linea.entregada === entregada
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
              }`}
            >
              {entregada ? ETIQUETAS_BOLSAS.entregada : ETIQUETAS_BOLSAS.enBodega}
            </button>
          ))}
        </div>
      </div>
      <EntregaLinea
        clientaNombre={`${clientaNombre} (${fecha})`}
        entrega={compra.entrega}
        direccionFicha={direccionFicha}
        onRegistrar={async (datos) => {
          await registrarEntrega(sesion.id, linea.id, datos); // si falla, EntregaLinea muestra el error y conserva lo escrito
          setError('');
          await recargar(datos.tipo === 'DESPACHO');
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** RF-13: indicadores de la ficha. */
export function IndicadoresFicha({ indicadores: ind }: { indicadores: IndicadoresClienta }) {
  const indicadores = [
    ['Total gastado', formatearClp(ind.totalGastado)],
    ['Compras', String(ind.compras)],
    ['Ticket promedio', formatearClp(ind.ticketPromedio)],
    ['Última compra', ind.ultimaCompra ? formatearFecha(ind.ultimaCompra) : '—'],
    ['Prendas canceladas', String(ind.prendasCanceladas)],
    ['Lives sin pago', String(ind.livesSinPago)],
  ];

  return (
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
  );
}

/** RF-13: historial por live de la ficha, con bolsas y entrega de cada compra (D-47). */
export function HistorialClienta({ historial, ...cambios }: { historial: CompraClienta[] } & CambiosCompra) {
  return (
    <>
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
                  <Fragment key={c.linea.id}>
                    <tr>
                      <td className="px-3 py-3"><Live compra={c} /></td>
                      <td className="px-3 py-3 tabular-nums"><Prendas linea={c.linea} /></td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatearClp(totalLinea(c.linea.prendas))}</td>
                      <td className="px-3 py-3"><Pago linea={c.linea} /></td>
                      <td className="px-3 py-3 text-gray-700">{entregaDe(c)}</td>
                    </tr>
                    {c.sesion.estado !== 'ABIERTA' && (
                      <tr>
                        <td colSpan={5} className="px-3 pb-3">
                          <BolsasYEntrega compra={c} {...cambios} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
                  {c.sesion.estado !== 'ABIERTA' && (
                    <div className="mt-2 border-t border-gray-100 pt-2">
                      <BolsasYEntrega compra={c} {...cambios} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
