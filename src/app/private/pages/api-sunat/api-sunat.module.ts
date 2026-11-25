import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { routes } from './api-sunat-routing.module';

/** API SUNAT: empresas emisoras vinculadas a clientes y bandeja de acciones remotas (consola de plataforma). */
@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class ApiSunatModule {}
