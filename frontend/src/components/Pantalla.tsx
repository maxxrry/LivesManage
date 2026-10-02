import type { ReactNode } from 'react';

interface PantallaProps {
  titulo: string;
  /** Requisitos que implementarán esta pantalla (trazabilidad con el ERS). */
  requisitos?: string;
  children?: ReactNode;
}

/** Contenedor común de pantalla. Mientras no tenga contenido, indica qué RF la implementa. */
export function Pantalla({ titulo, requisitos, children }: PantallaProps) {
  return (
    <section className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold text-gray-900">{titulo}</h1>
      {children ?? (
        <p className="mt-2 text-sm text-gray-500">
          Pantalla pendiente{requisitos ? ` (${requisitos})` : ''}.
        </p>
      )}
    </section>
  );
}
