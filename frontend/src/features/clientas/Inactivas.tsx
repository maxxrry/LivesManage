import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { cambiarDiasInactividad, listarInactivas, obtenerDiasInactividad } from '../../services/clientasService';
import { usuarioActual } from '../../services/usuariosService';
import type { Clienta, Rol } from '../../types/dominio';
import { normalizarTelefono, type ClientaInactiva } from '../../utils/clientas';
import { formatearFecha } from '../../utils/fechas';

const ENLACE = 'inline-flex min-h-11 items-center font-semibold text-marca-700 hover:underline';

/** TikTok, teléfono (llamar) y WhatsApp, para contactarla (D-30). */
function Contacto({ clienta }: { clienta: Clienta }) {
  const telefono = normalizarTelefono(clienta.telefono ?? '');
  if (!clienta.usuarioTiktok && !clienta.telefono) return <span className="text-gray-400">Sin datos de contacto</span>;
  return (
    <span className="flex flex-wrap items-center gap-x-3">
      {clienta.usuarioTiktok && <span>{clienta.usuarioTiktok}</span>}
      {clienta.telefono && (
        <a href={`tel:${clienta.telefono.replace(/[^\d+]/g, '')}`} className={ENLACE}>
          {clienta.telefono}
        </a>
      )}
      {telefono.length === 9 && (
        <a
          href={`https://wa.me/56${telefono}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp de ${clienta.nombre}`}
          className={ENLACE}
        >
          WhatsApp
        </a>
      )}
    </span>
  );
}

/** RF-14: clientas con al menos una compra y ninguna en los últimos N días. La administradora cambia N. */
export function Inactivas() {
  const [inactivas, setInactivas] = useState<ClientaInactiva[] | null>(null);
  const [dias, setDias] = useState<number | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [textoDias, setTextoDias] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([listarInactivas(), obtenerDiasInactividad()]).then(
      ([lista, n]) => {
        if (!vigente) return;
        setInactivas(lista);
        setDias(n);
        setTextoDias(String(n));
      },
      (e: Error) => vigente && setError(e.message),
    );
    usuarioActual().then(
      (u) => vigente && setRol(u.rol),
      () => vigente && setRol(null),
    );
    return () => {
      vigente = false;
    };
  }, []);

  async function guardarDias(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      setDias(await cambiarDiasInactividad(Number(textoDias)));
      setInactivas(await listarInactivas());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los días.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section aria-label="Inactivas" className="space-y-4">
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        {dias !== null && (
          <p className="text-sm text-gray-600">
            Clientas que compraron alguna vez y no compran hace más de <strong>{dias} días</strong>.
          </p>
        )}
        {rol === 'ADMIN' && dias !== null && (
          <form onSubmit={guardarDias} aria-label="Días de inactividad" className="flex items-end gap-2">
            <label className="block text-sm font-medium">
              Días sin comprar
              <input
                type="number"
                min={1}
                max={365}
                step={1}
                inputMode="numeric"
                required
                value={textoDias}
                onChange={(e) => setTextoDias(e.target.value)}
                className="mt-1 block min-h-11 w-28 rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={guardando || Number(textoDias) === dias}
              className="min-h-11 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
            >
              Guardar
            </button>
          </form>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {!inactivas ? (
        !error && <p className="text-sm text-gray-500">Cargando…</p>
      ) : inactivas.length === 0 ? (
        <p role="status" className="text-sm text-gray-500">
          No hay clientas inactivas.
        </p>
      ) : (
        <>
          {/* Computador: tabla (D-24). */}
          <table aria-label="Clientas inactivas" className="hidden w-full overflow-hidden rounded-lg bg-white text-sm lg:table">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Clienta</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Días sin comprar</th>
                <th scope="col" className="px-3 py-2 font-medium">Última compra</th>
                <th scope="col" className="px-3 py-2 font-medium">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inactivas.map((i) => (
                <tr key={i.clienta.id}>
                  <td className="px-3 py-2">
                    <Link to={`/clientas/${i.clienta.id}`} className={ENLACE}>
                      {i.clienta.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">{i.diasSinComprar}</td>
                  <td className="px-3 py-2 tabular-nums text-gray-700">{formatearFecha(i.ultimaCompra)}</td>
                  <td className="px-3 py-2 text-gray-700">
                    <Contacto clienta={i.clienta} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Celular: tarjetas. */}
          <ul aria-label="Clientas inactivas" className="space-y-2 lg:hidden">
            {inactivas.map((i) => (
              <li key={i.clienta.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/clientas/${i.clienta.id}`} className={`${ENLACE} text-base`}>
                    {i.clienta.nombre}
                  </Link>
                  <span className="text-right">
                    <span className="block font-bold tabular-nums">{i.diasSinComprar} días</span>
                    <span className="block text-gray-600">desde {formatearFecha(i.ultimaCompra)}</span>
                  </span>
                </div>
                <div className="mt-1 text-gray-700">
                  <Contacto clienta={i.clienta} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
