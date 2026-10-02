import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { listarClientas } from '../../services/clientasService';
import { anotar, deshacerAnotacion, obtenerSesion, type DestinoAnotacion } from '../../services/sesionesService';
import type { Clienta, MontoClp, SesionDetalle } from '../../types/dominio';
import { ETIQUETAS_ESTADO_SESION } from '../../types/etiquetas';
import { formatearClp, totalLinea } from '../../utils/montos';
import { Aviso } from './Aviso';
import { CampoAnotacion } from './CampoAnotacion';
import { HojaLive } from './HojaLive';

const cargar = (id: string) => Promise.all([obtenerSesion(id), listarClientas()]);

/** Pantalla de live: total arriba, campo de anotación siempre visible y la hoja debajo. */
export function LivePage() {
  const { id = '' } = useParams();
  const [detalle, setDetalle] = useState<SesionDetalle | null>(null);
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; anotacionId: string } | null>(null);

  useEffect(() => {
    let vigente = true; // ignora la respuesta si se cambió de live antes de que llegara
    cargar(id).then(
      ([sesion, todas]) => {
        if (!vigente) return;
        setDetalle(sesion);
        setClientas(todas);
      },
      (e: Error) => vigente && setErrorCarga(e.message),
    );
    return () => {
      vigente = false;
    };
  }, [id]);

  // Los totales se recalculan siempre desde lo que devuelve el servicio (fuente de verdad).
  async function recargar() {
    const [sesion, todas] = await cargar(id);
    setDetalle(sesion);
    setClientas(todas);
  }

  const cerrarAviso = useCallback(() => setAviso(null), []);

  async function alAnotar(destino: DestinoAnotacion, precios: MontoClp[]) {
    const { anotacionId, linea } = await anotar(id, destino, precios);
    const total = precios.reduce((suma, p) => suma + p, 0);
    setAviso({
      anotacionId,
      texto: `${linea.clientaNombre}: ${precios.map((p) => p / 1000).join('-')} = ${formatearClp(total)}`,
    });
    await recargar();
  }

  async function alDeshacer() {
    if (!aviso) return;
    setAviso(null);
    await deshacerAnotacion(aviso.anotacionId);
    await recargar();
  }

  if (errorCarga || !detalle) {
    return (
      <Pantalla titulo="Pantalla de live">
        <p className={`mt-2 ${errorCarga ? 'text-red-700' : 'text-gray-500'}`}>{errorCarga || 'Cargando…'}</p>
      </Pantalla>
    );
  }

  const { sesion, lineas } = detalle;
  const totalLive = lineas.reduce((suma, l) => suma + totalLinea(l.prendas), 0);

  return (
    <>
      <div className="sticky top-14 z-10 space-y-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="truncate font-semibold">{sesion.nombre ?? 'Live'}</h1>
          <p className="shrink-0 text-sm">
            Total del live <strong className="text-base tabular-nums" data-testid="total-live">{formatearClp(totalLive)}</strong>
          </p>
        </div>
        {sesion.estado === 'ABIERTA' ? (
          <CampoAnotacion clientas={clientas} idsConLinea={new Set(lineas.map((l) => l.clientaId))} onAnotar={alAnotar} />
        ) : (
          <p className="text-sm text-gray-600">
            Este live está {ETIQUETAS_ESTADO_SESION[sesion.estado].toLowerCase()}: ya no se puede anotar.
          </p>
        )}
      </div>

      <HojaLive lineas={lineas} />

      {aviso && <Aviso texto={aviso.texto} onDeshacer={() => void alDeshacer()} onCerrar={cerrarAviso} />}
    </>
  );
}
