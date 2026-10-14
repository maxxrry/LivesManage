import { useId, useState, type FormEvent } from 'react';
import type { DatosUsuario, NuevoUsuario } from '../../services/usuariosService';
import { ROLES, type Rol, type Usuario } from '../../types/dominio';
import { ETIQUETAS_ROL } from '../../types/etiquetas';

interface FormularioUsuarioProps {
  /** Usuario que se edita; sin él, el formulario crea uno nuevo (y pide la contraseña inicial). */
  usuario?: Usuario;
  /** La Admin editándose a sí misma: no puede cambiar su rol (D-35). */
  esPropio?: boolean;
  onGuardar: (datos: DatosUsuario | NuevoUsuario) => Promise<void>;
  onCancelar: () => void;
}

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500';

/** RF-03: crear o editar un usuario. La contraseña solo se da al crearlo. */
export function FormularioUsuario({ usuario, esPropio = false, onGuardar, onCancelar }: FormularioUsuarioProps) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'VENDEDOR');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idAyudaRol = useId();
  const idAyudaContrasena = useId();

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await onGuardar(usuario ? { nombre, correo, rol } : { nombre, correo, rol, contrasena });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={alEnviar} aria-label={usuario ? 'Editar usuario' : 'Nuevo usuario'} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={100} autoFocus className={ENTRADA} />
        </label>
        <label className="block text-sm font-medium">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            maxLength={254}
            autoComplete="off"
            autoCapitalize="none"
            className={ENTRADA}
          />
        </label>
        <div>
          <label className="block text-sm font-medium">
            Rol
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              disabled={esPropio}
              aria-describedby={esPropio ? idAyudaRol : undefined}
              className={ENTRADA}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETAS_ROL[r]}
                </option>
              ))}
            </select>
          </label>
          {esPropio && (
            <p id={idAyudaRol} className="mt-1 text-sm text-gray-600">
              No puedes cambiar tu propio rol.
            </p>
          )}
        </div>
        {!usuario && (
          <div>
            <label className="block text-sm font-medium">
              Contraseña inicial
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                aria-describedby={idAyudaContrasena}
                className={ENTRADA}
              />
            </label>
            <p id={idAyudaContrasena} className="mt-1 text-sm text-gray-600">
              Al menos 8 caracteres. Entrégasela a la persona para su primer ingreso.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 flex-1 rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50 sm:flex-none"
        >
          {usuario ? 'Guardar' : 'Crear usuario'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="min-h-11 flex-1 rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-100 sm:flex-none"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
