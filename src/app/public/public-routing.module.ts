import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { SignInComponent } from './pages/login/sign-in/sign-in.component';
import { PasswordRecoveryComponent } from './pages/login/password-recovery/password-recovery.component';

const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'sign-in',
        pathMatch: 'full'
      },
      {
        path:'sign-in',
        component:SignInComponent
      } ,
      {
        path: 'forgot-password',
        component: PasswordRecoveryComponent,
        data: { mode: 'forgot' }
      },
      {
        // Enlace del correo (UserService.ForgotPasswordAsync): account/reset-password?Token=...
        path: 'account/reset-password',
        component: PasswordRecoveryComponent,
        data: { mode: 'reset' }
      },
      {
        path: '**',
        redirectTo: 'sign-in',
      }    
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }
