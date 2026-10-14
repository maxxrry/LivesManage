import { beforeEach, describe, expect, it } from 'vitest';
import { usuarios } from './mock/datos';
import { alternarPago, reabrirSesion } from './sesionesService';
import {
  cambiarActivoUsuario,
  cerrarSesion,
  crearUsuario,
  editarUsuario,
  ERROR_CREDENCIALES,
  listarUsuarios,
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
      expect(usuarioDeLaSesion()?.nombre).toBe('Admin renombrada'); // el menú lee la copia puesta al día
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

describe('gestión de usuarios (RF-03, datos simulados)', () => {
  // setup.ts deja conectada a la Admin (u-1).
  const nueva = { nombre: ' Nueva ', correo: ' Nueva@LivesManage.cl ', rol: 'VENDEDOR' as const, contrasena: 'inicial123' };

  it('lista los usuarios por nombre', async () => {
    expect((await listarUsuarios()).map((u) => u.nombre)).toEqual(['Administradora', 'Ex vendedora', 'Vendedora']);
  });

  it('la Admin crea una vendedora que luego inicia sesión', async () => {
    const creada = await crearUsuario(nueva);

    expect(creada).toMatchObject({ nombre: 'Nueva', correo: 'nueva@livesmanage.cl', rol: 'VENDEDOR', activo: true });
    cerrarSesion();
    expect((await iniciarSesion('nueva@livesmanage.cl', 'inicial123')).id).toBe(creada.id);
  });

  it('un correo repetido se rechaza', async () => {
    await expect(crearUsuario({ ...nueva, correo: 'VENDEDORA@livesmanage.cl' })).rejects.toThrow('Ya existe un usuario con ese correo.');
  });

  it('la contraseña inicial necesita al menos 8 caracteres', async () => {
    await expect(crearUsuario({ ...nueva, contrasena: 'corta' })).rejects.toThrow('al menos 8 caracteres');
  });

  it('editar cambia nombre, correo y rol, sin chocar con su propio correo', async () => {
    const editada = await editarUsuario('u-2', { nombre: 'Vende', correo: 'vendedora@livesmanage.cl', rol: 'ADMIN' });

    expect(editada).toMatchObject({ nombre: 'Vende', rol: 'ADMIN' });
    await expect(editarUsuario('u-2', { nombre: 'Vende', correo: 'admin@livesmanage.cl', rol: 'ADMIN' })).rejects.toThrow(
      'Ya existe un usuario con ese correo.',
    );
  });

  it('al cambiar el correo, la contraseña sigue sirviendo con el correo nuevo', async () => {
    await editarUsuario('u-2', { nombre: 'Vendedora', correo: 'vende@livesmanage.cl', rol: 'VENDEDOR' });
    cerrarSesion();

    expect((await iniciarSesion('vende@livesmanage.cl', 'vende123')).id).toBe('u-2');
  });

  it('la Admin no se cambia el rol ni se desactiva a sí misma', async () => {
    await expect(editarUsuario('u-1', { nombre: 'Admin', correo: 'admin@livesmanage.cl', rol: 'VENDEDOR' })).rejects.toThrow(
      'No puedes cambiar tu propio rol.',
    );
    await expect(cambiarActivoUsuario('u-1', false)).rejects.toThrow('No puedes desactivar tu propia cuenta.');
  });

  it('un usuario desactivado no entra; reactivado, sí', async () => {
    expect((await cambiarActivoUsuario('u-2', false)).activo).toBe(false);
    await expect(iniciarSesion('vendedora@livesmanage.cl', 'vende123')).rejects.toThrow(ERROR_CREDENCIALES);

    await cambiarActivoUsuario('u-2', true);
    expect((await iniciarSesion('vendedora@livesmanage.cl', 'vende123')).id).toBe('u-2');
  });

  it('una Vendedora no puede gestionar usuarios (RF-02)', async () => {
    await iniciarSesion('vendedora@livesmanage.cl', 'vende123');

    await expect(listarUsuarios()).rejects.toThrow('No tienes permiso para hacer esto.');
    await expect(crearUsuario(nueva)).rejects.toThrow('No tienes permiso para hacer esto.');
  });
});
