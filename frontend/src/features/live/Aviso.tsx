import { useEffect } from 'react';

const DURACION_MS = 5000;

interface AvisoProps {
  texto: string;
  onDeshacer: () => void;
  /** Se llama al pasar unos segundos. Debe ser estable (useCallback). */
  onCerrar: () => void;
}

/** Aviso temporal con el resultado de una anotación y la opción Deshacer (RF-05). */
export function Aviso({ texto, onDeshacer, onCerrar }: AvisoProps) {
  useEffect(() => {
    const temporizador = setTimeout(onCerrar, DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [texto, onCerrar]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-gray-900 py-1 pl-4 pr-1 text-white shadow-lg"
    >
      <span className="flex-1">{texto}</span>
      <button type="button" onClick={onDeshacer} className="min-h-11 rounded-md px-3 font-semibold text-marca-100 hover:bg-white/10">
        Deshacer
      </button>
    </div>
  );
}
