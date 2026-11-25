import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../shared/guards/role.guard.service';
import { NotFoundComponent } from '@shared/components/reusables/not-found/not-found.component';
import { PrivateLayoutComponent } from './layout/private-layout.component';
import { Home } from './pages/home/components/home/home';
import { Support } from './pages/support/components/support/support';

const routes: Routes = [
  {
    path: '',
    component: PrivateLayoutComponent,
    children: [
      // ========================================
      // RUTA POR DEFECTO
      // ========================================
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        canActivate: [RoleGuard],
        data: { requiredPermission: null },
        component: Home
      },
      {
        path: 'help',
        canActivate: [RoleGuard],
        data: { requiredPermission: null },
        component: Support
      },

      // ========================================
      // RUTAS DE ADMINISTRADOR
      // ========================================
      {
        path: 'admin',
        loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule),
      },
      {
        path: 'billing',
        loadChildren: () => import('./pages/billing/billing.module').then(m => m.BillingModule)
      },
      {
        path: 'erp',
        loadChildren: () => import('./pages/erp/erp.module').then(m => m.ErpModule)
      },
      {
        path: 'api-sunat',
        loadChildren: () => import('./pages/api-sunat/api-sunat.module').then(m => m.ApiSunatModule)
      },
     /*  {
        path: 'gestion',
        loadChildren: () => import('./pages/gestion/gestion.module').then(m => m.GestionModule),
      },
      {
        path: 'logistica',
        loadChildren: () => import('./pages/logistica/logistica.module').then(m => m.LogisticaModule),
      }, */

      // ========================================
      // RUTAS DE CLIENTES
      // ========================================
     /*  {
        path: 'clients',
        canActivate: [RoleGuard],
        data: { expectedRoles: [Role.Client, Role.Admin] },
        loadChildren: () => import('./pages/clients/clients.module').then(m => m.ClientsModule),
      }, */

      // ========================================
      // RUTAS COMPARTIDAS (Admin y Cliente)
      // ========================================
      // {
      //   path: 'profile',
      //   canActivate: [RoleGuard],
      //   data: { expectedRoles: [Role.Admin, Role.Client] },
      //   loadChildren: () => import('./pages/shared/profile/profile.module').then(m => m.ProfileModule),
      // },

      // ========================================
      // 404 - NOT FOUND
      // ========================================
      {
        path: '**',
        component: NotFoundComponent,
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PrivateRoutingModule { }
