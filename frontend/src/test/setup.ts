import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { reiniciarDatos } from '../services/mock/datos';

// Cada test parte con los mismos datos simulados.
beforeEach(() => {
  reiniciarDatos();
});

afterEach(() => {
  cleanup();
});
