import { useEffect, useState } from 'react';
import { listarClientas } from '../../services/clientasService';
import { obtenerSesion } from '../../services/sesionesService';
import type { Clienta, SesionDetalle } from '../../types/dominio';

const cargar = (id: string) => Promise.all([obtenerSesion(id), listarClientas()]);

const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error ? e.message : porDefecto);

/**
 * Datos de un live y ejecución de acciones sobre él. Lo comparten la pantalla de live y la de cierre.
 * Los totales se recalculan siempre desde lo que devuelve el servicio (fuente de verdad).
 */
export function useSesionLive(id: string) {
  const [detalle, setDetalle] = useState<SesionDetalle | null>(null);
  const [clientas, setClientas] = useState<Clienta[]>([]);
  const [errorCarga, setErrorCarga] = useState('');
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

  /** Ejecuta una acción; si falla, muestra su error. Siempre recarga después. */
  async function ejecutar(accion: () => Promise<unknown>, siFalla: string) {
    setErrorAccion('');
    try {
      await accion();
    } catch (e) {
      setErrorAccion(mensaje(e, siFalla));
    }
    await recargar();
  }

  return { detalle, clientas, errorCarga, errorAccion, setErrorAccion, recargar, ejecutar };
}
