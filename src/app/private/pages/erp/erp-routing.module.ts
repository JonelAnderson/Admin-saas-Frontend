import { Routes } from '@angular/router';
import { RoleGuard } from '@shared/guards/role.guard.service';
import { InstanceListComponent } from './components/instances/instance-list.component';
import { DeploymentListComponent } from './components/deployments/deployment-list.component';
import { ApiCredentialListComponent } from './components/api-credentials/api-credential-list.component';

/** ERP: las Urls coinciden con deploy/sql/menus-platform.sql del backend. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'instances' },
  { path: 'instances', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Instances.Menu'] }, component: InstanceListComponent },
  { path: 'deployments', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Deployments.Menu'] }, component: DeploymentListComponent },
  { path: 'api-credentials', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.ApiCredentialDeliveries.Menu'] }, component: ApiCredentialListComponent }
];
