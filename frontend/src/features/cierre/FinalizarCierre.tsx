import { useState } from 'react';
import { TIPOS_ENTREGA, type Linea } from '../../types/dominio';
import { ETIQUETAS_ESTADO_PAGO, ETIQUETAS_TIPO_ENTREGA } from '../../types/etiquetas';
import type { RevisionCierre } from '../../utils/cierre';
import { formatearClp, totalLinea } from '../../utils/montos';

interface FinalizarCierreProps {
  revision: RevisionCierre;
  onNoPago: (lineaId: string) => void;
  onConfirmar: () => Promise<void>;
  onVolver: () => void;
}

const nombres = (lineas: Linea[]) => lineas.map((l) => l.clientaNombre).join(', ');

/**
 * RF-11: resumen del cierre y lo que falta para finalizar. Las líneas Pendientes se marcan No pagó aquí mismo.
 * Confirmar solo se habilita cuando no falta nada.
 */
export function FinalizarCierre({ revision, onNoPago, onConfirmar, onVolver }: FinalizarCierreProps) {
  const { faltan, listo, resumen } = revision;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setError('');
    setEnviando(true); // evita un segundo toque mientras se procesa
    try {
      await onConfirmar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo finalizar el cierre.');
      setEnviando(false);
    }
  }

  const montos = [
    { etiqueta: 'Total del live', valor: formatearClp(resumen.total) },
    { etiqueta: 'Pagado', valor: formatearClp(resumen.pagado) },
    { etiqueta: 'Sin pagar', valor: formatearClp(resumen.sinPagar) },
    ...TIPOS_ENTREGA.map((tipo) => ({ etiqueta: ETIQUETAS_TIPO_ENTREGA[tipo], valor: String(resumen.entregas[tipo]) })),
  ];

  return (
    <section aria-labelledby="titulo-finalizar" className="mx-4 mt-3 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 id="titulo-finalizar" className="font-semibold">
        Finalizar cierre
      </h2>

      <dl data-testid="resumen-cierre" className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {montos.map(({ etiqueta, valor }) => (
          <div key={etiqueta} className="flex items-baseline justify-between gap-2">
            <dt className="text-gray-600">{etiqueta}</dt>
            <dd className="font-semibold tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      {!listo && (
        <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Para finalizar falta:</p>
          {faltan.bolsas.length > 0 && (
            <p>
              Revisar {faltan.bolsas.length} {faltan.bolsas.length === 1 ? 'bolsa' : 'bolsas'}: {nombres(faltan.bolsas)}.
            </p>
          )}
          {faltan.sinEntrega.length > 0 && <p>Forma de entrega de quienes pagaron: {nombres(faltan.sinEntrega)}.</p>}
          {faltan.pendientes.length > 0 && (
            <div className="space-y-2">
              <p>Cobrar o marcar {ETIQUETAS_ESTADO_PAGO.NO_PAGO} a las clientas Pendientes:</p>
              <ul aria-label="Líneas pendientes" className="space-y-2">
                {faltan.pendientes.map((linea) => (
                  <li key={linea.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-1">
                    <span>
                      {linea.clientaNombre}{' '}
                      <span className="font-semibold tabular-nums">{formatearClp(totalLinea(linea.prendas))}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onNoPago(linea.id)}
                      aria-label={`${ETIQUETAS_ESTADO_PAGO.NO_PAGO}: ${linea.clientaNombre}`}
                      className="min-h-11 shrink-0 rounded-md border border-red-300 px-3 font-semibold text-red-700 hover:bg-red-50"
                    >
                      {ETIQUETAS_ESTADO_PAGO.NO_PAGO}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={!listo || enviando}
          className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cerrar el live
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="min-h-11 flex-1 rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-100"
        >
          Volver
        </button>
      </div>
      <p className="text-xs text-gray-500">Al cerrar, el live queda de solo lectura.</p>
    </section>
  );
}
