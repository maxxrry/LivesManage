import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ENTRADAS_MENU } from './menu';

/** Layout: cabecera fija; menú como panel en celular y fijo a la izquierda en computador (D-24). */
export function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();

  // Al cambiar de ruta, el panel se cierra.
  const [rutaAnterior, setRutaAnterior] = useState(pathname);
  if (pathname !== rutaAnterior) {
    setRutaAnterior(pathname);
    setMenuAbierto(false);
  }

  useEffect(() => {
    if (!menuAbierto) return;
    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPresionarTecla);
    return () => document.removeEventListener('keydown', alPresionarTecla);
  }, [menuAbierto]);

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-2 lg:px-5">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-marca-600 lg:hidden"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-bold text-marca-700">LivesManage</span>
      </header>

      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      {/* Celular: panel que abre ☰. Computador (lg): menú fijo a la izquierda, siempre visible (D-24). */}
      <nav
        id="menu-principal"
        aria-label="Menú principal"
        className={`${
          menuAbierto ? 'fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] shadow-xl' : 'hidden'
        } overflow-y-auto bg-white p-2 lg:fixed lg:top-14 lg:bottom-0 lg:left-0 lg:z-10 lg:block lg:w-60 lg:max-w-none lg:border-r lg:border-gray-200 lg:shadow-none`}
      >
        <ul className="flex flex-col gap-1">
          {ENTRADAS_MENU.map(({ ruta, texto }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                className={({ isActive }) =>
                  `flex min-h-11 items-center rounded-md px-3 text-base ${
                    isActive ? 'bg-marca-100 font-semibold text-marca-700' : 'hover:bg-gray-100'
                  }`
                }
              >
                {texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="pt-14 lg:pl-60">
        <Outlet />
      </main>
    </div>
  );
}
