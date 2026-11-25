import { NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '@shared/guards/role.guard.service';
import { isPlatformAdmin } from '@shared/functions/jwt-roles';
import { AuditTrailListComponent } from './audit-trail-list.component';

/**
 * /private/admin/audit-trails: solo SuperAdmin. El permiso de auditoría no basta (el Administrador de una empresa lo
 * recibe al crearse su rol); la API vuelve a exigir SuperAdmin.
 */
const routes: Routes = [
  {
    path: '',
    canActivate: [RoleGuard, () => isPlatformAdmin() || inject(Router).createUrlTree(['/private/home'])],
    data: { requiredPermission: ['Permissions.AuditTrails.Menu', 'Permissions.AuditTrails.View'] },
    component: AuditTrailListComponent
  }
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes), AuditTrailListComponent]
})
export class AuditTrailsModule {}
