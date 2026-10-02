import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta, MontoClp } from '../../types/dominio';
import { ListaSugerencias } from './ListaSugerencias';
import { moverResaltada, opcionesPara, type Opcion } from './sugerirClientas';
import { nombreEscrito, parseAnotacion } from './parseAnotacion';

interface CampoAnotacionProps {
  clientas: Clienta[];
  /** Clientas que ya tienen línea en este live (van primero en las sugerencias). */
  idsConLinea: ReadonlySet<string>;
  /** Guarda la anotación. Si falla, el texto se conserva (RNF-13). */
  onAnotar: (destino: DestinoAnotacion, precios: MontoClp[]) => Promise<void>;
}

/** RF-05: campo de anotación con sintaxis rápida y sugerencias de clientas. */
export function CampoAnotacion({ clientas, idsConLinea, onAnotar }: CampoAnotacionProps) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [resaltada, setResaltada] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();
  const idError = useId();

  const opciones = opcionesPara(nombreEscrito(texto), clientas, idsConLinea);

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
    if (moverResaltada(e.key, opciones.length, setResaltada)) e.preventDefault();
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

      {/* D-13: tocar una sugerencia anota directamente. */}
      <ListaSugerencias
        id={idLista}
        opciones={opciones}
        resaltada={resaltada}
        idsConLinea={idsConLinea}
        onElegir={(opcion) => void enviar(opcion)}
      />
    </form>
  );
}
