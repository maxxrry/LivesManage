import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { CamposDireccion } from '../../components/CamposDireccion';
import { buscarDuplicados, type DatosClienta } from '../../services/clientasService';
import type { Clienta, Direccion } from '../../types/dominio';
import { DIRECCION_VACIA, type Duplicados } from '../../utils/clientas';

interface FormularioClientaProps {
  /** Clienta que se edita; sin ella, el formulario crea una nueva. */
  clienta?: Clienta;
  onGuardar: (datos: DatosClienta) => Promise<void>;
  onCancelar: () => void;
}

const ENTRADA =
  'mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-base font-normal focus:border-marca-600 focus:outline-none';

const sinDireccion = (d: Direccion) => !d.calle.trim() && !d.comuna.trim() && !d.referencia?.trim();

/**
 * RF-12: registrar o editar una clienta. Solo el nombre es obligatorio.
 * Si el usuario de TikTok o el teléfono ya existen, avisa quién los tiene; se puede guardar igual (D-28).
 */
export function FormularioClienta({ clienta, onGuardar, onCancelar }: FormularioClientaProps) {
  const [nombre, setNombre] = useState(clienta?.nombre ?? '');
  const [usuarioTiktok, setUsuarioTiktok] = useState(clienta?.usuarioTiktok ?? '');
  const [telefono, setTelefono] = useState(clienta?.telefono ?? '');
  const [direccion, setDireccion] = useState<Direccion>(clienta?.direccion ?? DIRECCION_VACIA);
  const [duplicados, setDuplicados] = useState<Duplicados>({});
  const [confirmarDuplicado, setConfirmarDuplicado] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idTiktok = useId();
  const idTelefono = useId();

  const datos = (): DatosClienta => ({
    nombre,
    usuarioTiktok,
    telefono,
    direccion: sinDireccion(direccion) ? undefined : direccion,
  });

  // Se revisa al salir del campo (no solo al guardar), para avisar a tiempo.
  async function revisarDuplicados(): Promise<Duplicados> {
    const encontrados = await buscarDuplicados({ usuarioTiktok, telefono }, clienta?.id);
    setDuplicados(encontrados);
    return encontrados;
  }

  async function alEnviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const encontrados = await revisarDuplicados();
      if ((encontrados.tiktok || encontrados.telefono) && !confirmarDuplicado) {
        setConfirmarDuplicado(true); // segundo paso: "Guardar igual"
        return;
      }
      await onGuardar(datos());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la clienta.');
    } finally {
      setEnviando(false);
    }
  }

  const aviso = (que: string, quien?: Clienta) =>
    quien && (
      <p className="mt-1 text-sm text-amber-800">
        {que} ya es de <Link to={`/clientas/${quien.id}`} className="font-semibold underline underline-offset-2">{quien.nombre}</Link>
        {!quien.activa && ' (desactivada)'}.
      </p>
    );

  return (
    <form onSubmit={alEnviar} aria-label={clienta ? 'Editar clienta' : 'Nueva clienta'} className="space-y-3">
      <label className="block text-sm font-medium">
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus className={ENTRADA} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium" htmlFor={idTiktok}>
            Usuario de TikTok <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input
            id={idTiktok}
            value={usuarioTiktok}
            onChange={(e) => {
              setUsuarioTiktok(e.target.value);
              setConfirmarDuplicado(false); // otro dato: hay que volver a confirmar
            }}
            onBlur={() => void revisarDuplicados()}
            placeholder="@usuario"
            autoComplete="off"
            autoCapitalize="none"
            className={ENTRADA}
          />
          {aviso('Ese usuario de TikTok', duplicados.tiktok)}
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor={idTelefono}>
            Teléfono <span className="font-normal text-gray-500">(opcional)</span>
          </label>
          <input
            id={idTelefono}
            type="tel"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value);
              setConfirmarDuplicado(false); // otro dato: hay que volver a confirmar
            }}
            onBlur={() => void revisarDuplicados()}
            placeholder="+56 9 1234 5678"
            autoComplete="off"
            className={ENTRADA}
          />
          {aviso('Ese teléfono', duplicados.telefono)}
        </div>
      </div>

      <fieldset className="space-y-2 rounded-md border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">
          Dirección de despacho <span className="font-normal text-gray-500">(opcional)</span>
        </legend>
        <CamposDireccion direccion={direccion} onCambiar={setDireccion} />
      </fieldset>

      {confirmarDuplicado && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          Hay datos que ya tiene otra clienta. Revisa que no sea la misma persona; si no lo es, guarda igual.
        </p>
      )}
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
          {confirmarDuplicado ? 'Guardar igual' : 'Guardar'}
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
