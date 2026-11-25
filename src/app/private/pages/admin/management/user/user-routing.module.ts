import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserRolesUpdateComponent } from './components/user-roles-update/user-roles-update.component';

const routes: Routes = [
  {
    path: '',
    component: UserListComponent,
    
  },
  {
    path: 'user-role',
    component: UserRolesUpdateComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
