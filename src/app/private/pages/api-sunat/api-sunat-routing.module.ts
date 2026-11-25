import { Routes } from '@angular/router';
import { RoleGuard } from '@shared/guards/role.guard.service';
import { IssuerListComponent } from './components/issuers/issuer-list.component';
import { PortalListComponent } from './components/portal/portal-list.component';
import { RemoteActionListComponent } from './components/remote-actions/remote-action-list.component';

/** API SUNAT: las Urls coinciden con deploy/sql/menus-platform.sql del backend. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'issuers' },
  { path: 'issuers', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.ApiSunatIssuers.Menu'] }, component: IssuerListComponent },
  { path: 'remote-actions', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.RemoteActions.Menu'] }, component: RemoteActionListComponent },
  { path: 'portal', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.PortalAccess.Menu'] }, component: PortalListComponent }
];
