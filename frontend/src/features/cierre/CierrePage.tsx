import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { alternarBolsa, alternarPago, alternarPrenda, cambiarClienta } from '../../services/sesionesService';
import { totalesDeLineas } from '../../utils/montos';
import { nombreSesion } from '../../utils/sesion';
import { HojaLive } from '../live/HojaLive';
import { TotalesLive } from '../live/TotalesLive';
import { useSesionLive } from '../live/useSesionLive';

/**
 * Cierre del live (RF-09 a RF-11). RF-09: avance de bolsas revisadas y check por clienta.
 * Las correcciones (RF-06) y el cobro (RF-07) siguen disponibles en cada línea.
 */
export function CierrePage() {
  const { id = '' } = useParams();
  const { detalle, clientas, errorCarga, errorAccion, setErrorAccion, recargar, ejecutar } = useSesionLive(id);
  const [busqueda, setBusqueda] = useState('');

  if (errorCarga || !detalle) {
    return (
      <Pantalla titulo="Cierre del live">
        <p className={`mt-2 ${errorCarga ? 'text-red-700' : 'text-gray-500'}`}>{errorCarga || 'Cargando…'}</p>
      </Pantalla>
    );
  }

  const { sesion, lineas } = detalle;
  // Solo un live En cierre tiene pantalla de cierre; el resto se ve en su pantalla de live.
  if (sesion.estado !== 'EN_CIERRE') return <Navigate to={`/lives/${id}`} replace />;

  const revisadas = lineas.filter((l) => l.bolsaRevisada).length;
  const completas = lineas.length > 0 && revisadas === lineas.length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-14 z-10 space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h1 className="truncate font-semibold">Cierre: {nombreSesion(sesion)}</h1>
        <TotalesLive totales={totalesDeLineas(lineas)} destacar="pendiente" />
        <div className="space-y-1.5">
          <p className="flex items-baseline justify-between text-sm text-gray-600">
            Bolsas revisadas
            <strong
              className={`text-base tabular-nums ${completas ? 'text-green-800' : 'text-gray-900'}`}
              data-testid="avance-bolsas"
            >
              {revisadas} de {lineas.length}
            </strong>
          </p>
          {/* <progress> nativo con estilo propio: el riel gris y el avance en rosado, verde al completar. */}
          <progress
            value={revisadas}
            max={Math.max(lineas.length, 1)}
            aria-label="Avance de bolsas revisadas"
            className={`block h-2 w-full appearance-none overflow-hidden rounded-full bg-gray-200 [&::-webkit-progress-bar]:bg-gray-200 ${
              completas
                ? '[&::-moz-progress-bar]:bg-green-700 [&::-webkit-progress-value]:bg-green-700'
                : '[&::-moz-progress-bar]:bg-marca-600 [&::-webkit-progress-value]:bg-marca-600'
            } [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-[width]`}
          />
        </div>
        {errorAccion && (
          <p role="alert" className="text-sm text-red-700">
            {errorAccion}
          </p>
        )}
      </div>

      <HojaLive
        lineas={lineas}
        editable
        clientas={clientas}
        onAlternarPrenda={(lineaId, prendaId) =>
          void ejecutar(() => alternarPrenda(id, lineaId, prendaId), 'No se pudo corregir la prenda.')
        }
        onCambiarClienta={async (lineaId, destino) => {
          setErrorAccion('');
          await cambiarClienta(id, lineaId, destino);
          await recargar();
        }}
        onAlternarPago={(lineaId) => void ejecutar(() => alternarPago(id, lineaId), 'No se pudo cambiar el pago.')}
        onAlternarBolsa={(lineaId) => void ejecutar(() => alternarBolsa(id, lineaId), 'No se pudo marcar la bolsa.')}
        busqueda={busqueda}
        onBuscar={setBusqueda}
      />
    </div>
  );
}
