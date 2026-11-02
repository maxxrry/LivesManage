import { Fragment, useRef, useState, type ReactNode } from 'react';
import type { DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta, Linea, MontoClp, Prenda } from '../../types/dominio';
import { ETIQUETAS_ESTADO_PAGO } from '../../types/etiquetas';
import { formatearClp, formatearPrecio, totalLinea } from '../../utils/montos';
import { AgregarPrendas } from './AgregarPrendas';
import { CambiarClienta } from './CambiarClienta';
import { coincideNombre } from './sugerirClientas';

interface HojaLiveProps {
  lineas: Linea[];
  /** Se puede corregir mientras el live no esté Cerrado (RF-06). */
  editable: boolean;
  clientas: Clienta[];
  onAlternarPrenda: (lineaId: string, prendaId: string) => void;
  onCambiarClienta: (lineaId: string, destino: DestinoAnotacion) => Promise<void>;
  /** D-41: si se entrega, el lápiz también agrega prendas a la línea (solo con el live Abierto). */
  onAgregarPrendas?: (linea: Linea, precios: MontoClp[]) => Promise<void>;
  onAlternarPago: (lineaId: string) => void;
  /** Texto de búsqueda (RF-08). Lo controla LivePage, que lo borra al anotar. */
  busqueda: string;
  onBuscar: (texto: string) => void;
  /** RF-09: si se entrega, cada línea muestra el check de bolsa revisada (solo en el cierre). */
  onAlternarBolsa?: (lineaId: string) => void;
  /** RF-11: si se entrega, una línea No pagó muestra Deshacer para volverla a Pendiente (solo en el cierre). */
  onQuitarNoPago?: (lineaId: string) => void;
  /** Contenido extra al pie de cada línea; el cierre muestra ahí la entrega (RF-10). */
  pieLinea?: (linea: Linea) => ReactNode;
}

function PrendaHoja({ prenda, editable, onAlternar }: { prenda: Prenda; editable: boolean; onAlternar: () => void }) {
  const cancelada = prenda.estado === 'CANCELADA';
  const precio = formatearPrecio(prenda.precio);
  if (!editable) {
    if (!cancelada) return <>{precio}</>;
    return (
      <s className="text-gray-400">
        {precio}
        <span className="sr-only"> (cancelada)</span>
      </s>
    );
  }
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={`${cancelada ? 'Restaurar' : 'Cancelar'} prenda de ${formatearClp(prenda.precio)}`}
      className={`min-h-11 min-w-11 rounded-md border px-2 ${
        cancelada ? 'border-gray-200 bg-gray-100 text-gray-400 line-through' : 'border-gray-300 bg-white hover:border-marca-600'
      }`}
    >
      {precio}
    </button>
  );
}

