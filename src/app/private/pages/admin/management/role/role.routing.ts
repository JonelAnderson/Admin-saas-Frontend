import { RouterModule, Routes } from "@angular/router";
import { RoleListComponent } from "./components/role-list/role-list.component";
import { NgModule } from "@angular/core";
import { PermissionUpdateComponent } from "./components/permission-update/permission-update.component";

export const routes: Routes = [
    {
      path: '',
      component: RoleListComponent
    
    },
     {
      path:'update-permissions',
      component:PermissionUpdateComponent
    },
    {
      path:'update-role-menus',
      loadComponent: () => import('./components/role-menu-update/role-menu-update.component').then(m => m.RoleMenuUpdateComponent)
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class RoleRoutingModule { }

