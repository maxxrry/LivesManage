import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Pantalla } from '../../components/Pantalla';
import { actualizarClienta, cambiarActiva, obtenerClienta } from '../../services/clientasService';
import { historialDeClienta } from '../../services/sesionesService';
import { usuarioActual } from '../../services/usuariosService';
import type { Clienta, CompraClienta, Rol } from '../../types/dominio';
import { textoDireccion } from '../../utils/clientas';
import { FormularioClienta } from './FormularioClienta';
import { HistorialClienta } from './HistorialClienta';

/**
 * Ficha de la clienta. RF-12: datos de contacto, Editar (D-14) y desactivar o reactivar (Admin, D-28).
 * RF-13: indicadores e historial por live (D-29).
 */
export function FichaClientaPage() {
  const { id = '' } = useParams();
  // key: al pasar a otra clienta (ej: desde el aviso de duplicado) la ficha parte de cero,
  // sin el formulario ni los datos de la anterior.
  return <Ficha key={id} id={id} />;
}

function Ficha({ id }: { id: string }) {
  const [clienta, setClienta] = useState<Clienta | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [historial, setHistorial] = useState<CompraClienta[] | null>(null);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerClienta(id).then(
      (c) => vigente && setClienta(c),
      (e: Error) => vigente && setError(e.message),
    );
    historialDeClienta(id).then(
      (h) => vigente && setHistorial(h),
      (e: Error) => vigente && setErrorHistorial(e.message),
    );
    usuarioActual().then(
      (u) => vigente && setRol(u.rol),
      () => vigente && setRol(null), // sin usuario no se ofrece desactivar
    );
    return () => {
      vigente = false;
    };
  }, [id]);

  async function alCambiarActiva(activa: boolean) {
    setError('');
    try {
      setClienta(await cambiarActiva(id, activa));
      setConfirmarBaja(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado de la clienta.');
    }
  }

  if (!clienta) {
    return (
      <Pantalla titulo="Ficha de clienta">
        <p className={`mt-2 ${error ? 'text-red-700' : 'text-gray-500'}`}>{error || 'Cargando…'}</p>
      </Pantalla>
    );
  }

  const dato = (etiqueta: string, valor?: string) => (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-2 sm:block sm:border-0">
      <dt className="text-sm text-gray-600">{etiqueta}</dt>
      <dd className="text-right font-medium sm:text-left">{valor || <span className="font-normal text-gray-400">Sin dato</span>}</dd>
    </div>
  );

  return (
    <Pantalla titulo={clienta.nombre}>
      <div className="mt-3 space-y-4">
        <Link to="/clientas" className="inline-flex min-h-11 items-center text-sm font-semibold text-marca-700 hover:underline">
          ← Clientas
        </Link>

        {!clienta.activa && (
          <p role="status" className="rounded-md border border-gray-300 bg-gray-100 p-3 text-sm">
            Clienta desactivada: conserva su historial, pero no aparece al anotar.
          </p>
        )}

        <section aria-label="Datos de contacto" className="rounded-lg border border-gray-200 bg-white p-4">
          {editando ? (
            <FormularioClienta
              clienta={clienta}
              onGuardar={async (datos) => {
                setClienta(await actualizarClienta(id, datos));
                setEditando(false);
              }}
              onCancelar={() => setEditando(false)}
            />
          ) : (
            <>
              <dl className="sm:grid sm:grid-cols-3 sm:gap-4">
                {dato('Usuario de TikTok', clienta.usuarioTiktok)}
                {dato('Teléfono', clienta.telefono)}
                {dato(
                  'Dirección',
                  clienta.direccion &&
                    `${textoDireccion(clienta.direccion)}${clienta.direccion.referencia ? ` (${clienta.direccion.referencia})` : ''}`,
                )}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="min-h-11 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700"
                >
                  Editar
                </button>
                {rol === 'ADMIN' &&
                  (clienta.activa ? (
                    !confirmarBaja && (
                      <button
                        type="button"
                        onClick={() => setConfirmarBaja(true)}
                        className="min-h-11 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100"
                      >
                        Desactivar
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => void alCambiarActiva(true)}
                      className="min-h-11 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100"
                    >
                      Reactivar
                    </button>
                  ))}
              </div>
              {confirmarBaja && (
                <div role="group" aria-label="Confirmar desactivación" className="mt-3 space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm">
                    ¿Desactivar a {clienta.nombre}? Conserva su historial, pero ya no aparecerá al anotar.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void alCambiarActiva(false)}
                      className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700"
                    >
                      Desactivar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarBaja(false)}
                      className="min-h-11 flex-1 rounded-md border border-gray-300 px-4 font-semibold hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {errorHistorial ? (
          <section aria-label="Historial por live">
            <p role="alert" className="text-sm text-red-700">
              No se pudo cargar el historial: {errorHistorial}
            </p>
          </section>
        ) : historial ? (
          <HistorialClienta historial={historial} />
        ) : (
          <p className="text-sm text-gray-500">Cargando historial…</p>
        )}
      </div>
    </Pantalla>
  );
}
