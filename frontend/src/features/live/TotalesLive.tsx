import { formatearClp, type TotalesLive as Totales } from '../../utils/montos';

const ITEMS = [
  { clave: 'total', etiqueta: 'Total del live', testId: 'total-live' },
  { clave: 'pagado', etiqueta: 'Pagado', testId: 'total-pagado' },
  { clave: 'pendiente', etiqueta: 'Pendiente', testId: 'total-pendiente' },
  { clave: 'clientas', etiqueta: 'Clientas', testId: 'total-clientas' },
] as const;

interface TotalesLiveProps {
  totales: Totales;
  /** Dato que más importa en la pantalla: el total durante el live, lo pendiente en el cierre. */
  destacar?: 'total' | 'pendiente';
}

/** RF-08: totales siempre visibles. 2×2 en celular, una fila en computador. */
export function TotalesLive({ totales, destacar = 'total' }: TotalesLiveProps) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm lg:grid-cols-4">
      {ITEMS.map(({ clave, etiqueta, testId }) => (
        <div key={clave} className="flex items-baseline justify-between gap-2 lg:flex-col lg:items-start lg:gap-0">
          <dt className={clave === 'pagado' ? 'text-marca-700' : 'text-gray-600'}>{etiqueta}</dt>
          <dd
            data-testid={testId}
            className={`font-bold tabular-nums lg:text-xl ${clave === destacar ? 'text-base' : ''} ${
              clave === 'pagado' ? 'text-marca-700' : clave === 'pendiente' && destacar === 'pendiente' ? 'text-amber-800' : ''
            }`}
          >
            {clave === 'clientas' ? totales.clientas : formatearClp(totales[clave])}
          </dd>
        </div>
      ))}
    </dl>
  );
}
