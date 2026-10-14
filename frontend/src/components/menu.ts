/** Entradas del menú principal. Las `soloAdmin` no se muestran a la Vendedora (RF-02, ERS 3.1.1). */
export const ENTRADAS_MENU: readonly { ruta: string; texto: string; soloAdmin?: boolean }[] = [
  { ruta: '/lives', texto: 'Lives' },
  { ruta: '/clientas', texto: 'Clientas' },
  { ruta: '/estadisticas', texto: 'Estadísticas' },
  { ruta: '/importar', texto: 'Importar cuaderno' },
  { ruta: '/usuarios', texto: 'Usuarios', soloAdmin: true },
];
