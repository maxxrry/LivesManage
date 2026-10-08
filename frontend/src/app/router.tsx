import { Navigate, type RouteObject } from 'react-router';
import { Layout } from '../components/Layout';
import { Pantalla } from '../components/Pantalla';
import { LoginPage } from '../features/auth/LoginPage';
import { CierrePage } from '../features/cierre/CierrePage';
import { ClientasPage } from '../features/clientas/ClientasPage';
import { FichaClientaPage } from '../features/clientas/FichaClientaPage';
import { EstadisticasPage } from '../features/estadisticas/EstadisticasPage';
import { ImportarPage } from '../features/importar/ImportarPage';
import { LivePage } from '../features/live/LivePage';
import { LivesPage } from '../features/lives/LivesPage';
import { UsuariosPage } from '../features/usuarios/UsuariosPage';

/** Pantallas de ERS 3.1.1. */
export const rutas: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/lives" replace /> },
      { path: 'lives', element: <LivesPage /> },
      { path: 'lives/:id', element: <LivePage /> },
      { path: 'lives/:id/cierre', element: <CierrePage /> },
      { path: 'clientas', element: <ClientasPage /> },
      { path: 'clientas/:id', element: <FichaClientaPage /> },
      { path: 'estadisticas', element: <EstadisticasPage /> },
      { path: 'ranking', element: <Navigate to="/estadisticas" replace /> }, // enlaces guardados de antes de D-32
      { path: 'importar', element: <ImportarPage /> },
      { path: 'usuarios', element: <UsuariosPage /> },
      { path: '*', element: <Pantalla titulo="Página no encontrada">{null}</Pantalla> },
    ],
  },
];
