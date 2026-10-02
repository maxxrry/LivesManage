import { formatearClp, type TotalesLive as Totales } from '../../utils/montos';

const ITEMS = [
  { clave: 'total', etiqueta: 'Total del live', testId: 'total-live', destacado: true },
  { clave: 'pagado', etiqueta: 'Pagado', testId: 'total-pagado' },
  { clave: 'pendiente', etiqueta: 'Pendiente', testId: 'total-pendiente' },
  { clave: 'clientas', etiqueta: 'Clientas', testId: 'total-clientas' },
] as const;

/** RF-08: totales siempre visibles. 2×2 en celular, una fila en computador. */
export function TotalesLive({ totales }: { totales: Totales }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm lg:grid-cols-4">
      {ITEMS.map(({ clave, etiqueta, testId, ...item }) => (
        <div key={clave} className="flex items-baseline justify-between gap-2 lg:flex-col lg:items-start lg:gap-0">
          <dt className={clave === 'pagado' ? 'text-marca-700' : 'text-gray-600'}>{etiqueta}</dt>
          <dd
            data-testid={testId}
            className={`tabular-nums ${'destacado' in item ? 'text-base font-bold' : 'font-semibold'} ${
              clave === 'pagado' ? 'text-marca-700' : ''
            }`}
          >
            {clave === 'clientas' ? totales.clientas : formatearClp(totales[clave])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
