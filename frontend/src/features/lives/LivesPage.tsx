import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { abrirSesion, listarSesiones } from '../../services/sesionesService';
import type { EstadoSesion, SesionResumen } from '../../types/dominio';
import { ETIQUETAS_ESTADO_SESION } from '../../types/etiquetas';
import { formatearFechaHora } from '../../utils/fechas';
import { formatearClp } from '../../utils/montos';
import { nombreSesion } from '../../utils/sesion';

const COLOR_ESTADO: Record<EstadoSesion, string> = {
  ABIERTA: 'bg-marca-100 text-marca-700',
  EN_CIERRE: 'bg-amber-100 text-amber-800',
  CERRADA: 'bg-gray-200 text-gray-700',
};

/** RF-04: lista de lives con sus totales, y abrir uno nuevo (solo uno Abierto a la vez). */
export function LivesPage() {
  const navigate = useNavigate();
  const [lista, setLista] = useState<SesionResumen[] | null>(null);
  const [error, setError] = useState('');
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarSesiones().then(
      (sesiones) => vigente && setLista(sesiones),
      (e: Error) => vigente && setError(e.message),
    );
    return () => {
      vigente = false;
    };
  }, []);

  async function alAbrir(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const sesion = await abrirSesion(nombre);
      await navigate(`/lives/${sesion.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir el live.');
      setEnviando(false);
    }
  }

  const abierta = lista?.find((s) => s.estado === 'ABIERTA');
  const ordenada = [...(lista ?? [])].sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));

  return (
    <Pantalla titulo="Lives">
      <div className="mt-3 space-y-4">
        {abierta ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-marca-600 bg-marca-50 p-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-marca-700">Live abierto</p>
              <p className="truncate font-medium">{nombreSesion(abierta)}</p>
            </div>
            <Link
              to={`/lives/${abierta.id}`}
              className="flex min-h-11 shrink-0 items-center rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700"
            >
              Continuar
            </Link>
          </div>
        ) : formularioAbierto ? (
          <form onSubmit={alAbrir} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <label className="block text-sm font-medium" htmlFor="nombre-live">
              Nombre del live (opcional)
            </label>
            <input
              id="nombre-live"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Live jueves noche"
              autoFocus
              className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-base focus:border-marca-600 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enviando}
                className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
              >
                Abrir
              </button>
              <button
                type="button"
                onClick={() => setFormularioAbierto(false)}
                className="min-h-11 flex-1 rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          lista && (
            <button
              type="button"
              onClick={() => setFormularioAbierto(true)}
              className="min-h-11 w-full rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700"
            >
              Abrir live
            </button>
          )
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {!lista ? (
          !error && <p className="text-sm text-gray-500">Cargando…</p>
        ) : ordenada.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay lives.</p>
        ) : (
          <>
            {/* Computador: tabla para comparar montos en columna (D-24). La fila entera es el enlace. */}
            <table
              aria-label="Lista de lives"
              className="hidden w-full border-collapse overflow-hidden rounded-lg bg-white text-sm lg:table"
            >
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Live
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Inicio
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Clientas
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Pagado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenada.map((s) => (
                  <tr key={s.id} className="relative hover:bg-marca-50 focus-within:bg-marca-50">
                    <td className="px-3 py-3 font-medium">
                      <Link to={`/lives/${s.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                        {nombreSesion(s)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-600 tabular-nums">{formatearFechaHora(s.inicio)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[s.estado]}`}>
                        {ETIQUETAS_ESTADO_SESION[s.estado]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.clientas}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatearClp(s.total)}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatearClp(s.totalPagado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: tarjetas. */}
            <ul aria-label="Lista de lives" className="space-y-2 lg:hidden">
              {ordenada.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/lives/${s.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-3 hover:border-marca-600"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{nombreSesion(s)}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[s.estado]}`}
                      >
                        {ETIQUETAS_ESTADO_SESION[s.estado]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatearFechaHora(s.inicio)}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-sm tabular-nums">
                      <span>
                        {s.clientas} {s.clientas === 1 ? 'clienta' : 'clientas'}
                      </span>
                      <span>
                        Total <strong>{formatearClp(s.total)}</strong>
                      </span>
                      <span>
                        Pagado <strong>{formatearClp(s.totalPagado)}</strong>
                      </span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Pantalla>
  );
}
