import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { ENTRADAS_MENU } from './menu';

/** Layout mobile-first: cabecera fija con botón de menú y panel lateral. */
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
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-2 bg-marca-600 px-2 text-white shadow">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-md hover:bg-marca-700 focus-visible:outline-2 focus-visible:outline-white"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-semibold">LivesManage</span>
      </header>

      {menuAbierto && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" aria-hidden="true" onClick={() => setMenuAbierto(false)} />
          <nav
            id="menu-principal"
            aria-label="Menú principal"
            className="fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] overflow-y-auto bg-white p-2 shadow-xl"
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
        </>
      )}

      <main className="pt-14">
        <Outlet />
      </main>
    </div>
  );
}
