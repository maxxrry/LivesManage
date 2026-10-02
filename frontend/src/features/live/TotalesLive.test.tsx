import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TotalesLive } from './TotalesLive';

describe('TotalesLive (RF-08)', () => {
  it('muestra total del live, pagado, pendiente y número de clientas', () => {
    render(<TotalesLive totales={{ total: 58000, pagado: 13000, pendiente: 45000, clientas: 5 }} />);

    expect(screen.getByTestId('total-live')).toHaveTextContent('$58.000');
    expect(screen.getByTestId('total-pagado')).toHaveTextContent('$13.000');
    expect(screen.getByTestId('total-pendiente')).toHaveTextContent('$45.000');
    expect(screen.getByTestId('total-clientas')).toHaveTextContent('5');
  });

  it('cada valor tiene su etiqueta (lista de definiciones accesible)', () => {
    render(<TotalesLive totales={{ total: 0, pagado: 0, pendiente: 0, clientas: 0 }} />);

    for (const etiqueta of ['Total del live', 'Pagado', 'Pendiente', 'Clientas']) {
      expect(screen.getByText(etiqueta).tagName).toBe('DT');
    }
  });
});
