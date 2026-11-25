import { Injectable } from '@angular/core';
import { forkJoin, from, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PermissionService } from '@shared/service/permission.service';
import { MenuService } from 'src/app/private/pages/admin/menus/services/menu.service';
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';

/** Loads role permissions, user navigation and profile (all in memory) after login or on private app refresh. */
@Injectable({ providedIn: 'root' })
export class SessionBootstrapService {
  constructor(
    private permissionService: PermissionService,
    private menuService: MenuService,
    private profile: CurrentUserProfileService
  ) {}

  bootstrap(): Observable<boolean> {
    // La consola no es multiempresa: no hay contexto de empresa / sucursal que resolver antes.
    return forkJoin({
      permissions: from(this.permissionService.loadPermissions()).pipe(catchError(() => of(false))),
      menu: this.menuService.loadUserNavigation().pipe(catchError(() => of([]))),
      // Nombre y foto para la barra superior (el JWT ya no los lleva).
      profile: this.profile.load()
    }).pipe(map(() => true));
  }

  hasStoredSession(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!localStorage.getItem('token');
  }
}
