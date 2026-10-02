import { Fragment, useState } from 'react';
import type { DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta, Linea, Prenda } from '../../types/dominio';
import { ETIQUETAS_ESTADO_PAGO } from '../../types/etiquetas';
import { formatearClp, totalLinea } from '../../utils/montos';
import { CambiarClienta } from './CambiarClienta';

interface HojaLiveProps {
  lineas: Linea[];
  /** Se puede corregir mientras el live no esté Cerrado (RF-06). */
  editable: boolean;
  clientas: Clienta[];
  onAlternarPrenda: (lineaId: string, prendaId: string) => void;
  onCambiarClienta: (lineaId: string, destino: DestinoAnotacion) => Promise<void>;
  onAlternarPago: (lineaId: string) => void;
}

function PrendaHoja({ prenda, editable, onAlternar }: { prenda: Prenda; editable: boolean; onAlternar: () => void }) {
  const cancelada = prenda.estado === 'CANCELADA';
  const miles = prenda.precio / 1000;
  if (!editable) return cancelada ? <s className="text-gray-400">{miles}</s> : <>{miles}</>;
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={`${cancelada ? 'Restaurar' : 'Cancelar'} prenda de ${formatearClp(prenda.precio)}`}
      className={`min-h-11 min-w-11 rounded-md border px-2 ${
        cancelada ? 'border-gray-200 bg-gray-100 text-gray-400 line-through' : 'border-gray-300 bg-white hover:border-marca-600'
      }`}
    >
      {miles}
    </button>
  );
}

/** RF-07: interruptor de pago (o solo el estado, si el live está Cerrado). No depende solo del color: ✓ y aria-pressed. */
function EstadoPagoLinea({ linea, editable, onAlternar }: { linea: Linea; editable: boolean; onAlternar: () => void }) {
  const pagado = linea.estadoPago === 'PAGADO';
  // "No pagó" no se cambia con este botón: se revisa en el cierre (RF-11).
  if (!editable || linea.estadoPago === 'NO_PAGO') {
    const color = linea.estadoPago === 'NO_PAGO' ? 'text-red-700' : 'text-marca-700';
    return <span className={`text-sm font-semibold ${color}`}>{ETIQUETAS_ESTADO_PAGO[linea.estadoPago]}</span>;
  }
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-pressed={pagado}
      aria-label={`Pagado: ${linea.clientaNombre}`}
      className={`order-last flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-semibold ${
        pagado ? 'border-marca-600 bg-marca-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-marca-600'
      }`}
    >
      {pagado && <span aria-hidden="true">✓</span>}
      {ETIQUETAS_ESTADO_PAGO.PAGADO}
    </button>
  );
}

/**
 * Hoja del live en formato cuaderno: "Gabriela Peña 6-6-5 = $17.000", la última modificada arriba.
 * RF-06: tocar una prenda la cancela o la restaura; el lápiz cambia la clienta de la línea.
 * RF-07: el botón Pagado marca o desmarca el pago; la línea pagada se destaca en rosado, como en el cuaderno.
 */
export function HojaLive({ lineas, editable, clientas, onAlternarPrenda, onCambiarClienta, onAlternarPago }: HojaLiveProps) {
  const [editando, setEditando] = useState<string | null>(null);

  if (lineas.length === 0) {
    return <p className="p-4 text-sm text-gray-500">Aún no hay anotaciones en este live.</p>;
  }

  const ordenadas = [...lineas].sort((a, b) => Date.parse(b.actualizada) - Date.parse(a.actualizada));
  const idsConLinea = new Set(lineas.map((l) => l.clientaId));

  return (
    <ul aria-label="Hoja del live" className="divide-y divide-gray-200 bg-white">
      {ordenadas.map((linea) => (
        <li
          key={linea.id}
          className={`border-l-4 py-2 pr-4 pl-3 ${linea.estadoPago === 'PAGADO' ? 'border-marca-600 bg-marca-50' : 'border-transparent'}`}
        >
          <div className="flex min-h-11 flex-wrap items-center gap-x-2">
            <span className="font-medium">{linea.clientaNombre}</span>
            {editable && (
              <button
                type="button"
                onClick={() => setEditando(editando === linea.id ? null : linea.id)}
                aria-label={`Cambiar clienta de ${linea.clientaNombre}`}
                aria-expanded={editando === linea.id}
                className="flex size-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.9 3.6a2 2 0 0 1 2.8 2.8L8 18.1 4 19l.9-4L16.9 3.6Z" />
                </svg>
              </button>
            )}
            {editable && <span className="order-last basis-full" aria-hidden="true" />}
            <span className={`tabular-nums ${editable ? 'order-last flex flex-1 flex-wrap items-center gap-1' : ''}`}>
              {linea.prendas.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 && <span className={editable ? 'text-gray-400' : ''}>-</span>}
                  <PrendaHoja prenda={p} editable={editable} onAlternar={() => onAlternarPrenda(linea.id, p.id)} />
                </Fragment>
              ))}
            </span>
            <span className="ml-auto font-semibold tabular-nums">= {formatearClp(totalLinea(linea.prendas))}</span>
            <EstadoPagoLinea linea={linea} editable={editable} onAlternar={() => onAlternarPago(linea.id)} />
          </div>

          {editando === linea.id && (
            <div className="mt-2">
              <CambiarClienta
                clientas={clientas}
                idsConLinea={idsConLinea}
                clientaActualId={linea.clientaId}
                onCambiar={async (destino) => {
                  await onCambiarClienta(linea.id, destino);
                  setEditando(null);
                }}
                onCancelar={() => setEditando(null)}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
