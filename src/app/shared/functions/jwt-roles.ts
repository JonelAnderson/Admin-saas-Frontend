import * as jwt_decode from 'jwt-decode';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/** Roles del JWT guardado (localStorage 'token', guardado con JSON.stringify). Lista vacía si no hay token o no se puede leer. */
export function currentUserRoles(): string[] {
  try {
    const stored = localStorage.getItem('token');
    if (!stored) {
      return [];
    }
    let token = stored;
    try {
      const parsed = JSON.parse(stored);
      token = typeof parsed === 'string' ? parsed : stored;
    } catch {
      token = stored;
    }
    const decoded: Record<string, unknown> = jwt_decode.jwtDecode(token);
    const roles = decoded[ROLE_CLAIM] ?? decoded['role'];
    if (Array.isArray(roles)) {
      return roles.map(String);
    }
    return roles ? [String(roles)] : [];
  } catch {
    return [];
  }
}

/**
 * Igual que CurrentUserService.IsPlatformAdmin del backend: rol SuperAdmin (o el antiguo PlatformAdmin).
 * Administrator es el administrador de una empresa y no lo es. Solo sirve para mostrar u ocultar opciones; el servidor
 * vuelve a validar.
 */
export function isPlatformAdmin(): boolean {
  const roles = currentUserRoles();
  return roles.includes('SuperAdmin') || roles.includes('PlatformAdmin');
}
