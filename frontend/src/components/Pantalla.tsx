import type { ReactNode } from 'react';

interface PantallaProps {
  titulo: string;
  children?: ReactNode;
}

/** Contenedor común de pantalla. */
export function Pantalla({ titulo, children }: PantallaProps) {
  return (
    <section className="mx-auto max-w-3xl p-4 lg:max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900">{titulo}</h1>
      {children}
    </section>
  );
}
