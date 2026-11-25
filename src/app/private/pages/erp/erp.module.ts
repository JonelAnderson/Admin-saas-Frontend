import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { routes } from './erp-routing.module';

/** ERP: instancias de los clientes y sus licencias (consola de plataforma). */
@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class ErpModule {}
