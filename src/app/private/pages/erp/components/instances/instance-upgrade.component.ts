import { Component, Input, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { serverMessages } from '../../../billing/models/billing.models';
import { InstanceResponse } from '../../models/erp.models';
import { versionValidator } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.services';

/** Lleva el stack de una instancia montada por la consola a otra versión de las imágenes (corre en segundo plano). */
@Component({
  selector: 'app-instance-upgrade',
  imports: [SharedModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-arrow-up-circle"></em>Actualizar versión</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="mb-3">Instancia <strong>{{ instance?.name }}</strong> de <strong>{{ instance?.customerName }}</strong>. Versión desplegada: <code>{{ instance?.deployedVersion }}</code>.</p>
      <form [formGroup]="form" class="erp-form" novalidate>
        <label class="form-label" for="upg-ver">Versión nueva <span class="erp-required">*</span></label>
        <input id="upg-ver" class="form-control" maxlength="40" formControlName="version" placeholder="1.1.0" autocomplete="off" [class.is-invalid]="invalid()" />
        @if (invalid()) {
        <div class="invalid-feedback d-block">Etiqueta de las imágenes (p. ej. 1.4.0): letras, números, punto, guion y guion bajo. No se acepta "latest".</div>
        }
      </form>
      <div class="alert alert-warning mt-3 mb-0 small">
        Coolify descarga las imágenes y reinicia el stack: el ERP del cliente tendrá un corte breve y aplicará sus migraciones al arrancar.
        Siga el avance en <em>Despliegues</em>.
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">Actualizar</button>
    </div>
  `
})
export class InstanceUpgradeComponent {
  @Input() instance: InstanceResponse | null = null;

  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private deployments: DeploymentService, private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({ version: ['', [Validators.required, Validators.maxLength(40), versionValidator]] });
  }

  invalid(): boolean {
    const c = this.form.get('version');
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid || !this.instance) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.deployments.upgrade({ instanceId: this.instance.id, version: String(this.form.getRawValue().version).trim() }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (!resp.succeeded) {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo pedir la actualización.'), 'warning');
          return;
        }
        this.activeModal.close(true);
        await this.alerts.showNotification('Actualización en cola', 'Se ejecuta en segundo plano: siga su avance en Despliegues.', 'success');
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo pedir la actualización.'), 'danger');
      }
    });
  }
}
