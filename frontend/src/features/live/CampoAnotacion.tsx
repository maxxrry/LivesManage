import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta, MontoClp } from '../../types/dominio';
import { nombreEscrito, parseAnotacion } from './parseAnotacion';
import { sugerirClientas } from './sugerirClientas';

interface CampoAnotacionProps {
  clientas: Clienta[];
  /** Clientas que ya tienen línea en este live (van primero en las sugerencias). */
  idsConLinea: ReadonlySet<string>;
  /** Guarda la anotación. Si falla, el texto se conserva (RNF-13). */
  onAnotar: (destino: DestinoAnotacion, precios: MontoClp[]) => Promise<void>;
}

type Opcion = { tipo: 'clienta'; clienta: Clienta } | { tipo: 'nueva'; nombre: string };

/** RF-05: campo de anotación con sintaxis rápida y sugerencias de clientas. */
export function CampoAnotacion({ clientas, idsConLinea, onAnotar }: CampoAnotacionProps) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [resaltada, setResaltada] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();
  const idError = useId();

  const nombre = nombreEscrito(texto);
  const opciones: Opcion[] = nombre
    ? [
        ...sugerirClientas(nombre, clientas, idsConLinea).map((clienta) => ({ tipo: 'clienta' as const, clienta })),
        { tipo: 'nueva', nombre },
      ]
    : [];

  async function enviar(opcion: Opcion | undefined) {
    const resultado = parseAnotacion(texto);
    if ('error' in resultado) {
      setError(resultado.error);
      return;
    }
    const destino: DestinoAnotacion =
      opcion?.tipo === 'clienta' ? { clientaId: opcion.clienta.id } : { nuevaClienta: resultado.nombre };

    setEnviando(true);
    setError('');
    try {
      await onAnotar(destino, resultado.precios);
      setTexto('');
      setResaltada(0);
    } catch (e) {
      setError(`No se guardó la anotación. ${e instanceof Error ? e.message : ''}`.trim());
    } finally {
      setEnviando(false);
      campo.current?.focus();
    }
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    void enviar(opciones[resaltada]);
  }

  function alPresionarTecla(e: KeyboardEvent) {
    if (opciones.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const paso = e.key === 'ArrowDown' ? 1 : -1;
      setResaltada((i) => (i + paso + opciones.length) % opciones.length);
    }
  }

  return (
    <form onSubmit={alEnviar} className="relative">
      <div className="flex gap-2">
        <input
          ref={campo}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setResaltada(0);
            setError('');
          }}
          onKeyDown={alPresionarTecla}
          placeholder="flo 6-4"
          aria-label="Anotación"
          role="combobox"
          aria-expanded={opciones.length > 0}
          aria-controls={idLista}
          aria-activedescendant={opciones.length > 0 ? `${idLista}-${resaltada}` : undefined}
          aria-invalid={error !== ''}
          aria-describedby={error ? idError : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-base focus:border-marca-600 focus:outline-none aria-invalid:border-red-600"
        />
        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {error && (
        <p id={idError} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}

      {opciones.length > 0 && (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Sugerencias de clientas"
          className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {opciones.map((opcion, i) => (
            <li
              key={opcion.tipo === 'clienta' ? opcion.clienta.id : 'nueva'}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === resaltada}
              // D-13: tocar una sugerencia anota directamente.
              onClick={() => void enviar(opcion)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 ${
                i === resaltada ? 'bg-marca-100' : 'hover:bg-gray-50'
              }`}
            >
              {opcion.tipo === 'clienta' ? (
                <>
                  <span>{opcion.clienta.nombre}</span>
                  {idsConLinea.has(opcion.clienta.id) && <span className="text-xs text-gray-500">en este live</span>}
                </>
              ) : (
                <span className="text-marca-700">+ Nueva clienta "{opcion.nombre}"</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
