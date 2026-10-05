import { describe, expect, it } from 'vitest';
import { diaChile, diasEntre, formatearDiaMes, formatearFechaHora, restarMeses } from './fechas';

describe('formatearFechaHora', () => {
  it('usa dd/mm/aaaa hh:mm', () => {
    expect(formatearFechaHora('2026-09-24T21:00:00-03:00')).toBe('24/09/2026 21:00');
  });

  it('convierte a la hora de Chile (America/Santiago)', () => {
    // 01:30 UTC del 2 de octubre = 22:30 del 1 de octubre en Chile (UTC-3 en horario de verano)
    expect(formatearFechaHora('2026-10-02T01:30:00Z')).toBe('01/10/2026 22:30');
    // En julio Chile está en UTC-4
    expect(formatearFechaHora('2026-07-15T12:00:00Z')).toBe('15/07/2026 08:00');
  });
});

describe('formatearDiaMes', () => {
  it('usa dd/mm en la hora de Chile', () => {
    expect(formatearDiaMes('2026-10-02T01:30:00Z')).toBe('01/10');
  });
});

describe('fechas de calendario en Chile (RF-14)', () => {
  it('diaChile usa la zona de Chile', () => {
    expect(diaChile('2026-09-30T22:00:00-03:00')).toBe('2026-09-30');
    expect(diaChile('2026-10-01T02:00:00Z')).toBe('2026-09-30');
  });

  it('diasEntre cuenta días de calendario', () => {
    expect(diasEntre('2026-09-24', '2026-11-24')).toBe(61);
    expect(diasEntre('2026-09-24', '2026-09-24')).toBe(0);
  });

  it('restarMeses ajusta el fin de mes', () => {
    expect(restarMeses('2026-10-04', 3)).toBe('2026-07-04');
    expect(restarMeses('2026-03-31', 1)).toBe('2026-02-28');
    expect(restarMeses('2026-01-15', 12)).toBe('2025-01-15');
  });
});
