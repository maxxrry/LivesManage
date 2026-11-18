import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { alternarPago, alternarPrenda, anotar, cambiarClienta, finalizarCierre, marcarNoPago } from '../../services/sesionesService';
import { revisarCierre } from '../../utils/cierre';
import { totalesDeLineas } from '../../utils/montos';
import { nombreSesion } from '../../utils/sesion';
import { HojaLive } from '../live/HojaLive';
import { TotalesLive } from '../live/TotalesLive';
import { useSesionLive } from '../live/useSesionLive';
import { FinalizarCierre } from './FinalizarCierre';

/**
 * Cierre del live (RF-09 y RF-11): cobro (RF-07), correcciones (RF-06), No pagó, resumen y finalizar.
 * Bolsas y forma de entrega se registran en la ficha de cada clienta, también con el live Cerrado (D-47).
 * El lápiz agrega prendas a la línea, como durante el live (D-48).
 */
export function CierrePage() {
  const { id = '' } = useParams();
  const { detalle, clientas, errorCarga, errorAccion, setErrorAccion, recargar, ejecutar } = useSesionLive(id);
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [finalizando, setFinalizando] = useState(false);

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

  const alMarcarNoPago = (lineaId: string, noPago: boolean) =>
    void ejecutar(() => marcarNoPago(id, lineaId, noPago), 'No se pudo cambiar el estado de pago.');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-14 z-10 space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate font-semibold">Cierre: {nombreSesion(sesion)}</h1>
          {!finalizando && (
            <button
              type="button"
              onClick={() => {
                setFinalizando(true);
                window.scrollTo({ top: 0 });
              }}
              className="min-h-11 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold hover:border-marca-600"
            >
              Finalizar cierre
            </button>
          )}
        </div>
        <TotalesLive totales={totalesDeLineas(lineas)} destacar="pendiente" />
        {errorAccion && (
          <p role="alert" className="text-sm text-red-700">
            {errorAccion}
          </p>
        )}
      </div>

      {finalizando && (
        <FinalizarCierre
          revision={revisarCierre(lineas)}
          onNoPago={(lineaId) => alMarcarNoPago(lineaId, true)}
          onConfirmar={async () => {
            await finalizarCierre(id);
            await navigate(`/lives/${id}`);
          }}
          onVolver={() => setFinalizando(false)}
        />
      )}

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
        onAgregarPrendas={async (linea, precios) => {
          setErrorAccion('');
          await anotar(id, { clientaId: linea.clientaId }, precios);
          await recargar();
        }}
        onAlternarPago={(lineaId) => void ejecutar(() => alternarPago(id, lineaId), 'No se pudo cambiar el pago.')}
        onQuitarNoPago={(lineaId) => alMarcarNoPago(lineaId, false)}
        busqueda={busqueda}
        onBuscar={setBusqueda}
      />
    </div>
  );
}
