package cl.livesmanage.auth.dto;

/** Respuesta 200 de POST /api/auth/login (D-31). El frontend la guarda tal cual. */
public record LoginResponse(String token, UsuarioDto usuario) {}
