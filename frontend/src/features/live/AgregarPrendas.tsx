import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { MontoClp } from '../../types/dominio';
import { parsePrecios } from './parseAnotacion';

interface AgregarPrendasProps {
  /** Guarda las prendas; al terminar, la línea cierra este panel. Si falla, el texto se conserva (RNF-13). */
  onAgregar: (precios: MontoClp[]) => Promise<void>;
  onCambiarClienta: () => void;
  onCerrar: () => void;
}

/** D-41: panel del lápiz. Agrega prendas a la línea escribiendo solo los precios, sin repetir el nombre. */
export function AgregarPrendas({ onAgregar, onCambiarClienta, onCerrar }: AgregarPrendasProps) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const idCampo = useId();
  const idError = useId();

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    const resultado = parsePrecios(texto);
    if ('error' in resultado) {
      setError(resultado.error);
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await onAgregar(resultado.precios);
    } catch (fallo) {
      setError(`No se guardó la anotación. ${fallo instanceof Error ? fallo.message : ''}`.trim());
      setEnviando(false);
      campo.current?.focus();
    }
  }

  function alPresionarTecla(e: KeyboardEvent) {
    if (e.key === 'Escape' && !enviando) onCerrar();
  }

  return (
    <form onSubmit={alEnviar} onKeyDown={alPresionarTecla} className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <label htmlFor={idCampo} className="mb-1 block text-sm font-medium">
        Agregar prendas
      </label>
      <div className="flex gap-2">
        <input
          ref={campo}
          id={idCampo}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setError('');
          }}
          placeholder="6000 4000"
          aria-invalid={error !== ''}
          aria-describedby={error ? idError : undefined}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 text-base focus:border-marca-600 focus:outline-none aria-invalid:border-red-600"
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

      <button
        type="button"
        onClick={onCambiarClienta}
        disabled={enviando}
        className="mt-2 min-h-11 rounded-md px-2 text-sm font-semibold text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
      >
        Cambiar clienta
      </button>
    </form>
  );
}
