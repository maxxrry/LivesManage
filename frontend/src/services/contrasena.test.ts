import { describe, expect, it } from 'vitest';
import { contrasenas, usuarios } from './mock/datos';
import { cambiarMiContrasena, restablecerContrasena } from './usuariosService';

// Vitest parte con la Admin (u-1) conectada; la vendedora es u-2.
describe('cambiarMiContrasena (D-49)', () => {
  it('cambia la propia si la actual es correcta', async () => {
    await expect(cambiarMiContrasena('mala', 'nueva-clave-1')).rejects.toThrow('La contraseña actual no es correcta.');
    await expect(cambiarMiContrasena('admin123', 'corta')).rejects.toThrow('al menos 8');
    await cambiarMiContrasena('admin123', 'nueva-clave-1');
    expect(contrasenas['admin@livesmanage.cl']).toBe('nueva-clave-1');
  });
});

describe('restablecerContrasena (D-49)', () => {
  it('la Admin restablece la de otro usuario, pero no la propia', async () => {
    await restablecerContrasena('u-2', 'restablecida1');
    expect(contrasenas['vendedora@livesmanage.cl']).toBe('restablecida1');
    await expect(restablecerContrasena('u-1', 'otra-clave-1')).rejects.toThrow('Cambiar mi contraseña');
  });

  it('la vendedora no puede restablecer contraseñas', async () => {
    usuarios[0]!.rol = 'VENDEDOR';
    try {
      await expect(restablecerContrasena('u-2', 'restablecida1')).rejects.toThrow('No tienes permiso');
    } finally {
      usuarios[0]!.rol = 'ADMIN';
    }
  });
});
