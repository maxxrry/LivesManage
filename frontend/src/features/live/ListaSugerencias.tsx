import type { Opcion } from './sugerirClientas';

interface ListaSugerenciasProps {
  id: string;
  opciones: Opcion[];
  resaltada: number;
  idsConLinea: ReadonlySet<string>;
  onElegir: (opcion: Opcion) => void;
}

/** Lista desplegable de clientas sugeridas (RF-05, RF-06). Tocar una opción la elige (D-13). */
export function ListaSugerencias({ id, opciones, resaltada, idsConLinea, onElegir }: ListaSugerenciasProps) {
  if (opciones.length === 0) return null;
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Sugerencias de clientas"
      className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
    >
      {opciones.map((opcion, i) => (
        <li
          key={opcion.tipo === 'clienta' ? opcion.clienta.id : 'nueva'}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === resaltada}
          onClick={() => onElegir(opcion)}
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
  );
}
