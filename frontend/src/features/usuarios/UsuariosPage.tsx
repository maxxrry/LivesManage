import { useEffect, useState, type FormEvent } from 'react';
import { Pantalla } from '../../components/Pantalla';
import {
  cambiarActivoUsuario,
  crearUsuario,
  editarUsuario,
  listarUsuarios,
  restablecerContrasena,
  usuarioActual,
  usuarioDeLaSesion,
  type NuevoUsuario,
} from '../../services/usuariosService';
import type { Usuario } from '../../types/dominio';
import { ETIQUETAS_ROL } from '../../types/etiquetas';
import { FormularioUsuario } from './FormularioUsuario';

const BOTON_SECUNDARIO =
  'min-h-11 rounded-md border border-gray-300 bg-white px-3 text-sm font-semibold hover:border-marca-600 disabled:opacity-50';

/** RF-03: la Admin crea, edita, desactiva y reactiva usuarios. RF-02: nadie más entra a esta pantalla. */
export function UsuariosPage() {
  // Primero la sesión guardada (sin esperar); después los datos al día, por si cambió el rol.
  const [yo, setYo] = useState(usuarioDeLaSesion);
  const esAdmin = yo?.rol === 'ADMIN';
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmarBajaId, setConfirmarBajaId] = useState<string | null>(null);
  const [contrasenaId, setContrasenaId] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    usuarioActual().then(setYo, () => {}); // si falla, sigue la sesión guardada; la API igual responde 403
  }, []);

  useEffect(() => {
    if (!esAdmin) return;
    let vigente = true;
    listarUsuarios().then(
      (todos) => vigente && setUsuarios(todos),
      (e: Error) => vigente && setError(e.message),
    );
    return () => {
      vigente = false;
    };
  }, [esAdmin]);

  if (!esAdmin) {
    return (
      <Pantalla titulo="Usuarios">
        <p role="alert" className="mt-2 text-sm text-gray-700">
          No tienes permiso para ver esta pantalla. Solo un administrador gestiona usuarios.
        </p>
      </Pantalla>
    );
  }

  /** Reemplaza el usuario en la lista (y la reordena por nombre). Si la lista no cargó, no inventa una. */
  function actualizar(usuario: Usuario) {
    setUsuarios(
      (lista) => lista && [...lista.filter((u) => u.id !== usuario.id), usuario].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    );
    if (usuario.id === yo?.id) void usuarioActual().then(setYo); // editó sus propios datos
  }

  async function alCambiarActivo(usuario: Usuario, activo: boolean) {
    setError('');
    setAviso('');
    setOcupado(true); // evita un segundo toque mientras se procesa
    try {
      actualizar(await cambiarActivoUsuario(usuario.id, activo));
      setAviso(`${usuario.nombre} quedó ${activo ? 'activo' : 'desactivado'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el usuario.');
    } finally {
      setConfirmarBajaId(null);
      setOcupado(false);
    }
  }

  return (
    <Pantalla titulo="Usuarios">
      <div className="mt-3 space-y-4">
        {creando ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Nuevo usuario</h2>
            <FormularioUsuario
              onGuardar={async (datos) => {
                const nuevo = await crearUsuario(datos as NuevoUsuario);
                actualizar(nuevo);
                setCreando(false);
                setAviso(`${nuevo.nombre} fue creado. Ya puede iniciar sesión con su correo y la contraseña inicial.`);
              }}
              onCancelar={() => setCreando(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCreando(true);
              setEditandoId(null);
              setAviso('');
            }}
            className="min-h-11 w-full rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 sm:w-auto"
          >
            Nuevo usuario
          </button>
        )}

        {aviso && (
          <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {aviso}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {!usuarios ? (
          !error && <p className="text-sm text-gray-500">Cargando…</p>
        ) : (
          <ul aria-label="Lista de usuarios" className="space-y-2">
            {usuarios.map((u) => {
              const esPropio = u.id === yo.id;
              return (
                <li key={u.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  {editandoId === u.id ? (
                    <FormularioUsuario
                      usuario={u}
                      esPropio={esPropio}
                      onGuardar={async (datos) => {
                        actualizar(await editarUsuario(u.id, datos));
                        setEditandoId(null);
                        setAviso(`Se guardaron los cambios de ${datos.nombre.trim()}.`);
                      }}
                      onCancelar={() => setEditandoId(null)}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
                      <div className="min-w-0 lg:flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-medium">
                          <span className="truncate">{u.nombre}</span>
                          {esPropio && <span className="text-sm font-normal text-gray-500">(tú)</span>}
                          {!u.activo && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">Desactivado</span>
                          )}
                        </p>
                        <p className="truncate text-sm text-gray-600">{u.correo}</p>
                      </div>
                      <p className="text-sm text-gray-700 lg:w-32">{ETIQUETAS_ROL[u.rol]}</p>
                      {confirmarBajaId === u.id ? (
                        <div role="group" aria-label="Confirmar desactivación" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 lg:max-w-sm">
                          <p className="text-sm">¿Desactivar a {u.nombre}? No podrá iniciar sesión hasta que lo reactives.</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void alCambiarActivo(u, false)}
                              disabled={ocupado}
                              className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50"
                            >
                              Desactivar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmarBajaId(null)}
                              className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : contrasenaId === u.id ? (
                        <RestablecerContrasena
                          nombre={u.nombre}
                          onGuardar={async (nueva) => {
                            await restablecerContrasena(u.id, nueva);
                            setContrasenaId(null);
                            setAviso(`Se restableció la contraseña de ${u.nombre}. Entrégasela para su próximo ingreso.`);
                          }}
                          onCancelar={() => setContrasenaId(null)}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2 lg:w-80 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoId(u.id);
                              setCreando(false);
                              setAviso('');
                            }}
                            aria-label={`Editar a ${u.nombre}`}
                            className={BOTON_SECUNDARIO}
                          >
                            Editar
                          </button>
                          {/* La propia se cambia en "Cambiar mi contraseña" (D-49). */}
                          {!esPropio && (
                            <button
                              type="button"
                              onClick={() => {
                                setContrasenaId(u.id);
                                setAviso('');
                              }}
                              aria-label={`Restablecer la contraseña de ${u.nombre}`}
                              className={BOTON_SECUNDARIO}
                            >
                              Contraseña
                            </button>
                          )}
                          {/* La Admin no se desactiva a sí misma (D-35). */}
                          {!esPropio &&
                            (u.activo ? (
                              <button
                                type="button"
                                onClick={() => setConfirmarBajaId(u.id)}
                                aria-label={`Desactivar a ${u.nombre}`}
                                className={BOTON_SECUNDARIO}
                              >
                                Desactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void alCambiarActivo(u, true)}
                                disabled={ocupado}
                                aria-label={`Reactivar a ${u.nombre}`}
                                className={BOTON_SECUNDARIO}
                              >
                                Reactivar
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Pantalla>
  );
}

/** D-49: la Admin le da una contraseña nueva a otro usuario (ej: la olvidó). */
function RestablecerContrasena({ nombre, onGuardar, onCancelar }: { nombre: string; onGuardar: (nueva: string) => Promise<void>; onCancelar: () => void }) {
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await onGuardar(nueva);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={alEnviar} aria-label={`Contraseña de ${nombre}`} className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 lg:max-w-sm">
      <label className="block text-sm font-medium">
        Contraseña nueva para {nombre}
        <input
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none"
        />
      </label>
      <p className="text-sm text-gray-600">Al menos 8 caracteres.</p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
