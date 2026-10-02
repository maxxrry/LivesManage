import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { listarClientas } from '../../services/clientasService';
import {
  alternarPago,
  alternarPrenda,
  anotar,
  cambiarClienta,
  deshacerAnotacion,
  obtenerSesion,
  type DestinoAnotacion,
} from '../../services/sesionesService';
import type { Clienta, MontoClp, SesionDetalle } from '../../types/dominio';
import { ETIQUETAS_ESTADO_SESION } from '../../types/etiquetas';
import { formatearClp, totalLinea } from '../../utils/montos';
import { nombreSesion } from '../../utils/sesion';
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
  const [aviso, setAviso] = useState<{ texto: string; anotacionId: string; lineaId: string } | null>(null);
  const [errorAccion, setErrorAccion] = useState('');

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
  // Nunca lanza: si la acción ya se guardó, un fallo al recargar no debe informarse como fallo de la acción.
  async function recargar() {
    try {
      const [sesion, todas] = await cargar(id);
      setDetalle(sesion);
      setClientas(todas);
    } catch {
      setErrorAccion('Se guardó el cambio, pero no se pudo actualizar la hoja. Recarga la página.');
    }
  }

  const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto);

  const cerrarAviso = useCallback(() => setAviso(null), []);

  // Si anotar falla, el error sube a CampoAnotacion, que conserva el texto (RNF-13).
  async function alAnotar(destino: DestinoAnotacion, precios: MontoClp[]) {
    setErrorAccion('');
    const { anotacionId, linea } = await anotar(id, destino, precios);
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
    setErrorAccion('');
    try {
      await deshacerAnotacion(aviso.anotacionId);
    } catch (e) {
      setErrorAccion(mensaje(e, 'No se pudo deshacer la anotación.'));
    }
    await recargar();
  }

  // Un cambio en la línea recién anotada anula su Deshacer (D-22): el aviso se cierra.
  function cerrarAvisoDe(lineaId: string) {
    setAviso((actual) => (actual?.lineaId === lineaId ? null : actual));
  }

  // RF-06: cancelar o restaurar una prenda.
  async function alAlternarPrenda(lineaId: string, prendaId: string) {
    setErrorAccion('');
    cerrarAvisoDe(lineaId);
    try {
      await alternarPrenda(id, lineaId, prendaId);
    } catch (e) {
      setErrorAccion(mensaje(e, 'No se pudo corregir la prenda.'));
    }
    await recargar();
  }

  // RF-07: marcar o desmarcar el pago de una línea.
  async function alAlternarPago(lineaId: string) {
    setErrorAccion('');
    cerrarAvisoDe(lineaId);
    try {
      await alternarPago(id, lineaId);
    } catch (e) {
      setErrorAccion(mensaje(e, 'No se pudo cambiar el pago.'));
    }
    await recargar();
  }

  // RF-06: si el cambio falla, el error se muestra en el selector de la línea. Tras el cambio, Deshacer ya no aplica (D-19).
  async function alCambiarClienta(lineaId: string, destino: DestinoAnotacion) {
    setErrorAccion('');
    await cambiarClienta(id, lineaId, destino);
    setAviso(null);
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
  const sumar = (ls: typeof lineas) => ls.reduce((suma, l) => suma + totalLinea(l.prendas), 0);
  const totalLive = sumar(lineas);
  const totalPagado = sumar(lineas.filter((l) => l.estadoPago === 'PAGADO'));

  return (
    <>
      <div className="sticky top-14 z-10 space-y-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="truncate font-semibold">{nombreSesion(sesion)}</h1>
          <dl className="shrink-0 text-right text-sm">
            <div>
              <dt className="inline">Total del live </dt>
              <dd className="inline text-base font-bold tabular-nums" data-testid="total-live">
                {formatearClp(totalLive)}
              </dd>
            </div>
            <div className="text-marca-700">
              <dt className="inline">Pagado </dt>
              <dd className="inline font-semibold tabular-nums" data-testid="total-pagado">
                {formatearClp(totalPagado)}
              </dd>
            </div>
          </dl>
        </div>
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
        onAlternarPrenda={(lineaId, prendaId) => void alAlternarPrenda(lineaId, prendaId)}
        onCambiarClienta={alCambiarClienta}
        onAlternarPago={(lineaId) => void alAlternarPago(lineaId)}
      />

      {aviso && <Aviso texto={aviso.texto} onDeshacer={() => void alDeshacer()} onCerrar={cerrarAviso} />}
    </>
  );
}
