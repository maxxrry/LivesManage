import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta } from '../../types/dominio';
import { ListaSugerencias } from './ListaSugerencias';
import { moverResaltada, opcionesPara, type Opcion } from './sugerirClientas';

interface CambiarClientaProps {
  clientas: Clienta[];
  idsConLinea: ReadonlySet<string>;
  /** Clienta actual de la línea: no se ofrece. */
  clientaActualId: string;
  onCambiar: (destino: DestinoAnotacion) => Promise<void>;
  onCancelar: () => void;
}

const BOTON = 'min-h-11 rounded-md px-4 font-semibold';

/** RF-06: elegir otra clienta (existente o nueva) para una línea. Unir dos líneas pide confirmación (D-19). */
export function CambiarClienta({ clientas, idsConLinea, clientaActualId, onCambiar, onCancelar }: CambiarClientaProps) {
  const [texto, setTexto] = useState('');
  const [resaltada, setResaltada] = useState(0);
  const [unirCon, setUnirCon] = useState<Clienta | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idLista = useId();

  const otras = clientas.filter((c) => c.id !== clientaActualId);
  const opciones = opcionesPara(texto.trim().replace(/\s+/g, ' '), otras, idsConLinea);

  async function cambiar(destino: DestinoAnotacion) {
    setEnviando(true);
    setError('');
    try {
      await onCambiar(destino); // al terminar, la línea cierra este selector
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la clienta.');
      setEnviando(false);
    }
  }

  function elegir(opcion: Opcion | undefined) {
    if (!opcion || enviando) return;
    if (opcion.tipo === 'nueva') void cambiar({ nuevaClienta: opcion.nombre });
    else if (idsConLinea.has(opcion.clienta.id)) setUnirCon(opcion.clienta);
    else void cambiar({ clientaId: opcion.clienta.id });
  }

  if (unirCon) {
    return (
      <div role="group" aria-label="Confirmar unión" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
        <p className="text-sm">{unirCon.nombre} ya tiene línea en este live. ¿Unirlas?</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={() => void cambiar({ clientaId: unirCon.id })}
            className={`${BOTON} flex-1 bg-marca-600 text-white hover:bg-marca-700 disabled:opacity-50`}
          >
            Unir
          </button>
          <button type="button" onClick={() => setUnirCon(null)} className={`${BOTON} flex-1 border border-gray-300 hover:bg-gray-100`}>
            Cancelar
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        elegir(opciones[resaltada]);
      }}
      className="relative"
    >
      <div className="flex gap-2">
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setResaltada(0);
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (moverResaltada(e.key, opciones.length, setResaltada)) e.preventDefault();
            if (e.key === 'Escape') onCancelar();
          }}
          aria-label="Buscar la clienta correcta"
          placeholder="Buscar clienta"
          role="combobox"
          aria-expanded={opciones.length > 0}
          aria-controls={idLista}
          aria-activedescendant={opciones.length > 0 ? `${idLista}-${resaltada}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-base focus:border-marca-600 focus:outline-none"
        />
        <button type="button" onClick={onCancelar} className={`${BOTON} border border-gray-300 hover:bg-gray-100`}>
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
      <ListaSugerencias id={idLista} opciones={opciones} resaltada={resaltada} idsConLinea={idsConLinea} onElegir={elegir} />
    </form>
  );
}
