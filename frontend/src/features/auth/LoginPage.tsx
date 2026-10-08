import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { iniciarSesion, usuarioDeLaSesion } from '../../services/usuariosService';

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none';

/** RF-01: ingreso con correo y contraseña. */
export function LoginPage() {
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuarioDeLaSesion()) return <Navigate to="/lives" replace />;

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(correo, contrasena);
      void navegar('/lives', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-center text-2xl font-bold text-marca-700">LivesManage</p>
        <h1 className="mt-1 text-center text-base font-medium text-gray-600">Iniciar sesión</h1>

        <form onSubmit={alEnviar} aria-label="Iniciar sesión" className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              className={ENTRADA}
            />
          </label>
          <label className="block text-sm font-medium">
            Contraseña
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              autoComplete="current-password"
              className={ENTRADA}
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 w-full rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-600 disabled:opacity-50"
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
