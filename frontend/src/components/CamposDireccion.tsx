import type { Direccion } from '../types/dominio';

interface CamposDireccionProps {
  direccion: Direccion;
  onCambiar: (direccion: Direccion) => void;
  /** Calle, comuna y región obligatorias (despacho). En la ficha la dirección es opcional. */
  obligatoria?: boolean;
}

/** Campos de una dirección (D-04): calle, comuna, región y referencia. Los usan el despacho (RF-10) y la ficha (RF-12). */
export function CamposDireccion({ direccion, onCambiar, obligatoria = false }: CamposDireccionProps) {
  // La referencia siempre es opcional. Si toda la dirección es opcional, lo indica quien la contiene
  // (calle y comuna se exigen igual si se ingresa una dirección).
  const campo = (clave: keyof Direccion, etiqueta: string, referencia = false) => (
    <label className="block text-sm font-medium">
      {etiqueta}
      {referencia && <span className="font-normal text-gray-500"> (opcional)</span>}
      <input
        value={direccion[clave] ?? ''}
        onChange={(e) => onCambiar({ ...direccion, [clave]: e.target.value })}
        required={obligatoria && !referencia}
        autoComplete="off"
        className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none"
      />
    </label>
  );

  return (
    <>
      {campo('calle', 'Calle y número')}
      <div className="grid grid-cols-2 gap-2">
        {campo('comuna', 'Comuna')}
        {campo('region', 'Región')}
      </div>
      {campo('referencia', 'Referencia', true)}
    </>
  );
}
