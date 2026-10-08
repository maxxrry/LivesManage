import { beforeEach, describe, expect, it } from 'vitest';
import { usuarios } from './mock/datos';
import { alternarPago, reabrirSesion } from './sesionesService';
import {
  cerrarSesion,
  ERROR_CREDENCIALES,
  iniciarSesion,
  tokenActual,
  usuarioActual,
  usuarioDeLaSesion,
} from './usuariosService';

describe('sesión de usuario (RF-01)', () => {
  beforeEach(() => cerrarSesion());

  it('con credenciales válidas guarda el token y el usuario', async () => {
    const usuario = await iniciarSesion(' Vendedora@LivesManage.cl ', 'vende123');

    expect(usuario.rol).toBe('VENDEDOR');
    expect(usuarioDeLaSesion()?.id).toBe('u-2');
    expect(tokenActual()).toBeTruthy();
    expect((await usuarioActual()).nombre).toBe('Vendedora');
  });

  it.each([
    ['contraseña incorrecta', 'admin@livesmanage.cl', 'otra'],
    ['correo que no existe', 'nadie@livesmanage.cl', 'admin123'],
    ['usuario desactivado', 'antigua@livesmanage.cl', 'antigua123'],
  ])('%s: mismo mensaje genérico y sin sesión', async (_caso, correo, contrasena) => {
    await expect(iniciarSesion(correo, contrasena)).rejects.toThrow(ERROR_CREDENCIALES);
    expect(usuarioDeLaSesion()).toBeNull();
    expect(tokenActual()).toBeUndefined();
  });

  it('cerrar sesión descarta el token', async () => {
    await iniciarSesion('admin@livesmanage.cl', 'admin123');
    cerrarSesion();

    expect(tokenActual()).toBeUndefined();
    await expect(usuarioActual()).rejects.toThrow();
  });

  it('usuarioActual devuelve los datos al día, no la copia guardada', async () => {
    await iniciarSesion('admin@livesmanage.cl', 'admin123');
    usuarios[0]!.nombre = 'Admin renombrada';
    try {
      expect((await usuarioActual()).nombre).toBe('Admin renombrada');
    } finally {
      usuarios[0]!.nombre = 'Administradora';
    }
  });

  it.each(['{no es json', '{"usuario":{}}', '{"token":"t"}'])('una sesión guardada dañada (%s) cuenta como sin sesión', (valor) => {
    localStorage.setItem('livesmanage.sesion', valor);
    expect(usuarioDeLaSesion()).toBeNull();
  });

  it('un usuario desactivado después de entrar pierde el acceso', async () => {
    await iniciarSesion('vendedora@livesmanage.cl', 'vende123');
    usuarios[1]!.activo = false;
    try {
      await expect(usuarioActual()).rejects.toThrow();
    } finally {
      usuarios[1]!.activo = true;
    }
  });

  it('los servicios usan el usuario conectado: el pago queda a su nombre y no puede reabrir', async () => {
    await iniciarSesion('vendedora@livesmanage.cl', 'vende123');

    expect((await alternarPago('s-2', 'l-4')).pagoActualizado?.usuarioId).toBe('u-2');
    await expect(reabrirSesion('s-1')).rejects.toThrow('Solo un administrador');
  });
});
