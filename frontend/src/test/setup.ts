import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { reiniciarDatos } from '../services/mock/datos';
import { cerrarSesion, iniciarSesion } from '../services/usuariosService';

// Cada test parte con los mismos datos simulados y con la Admin conectada (RF-01).
beforeEach(async () => {
  reiniciarDatos();
  cerrarSesion();
  await iniciarSesion('admin@livesmanage.cl', 'admin123');
});

afterEach(() => {
  cleanup();
});
