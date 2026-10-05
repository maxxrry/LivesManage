import { useState, type FormEvent } from 'react';
import { CamposDireccion } from '../../components/CamposDireccion';
import type { DatosEntrega } from '../../services/sesionesService';
import { TIPOS_ENTREGA, type Direccion, type Entrega } from '../../types/dominio';
import { ETIQUETAS_TIPO_ENTREGA } from '../../types/etiquetas';
import { DIRECCION_VACIA as VACIA, textoDireccion } from '../../utils/clientas';

/** Un despacho del live al que se puede sumar la clienta (ej: su hermana). */
export interface DespachoAgrupable {
  entregaId: string;
  nombres: string[];
  direccion?: Direccion;
}

interface EntregaLineaProps {
  clientaNombre: string;
  entrega?: Entrega;
  /** Otras clientas que comparten esta entrega. */
  junto: string[];
  direccionFicha?: Direccion;
  despachos: DespachoAgrupable[];
  onRegistrar: (datos: DatosEntrega) => Promise<void>;
  onAgrupar: (entregaId: string) => Promise<void>;
}

/**
 * RF-10: forma de entrega de una clienta en el cierre. Retiro y Feria se registran con un toque;
 * Despacho pide confirmar la dirección de la ficha, ingresar otra o enviar junto con otra clienta.
 */
export function EntregaLinea({
  clientaNombre,
  entrega,
  junto,
  direccionFicha,
  despachos,
  onRegistrar,
  onAgrupar,
}: EntregaLineaProps) {
  const [eligiendoDespacho, setEligiendoDespacho] = useState(false);
  const [formulario, setFormulario] = useState(false);
  const [direccion, setDireccion] = useState<Direccion>(VACIA);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Sin dirección en la ficha ni despachos para agrupar, el formulario es la única opción.
  const soloFormulario = !direccionFicha && despachos.length === 0;

  async function guardar(accion: () => Promise<void>) {
    setError('');
    setEnviando(true);
    try {
      await accion();
      setEligiendoDespacho(false);
      setFormulario(false);
      setDireccion(VACIA);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la entrega.');
    } finally {
      setEnviando(false);
    }
  }

  function alEnviarFormulario(e: FormEvent) {
    e.preventDefault();
    void guardar(() => onRegistrar({ tipo: 'DESPACHO', direccion }));
  }

  return (
    <div role="group" aria-label={`Entrega de ${clientaNombre}`} className="mt-2 border-t border-gray-100 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-600">Entrega</span>
        <div className="flex flex-1 gap-1">
          {TIPOS_ENTREGA.map((tipo) => {
            const elegido = entrega?.tipo === tipo || (tipo === 'DESPACHO' && eligiendoDespacho);
            return (
              <button
                key={tipo}
                type="button"
                aria-pressed={entrega?.tipo === tipo}
                disabled={enviando}
                onClick={() => {
                  setError('');
                  if (tipo === 'DESPACHO') {
                    setEligiendoDespacho(true);
                    setFormulario(soloFormulario);
                  } else {
                    setEligiendoDespacho(false);
                    void guardar(() => onRegistrar({ tipo }));
                  }
                }}
                className={`min-h-11 flex-1 rounded-md border px-2 text-sm font-semibold disabled:opacity-50 ${
                  elegido ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                }`}
              >
                {ETIQUETAS_TIPO_ENTREGA[tipo]}
              </button>
            );
          })}
        </div>
      </div>

      {entrega?.tipo === 'DESPACHO' && entrega.direccion && !eligiendoDespacho && (
        <p className="mt-1 text-sm text-gray-700">
          {textoDireccion(entrega.direccion)}
          {junto.length > 0 && <span className="text-gray-500"> · junto con {junto.join(', ')}</span>}{' '}
          <button
            type="button"
            onClick={() => {
              setEligiendoDespacho(true);
              setFormulario(soloFormulario);
            }}
            className="min-h-11 rounded-md px-1 font-semibold text-marca-700 underline-offset-2 hover:underline"
          >
            Cambiar dirección
          </button>
        </p>
      )}

      {eligiendoDespacho && (
        <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
          {!formulario && (
            <>
              {direccionFicha && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void guardar(() => onRegistrar({ tipo: 'DESPACHO', direccion: direccionFicha }))}
                  className="flex min-h-11 w-full flex-col items-start justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-left text-sm hover:border-marca-600 disabled:opacity-50"
                >
                  <span className="font-semibold">Usar la de su ficha</span>
                  <span className="text-gray-600">{textoDireccion(direccionFicha)}</span>
                </button>
              )}
              {despachos.map((d) => (
                <button
                  key={d.entregaId}
                  type="button"
                  disabled={enviando}
                  onClick={() => void guardar(() => onAgrupar(d.entregaId))}
                  className="flex min-h-11 w-full flex-col items-start justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-left text-sm hover:border-marca-600 disabled:opacity-50"
                >
                  <span className="font-semibold">Enviar junto con {d.nombres.join(', ')}</span>
                  {d.direccion && <span className="text-gray-600">{textoDireccion(d.direccion)}</span>}
                </button>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormulario(true)}
                  className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold hover:bg-gray-100"
                >
                  Otra dirección
                </button>
                <button
                  type="button"
                  onClick={() => setEligiendoDespacho(false)}
                  className="min-h-11 flex-1 rounded-md px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {formulario && (
            <form onSubmit={alEnviarFormulario} aria-label={`Dirección de ${clientaNombre}`} className="space-y-2">
              <CamposDireccion direccion={direccion} onCambiar={setDireccion} obligatoria />
              <p className="text-xs text-gray-500">Queda guardada en la ficha de la clienta.</p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEligiendoDespacho(false);
                    setFormulario(false);
                  }}
                  className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
