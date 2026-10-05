import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { crearClienta, listarClientas } from '../../services/clientasService';
import type { Clienta } from '../../types/dominio';
import { buscarClientas } from '../../utils/clientas';
import { FormularioClienta } from './FormularioClienta';

const Desactivada = () => (
  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Desactivada</span>
);

/** RF-12: buscar clientas por nombre, usuario de TikTok o teléfono, y registrar una nueva. */
export function ClientasPage() {
  const navigate = useNavigate();
  const [clientas, setClientas] = useState<Clienta[] | null>(null);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [verDesactivadas, setVerDesactivadas] = useState(false);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarClientas().then(
      (todas) => vigente && setClientas(todas),
      (e: Error) => vigente && setError(e.message),
    );
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = buscarClientas(busqueda, (clientas ?? []).filter((c) => verDesactivadas || c.activa));

  return (
    <Pantalla titulo="Clientas">
      <div className="mt-3 space-y-4">
        {creando ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Nueva clienta</h2>
            <FormularioClienta
              onGuardar={async (datos) => {
                const nueva = await crearClienta(datos);
                await navigate(`/clientas/${nueva.id}`);
              }}
              onCancelar={() => setCreando(false)}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar clientas"
              placeholder="Nombre, @usuario o teléfono"
              autoComplete="off"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base focus:border-marca-600 focus:outline-none sm:max-w-sm sm:flex-1"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={verDesactivadas}
                onChange={(e) => setVerDesactivadas(e.target.checked)}
                className="size-5 accent-marca-600"
              />
              Mostrar desactivadas
            </label>
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="min-h-11 w-full rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 sm:ml-auto sm:w-auto"
            >
              Nueva clienta
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {!clientas ? (
          !error && <p className="text-sm text-gray-500">Cargando…</p>
        ) : visibles.length === 0 ? (
          <p role="status" className="text-sm text-gray-500">
            {busqueda.trim() ? `Ninguna clienta coincide con "${busqueda.trim()}".` : 'Aún no hay clientas.'}
          </p>
        ) : (
          <>
            {/* Computador: tabla (D-24). La fila entera abre la ficha. */}
            <table aria-label="Lista de clientas" className="hidden w-full overflow-hidden rounded-lg bg-white text-sm lg:table">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Nombre</th>
                  <th scope="col" className="px-3 py-2 font-medium">TikTok</th>
                  <th scope="col" className="px-3 py-2 font-medium">Teléfono</th>
                  <th scope="col" className="px-3 py-2 font-medium">Comuna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibles.map((c) => (
                  <tr key={c.id} className="relative hover:bg-marca-50 focus-within:bg-marca-50">
                    <td className="px-3 py-3 font-medium">
                      <Link to={`/clientas/${c.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                        {c.nombre}
                      </Link>{' '}
                      {!c.activa && <Desactivada />}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{c.usuarioTiktok ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-700 tabular-nums">{c.telefono ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-700">{c.direccion?.comuna ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Celular: tarjetas. */}
            <ul aria-label="Lista de clientas" className="space-y-2 lg:hidden">
              {visibles.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/clientas/${c.id}`}
                    className="block min-h-11 rounded-lg border border-gray-200 bg-white p-3 hover:border-marca-600"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.nombre}</span>
                      {!c.activa && <Desactivada />}
                    </span>
                    {(c.usuarioTiktok || c.telefono) && (
                      <span className="mt-0.5 block text-sm text-gray-600">
                        {[c.usuarioTiktok, c.telefono].filter(Boolean).join(' · ')}
                      </span>
                    )}
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
