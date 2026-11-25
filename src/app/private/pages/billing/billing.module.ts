import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { routes } from './billing-routing.module';

/** Comercial: clientes, suscripciones, pagos y planes (consola de plataforma). */
@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)]
})
export class BillingModule {}
