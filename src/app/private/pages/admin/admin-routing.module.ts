import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RoleGuard } from '@shared/guards/role.guard.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'users',
    pathMatch: 'full'
  },
  
  {
    path: 'users',
    canActivate: [RoleGuard],
    data: { requiredPermission: ['Permissions.Users.Menu'] },
    loadChildren: () => import('./management/user/user.module').then(m => m.UserModule)
  },
  {
    path: 'roles',
    canActivate: [RoleGuard],
    data: { requiredPermission: ['Permissions.Roles.Menu'] },
    loadChildren: () => import('./management/role/role.module').then(m => m.RoleModule)
  },
  {
    path: 'menus',
    canActivate: [RoleGuard],
    data: { requiredPermission: ['Permissions.Menus.Menu'] },
    loadChildren: () => import('./menus/menu.module').then(m => m.MenuModule)
  },
  {
    path: 'audit-trails',
    canActivate: [RoleGuard],
    data: { requiredPermission: ['Permissions.AuditTrails.Menu', 'Permissions.AuditTrails.View'] },
    loadChildren: () => import('./audit-trails/audit-trails.module').then(m => m.AuditTrailsModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }

