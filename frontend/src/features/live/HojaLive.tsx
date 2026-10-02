import { Fragment } from 'react';
import type { Linea } from '../../types/dominio';
import { formatearClp, totalLinea } from '../../utils/montos';

/** Hoja del live en formato cuaderno: "Gabriela Peña 6-6-5 = $17.000", la última modificada arriba. */
export function HojaLive({ lineas }: { lineas: Linea[] }) {
  if (lineas.length === 0) {
    return <p className="p-4 text-sm text-gray-500">Aún no hay anotaciones en este live.</p>;
  }

  const ordenadas = [...lineas].sort((a, b) => Date.parse(b.actualizada) - Date.parse(a.actualizada));

  return (
    <ul aria-label="Hoja del live" className="divide-y divide-gray-200 bg-white">
      {ordenadas.map((linea) => (
        <li key={linea.id} className="flex flex-wrap items-baseline gap-x-2 px-4 py-3">
          <span className="font-medium">{linea.clientaNombre}</span>
          <span className="tabular-nums">
            {linea.prendas.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 && '-'}
                {p.estado === 'CANCELADA' ? <s className="text-gray-400">{p.precio / 1000}</s> : p.precio / 1000}
              </Fragment>
            ))}
          </span>
          <span className="ml-auto font-semibold tabular-nums">= {formatearClp(totalLinea(linea.prendas))}</span>
        </li>
      ))}
    </ul>
  );
}
