import { useCallback, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import {
  alternarPago,
  alternarPrenda,
  anotar,
  cambiarClienta,
  deshacerAnotacion,
  terminarSesion,
  type DestinoAnotacion,
} from '../../services/sesionesService';
import type { MontoClp } from '../../types/dominio';
import { ETIQUETAS_ESTADO_SESION } from '../../types/etiquetas';
import { formatearClp, totalesDeLineas } from '../../utils/montos';
import { nombreSesion } from '../../utils/sesion';
import { Aviso } from './Aviso';
import { CampoAnotacion } from './CampoAnotacion';
import { HojaLive } from './HojaLive';
import { TotalesLive } from './TotalesLive';
import { useSesionLive } from './useSesionLive';

/** Pantalla de live: totales arriba, campo de anotación siempre visible y la hoja debajo. */
export function LivePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { detalle, clientas, errorCarga, errorAccion, setErrorAccion, recargar, ejecutar } = useSesionLive(id);
  const [aviso, setAviso] = useState<{ texto: string; anotacionId: string; lineaId: string } | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [confirmarTermino, setConfirmarTermino] = useState(false);
  const [terminando, setTerminando] = useState(false);

  const cerrarAviso = useCallback(() => setAviso(null), []);

  // Si anotar falla, el error sube a CampoAnotacion, que conserva el texto (RNF-13).
  async function alAnotar(destino: DestinoAnotacion, precios: MontoClp[]) {
    setErrorAccion('');
    const { anotacionId, linea } = await anotar(id, destino, precios);
    setBusqueda(''); // la línea anotada debe verse aunque no coincida con la búsqueda
    const total = precios.reduce((suma, p) => suma + p, 0);
    setAviso({
      anotacionId,
      lineaId: linea.id,
      texto: `${linea.clientaNombre}: ${precios.map((p) => p / 1000).join('-')} = ${formatearClp(total)}`,
    });
    await recargar();
  }

  async function alDeshacer() {
    if (!aviso) return;
    setAviso(null);
    await ejecutar(() => deshacerAnotacion(aviso.anotacionId), 'No se pudo deshacer la anotación.');
  }

  // Un cambio en la línea recién anotada anula su Deshacer (D-22): el aviso se cierra.
  function cerrarAvisoDe(lineaId: string) {
    setAviso((actual) => (actual?.lineaId === lineaId ? null : actual));
  }

  // RF-06: si el cambio falla, el error se muestra en el selector de la línea. Tras el cambio, Deshacer ya no aplica (D-19).
  async function alCambiarClienta(lineaId: string, destino: DestinoAnotacion) {
    setErrorAccion('');
    await cambiarClienta(id, lineaId, destino);
    setAviso(null);
    await recargar();
  }

  // RF-09: tras confirmar, el live pasa a En cierre y se abre su pantalla de cierre.
  async function alTerminar() {
    setErrorAccion('');
    setTerminando(true); // evita un segundo toque mientras se procesa
    try {
      await terminarSesion(id);
      await navigate(`/lives/${id}/cierre`);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo terminar el live.');
      setConfirmarTermino(false);
      setTerminando(false);
    }
  }

  if (errorCarga || !detalle) {
    return (
      <Pantalla titulo="Pantalla de live">
        <p className={`mt-2 ${errorCarga ? 'text-red-700' : 'text-gray-500'}`}>{errorCarga || 'Cargando…'}</p>
      </Pantalla>
    );
  }

  const { sesion, lineas } = detalle;
  // Un live En cierre se trabaja en su pantalla de cierre (D-25).
  if (sesion.estado === 'EN_CIERRE') return <Navigate to={`/lives/${id}/cierre`} replace />;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-14 z-10 space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate font-semibold">{nombreSesion(sesion)}</h1>
          {sesion.estado === 'ABIERTA' && !confirmarTermino && (
            <button
              type="button"
              onClick={() => setConfirmarTermino(true)}
              className="min-h-11 shrink-0 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold hover:border-marca-600"
            >
              Terminar live
            </button>
          )}
        </div>
        {confirmarTermino && (
          <div role="group" aria-label="Confirmar término" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm">¿Terminar el live? Ya no se podrá anotar; seguirás con el cierre.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void alTerminar()}
                disabled={terminando}
                className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
              >
                Terminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarTermino(false)}
                className="min-h-11 flex-1 rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        <TotalesLive totales={totalesDeLineas(lineas)} />
        {sesion.estado === 'ABIERTA' ? (
          <CampoAnotacion clientas={clientas} idsConLinea={new Set(lineas.map((l) => l.clientaId))} onAnotar={alAnotar} />
        ) : (
          <p className="text-sm text-gray-600">
            Estado: {ETIQUETAS_ESTADO_SESION[sesion.estado]}. Ya no se puede anotar.
          </p>
        )}
        {errorAccion && (
          <p role="alert" className="text-sm text-red-700">
            {errorAccion}
          </p>
        )}
      </div>

      <HojaLive
        lineas={lineas}
        editable={sesion.estado !== 'CERRADA'}
        clientas={clientas}
        onAlternarPrenda={(lineaId, prendaId) => {
          cerrarAvisoDe(lineaId);
          void ejecutar(() => alternarPrenda(id, lineaId, prendaId), 'No se pudo corregir la prenda.');
        }}
        onCambiarClienta={alCambiarClienta}
        onAlternarPago={(lineaId) => {
          cerrarAvisoDe(lineaId);
          void ejecutar(() => alternarPago(id, lineaId), 'No se pudo cambiar el pago.');
        }}
        busqueda={busqueda}
        onBuscar={setBusqueda}
      />

      {aviso && <Aviso texto={aviso.texto} onDeshacer={() => void alDeshacer()} onCerrar={cerrarAviso} />}
    </div>
  );
}
