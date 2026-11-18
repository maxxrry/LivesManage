import { useState, type FormEvent } from 'react';
import { Pantalla } from '../../components/Pantalla';
import { cambiarMiContrasena } from '../../services/usuariosService';

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none';

/** D-49: cada usuario cambia su contraseña confirmando la actual. */
export function MiContrasenaPage() {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setAviso('');
    if (nueva !== repetida) {
      setError('La contraseña nueva y su repetición no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      await cambiarMiContrasena(actual, nueva);
      setActual('');
      setNueva('');
      setRepetida('');
      setAviso('Tu contraseña se cambió. Úsala la próxima vez que entres.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla titulo="Cambiar mi contraseña">
      <form onSubmit={alEnviar} aria-label="Cambiar mi contraseña" className="mt-3 max-w-md space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <label className="block text-sm font-medium">
          Contraseña actual
          <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" className={ENTRADA} />
        </label>
        <label className="block text-sm font-medium">
          Contraseña nueva
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={8} autoComplete="new-password" className={ENTRADA} />
        </label>
        <label className="block text-sm font-medium">
          Repite la contraseña nueva
          <input type="password" value={repetida} onChange={(e) => setRepetida(e.target.value)} required minLength={8} autoComplete="new-password" className={ENTRADA} />
        </label>
        <p className="text-sm text-gray-600">Al menos 8 caracteres.</p>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {aviso && (
          <p role="status" className="text-sm text-green-800">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="min-h-11 w-full rounded-md bg-marca-600 px-4 font-semibold text-white hover:bg-marca-700 disabled:opacity-50 sm:w-auto"
        >
          Cambiar contraseña
        </button>
      </form>
    </Pantalla>
  );
}