/** RF-07: interruptor de pago (o solo el estado, si el live está Cerrado). No depende solo del color: ✓ y aria-pressed. */
function EstadoPagoLinea({
  linea,
  editable,
  onAlternar,
  onQuitarNoPago,
}: {
  linea: Linea;
  editable: boolean;
  onAlternar: () => void;
  onQuitarNoPago?: () => void;
}) {
  const pagado = linea.estadoPago === 'PAGADO';
  // "No pagó" no se cambia con este botón: se marca en el resumen del cierre y se deshace con Deshacer (RF-11).
  if (!editable || linea.estadoPago === 'NO_PAGO') {
    const color = linea.estadoPago === 'NO_PAGO' ? 'text-red-700' : 'text-marca-700';
    const estado = <span className={`text-sm font-semibold ${color}`}>{ETIQUETAS_ESTADO_PAGO[linea.estadoPago]}</span>;
    if (!editable || !onQuitarNoPago) return estado;
    return (
      <span className="flex items-center gap-1">
        {estado}
        <button
          type="button"
          onClick={onQuitarNoPago}
          aria-label={`Deshacer ${ETIQUETAS_ESTADO_PAGO.NO_PAGO}: ${linea.clientaNombre}`}
          className="min-h-11 rounded-md px-2 text-sm font-semibold text-gray-600 underline-offset-2 hover:underline"
        >
          Deshacer
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-pressed={pagado}
      aria-label={`Pagado: ${linea.clientaNombre}`}
      className={`flex min-h-11 items-center gap-1 rounded-md border px-3 text-sm font-semibold ${
        pagado ? 'border-marca-600 bg-marca-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-marca-600'
      }`}
    >
      {pagado && <span aria-hidden="true">✓</span>}
      {ETIQUETAS_ESTADO_PAGO.PAGADO}
    </button>
  );
}

/**
 * Hoja del live: "Gabriela Peña 6.000 6.000 5.000 = $17.000", la última modificada arriba.
 * RF-06: tocar una prenda la cancela o la restaura; el lápiz cambia la clienta de la línea y, con el live Abierto, agrega prendas (D-41).
 * RF-07: el botón Pagado marca o desmarca el pago; la línea pagada se destaca en rosado, como en el cuaderno.
 */
export function HojaLive({
  lineas,
  editable,
  clientas,
  onAlternarPrenda,
  onCambiarClienta,
  onAgregarPrendas,
  onAlternarPago,
  busqueda,
  onBuscar,
  onAlternarBolsa,
  onQuitarNoPago,
  pieLinea,
}: HojaLiveProps) {
  const [editando, setEditando] = useState<{ lineaId: string; cambiandoClienta: boolean } | null>(null);
  const lapices = useRef(new Map<string, HTMLButtonElement>());
  // Mientras se agregan prendas, el panel no se cierra: si falla, el error y el texto deben seguir a la vista (RNF-13).
  const guardando = useRef(false);

  function cerrarPanel(lineaId: string) {
    setEditando(null);
    // Si mientras se guardaba ya pasó a otro campo, no le quita el foco.
    const activo = document.activeElement;
    if (!activo || activo === document.body || activo.closest(`[data-panel="${lineaId}"]`)) lapices.current.get(lineaId)?.focus();
  }

  if (lineas.length === 0) {
    return <p className="p-4 text-sm text-gray-500">Aún no hay anotaciones en este live.</p>;
  }

  const ordenadas = [...lineas].sort((a, b) => Date.parse(b.actualizada) - Date.parse(a.actualizada));
  const idsConLinea = new Set(lineas.map((l) => l.clientaId));
  const visibles = ordenadas.filter((l) => coincideNombre(l.clientaNombre, busqueda));
  const buscando = busqueda.trim() !== '';

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => {
            onBuscar(e.target.value);
            if (!guardando.current) setEditando(null); // la búsqueda puede ocultar la línea del panel
          }}
          aria-label="Buscar en la hoja"
          placeholder="Buscar clienta en la hoja"
          autoComplete="off"
          className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base focus:border-marca-600 focus:outline-none sm:max-w-xs"
        />
        {buscando && (
          <p role="status" className="text-sm text-gray-600">
            {visibles.length === 0
              ? `Ninguna clienta coincide con "${busqueda.trim()}".`
              : `Mostrando ${visibles.length} de ${lineas.length} clientas`}
          </p>
        )}
      </div>

      {/* Una columna en celular, dos en computador. */}
      <ul aria-label="Hoja del live" className="grid grid-cols-1 items-start gap-2 px-4 pb-4 lg:grid-cols-2">
      {visibles.map((linea) => (
        <li
          key={linea.id}
          className={`rounded-lg border border-gray-200 py-2 pr-4 shadow-sm ${
            linea.estadoPago === 'PAGADO' ? 'border-l-4 border-l-marca-600 bg-marca-50 pl-3' : 'bg-white pl-4'
          }`}
        >
          <div className="flex min-h-11 flex-wrap items-center gap-x-2">
            <span className="font-medium">{linea.clientaNombre}</span>
            {editable && (
              <button
                type="button"
                ref={(boton) => {
                  if (boton) lapices.current.set(linea.id, boton);
                  else lapices.current.delete(linea.id);
                }}
                onClick={() => {
                  if (guardando.current) return;
                  setEditando(editando?.lineaId === linea.id ? null : { lineaId: linea.id, cambiandoClienta: false });
                }}
                aria-label={`${onAgregarPrendas ? 'Editar línea' : 'Cambiar clienta'} de ${linea.clientaNombre}`}
                aria-expanded={editando?.lineaId === linea.id}
                className="flex size-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.9 3.6a2 2 0 0 1 2.8 2.8L8 18.1 4 19l.9-4L16.9 3.6Z" />
                </svg>
              </button>
            )}
            {editable && <span className="order-last basis-full" aria-hidden="true" />}
            <span className={`tabular-nums ${editable ? 'order-last flex max-w-full shrink-0 flex-wrap items-center gap-1' : ''}`}>
              {linea.prendas.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 && ' '}
                  <PrendaHoja prenda={p} editable={editable} onAlternar={() => onAlternarPrenda(linea.id, p.id)} />
                </Fragment>
              ))}
            </span>
            <span className="ml-auto font-semibold tabular-nums">= {formatearClp(totalLinea(linea.prendas))}</span>
            {/* Las prendas no se encogen: si no caben con los botones, bajan los botones y no se parten las prendas. */}
            <div className={`flex gap-2 ${editable ? 'order-last ml-auto' : ''}`}>
              {onAlternarBolsa && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold has-checked:border-green-700 has-checked:bg-green-50 has-checked:text-green-800">
                  <input
                    type="checkbox"
                    checked={linea.bolsaRevisada}
                    onChange={() => onAlternarBolsa(linea.id)}
                    aria-label={`Bolsa revisada: ${linea.clientaNombre}`}
                    className="size-5 accent-green-700"
                  />
                  Bolsa
                </label>
              )}
              <EstadoPagoLinea
                linea={linea}
                editable={editable}
                onAlternar={() => onAlternarPago(linea.id)}
                onQuitarNoPago={onQuitarNoPago && (() => onQuitarNoPago(linea.id))}
              />
            </div>
          </div>

          {pieLinea?.(linea)}

          {editando?.lineaId === linea.id && (
            <div className="mt-2" data-panel={linea.id}>
              {onAgregarPrendas && !editando.cambiandoClienta ? (
                <AgregarPrendas
                  onAgregar={async (precios) => {
                    guardando.current = true;
                    try {
                      await onAgregarPrendas(linea, precios);
                      cerrarPanel(linea.id);
                    } finally {
                      guardando.current = false;
                    }
                  }}
                  onCambiarClienta={() => setEditando({ lineaId: linea.id, cambiandoClienta: true })}
                  onCerrar={() => cerrarPanel(linea.id)}
                />
              ) : (
                <CambiarClienta
                  clientas={clientas}
                  idsConLinea={idsConLinea}
                  clientaActualId={linea.clientaId}
                  onCambiar={async (destino) => {
                    await onCambiarClienta(linea.id, destino);
                    setEditando(null);
                  }}
                  onCancelar={() => cerrarPanel(linea.id)}
                />
              )}
            </div>
          )}
        </li>
      ))}
      </ul>
    </>
  );
}
