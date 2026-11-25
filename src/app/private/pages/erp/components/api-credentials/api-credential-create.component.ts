import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { serverMessages } from '../../../billing/models/billing.models';
import { CustomerPicker } from '../../../billing/components/customer-picker';
import { IssuerResponse } from '../../../api-sunat/models/api-sunat.models';
import { ApiSunatIssuerService } from '../../../api-sunat/services/api-sunat.services';
import { InstanceResponse } from '../../models/erp.models';
import { InstanceService } from '../../services/erp.services';
import { ApiCredentialService } from '../../services/api-credential.services';

interface Option {
  id: number;
  label: string;
}

/**
 * Pide entregar al ERP de un cliente las credenciales de la API SUNAT de una de sus empresas. Regenerar las credenciales **invalida
 * las actuales**: quien las use (otro sistema, o el mismo ERP con las viejas) deja de poder emitir, por eso el operador debe
 * confirmarlo explícitamente. Las credenciales nunca se muestran aquí: viajan directo al ERP cuando las recoge.
 */
@Component({
  selector: 'app-api-credential-create',
  imports: [SharedModule, NgSelectModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-key"></em>Entregar credenciales al ERP</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="alert alert-warning small">
        La consola pide a la API SUNAT <strong>credenciales nuevas</strong> para la empresa elegida y las guarda cifradas hasta que el ERP del
        cliente las recoja (en unos minutos, con vigencia de 7 días). <strong>Las credenciales actuales de esa empresa dejan de funcionar
        en cuanto se regeneran.</strong> Nunca se muestran en la consola.
      </div>
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="cred-customer">Cliente <span class="erp-required">*</span></label>
            <ng-select labelForId="cred-customer" [items]="customers.items()" bindLabel="label" bindValue="id" formControlName="customerId"
              [typeahead]="customers.search$" [loading]="customers.loading()" placeholder="Escriba RUC o razón social" appendTo="body"
              [class.is-invalid]="invalid('customerId')" />
            @if (invalid('customerId')) {
            <div class="invalid-feedback d-block">Elija el cliente.</div>
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="cred-instance">Instancia del ERP <span class="erp-required">*</span></label>
            <ng-select labelForId="cred-instance" [items]="instanceOptions()" bindLabel="label" bindValue="id" formControlName="instanceId"
              [loading]="loading()" appendTo="body" [placeholder]="form.value.customerId ? 'Elija la instancia' : 'Elija primero el cliente'"
              [class.is-invalid]="invalid('instanceId')" />
            @if (invalid('instanceId')) {
            <div class="invalid-feedback d-block">Elija la instancia que las recibirá.</div>
            }
            @if (noInstances()) {
            <div class="text-warning small mt-1">Ese cliente no tiene instancias activas del ERP.</div>
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="cred-issuer">Empresa de la API SUNAT <span class="erp-required">*</span></label>
            <ng-select labelForId="cred-issuer" [items]="issuerOptions()" bindLabel="label" bindValue="id" formControlName="issuerId"
              [loading]="loading()" appendTo="body" [placeholder]="form.value.customerId ? 'Elija la empresa' : 'Elija primero el cliente'"
              [class.is-invalid]="invalid('issuerId')" />
            @if (invalid('issuerId')) {
            <div class="invalid-feedback d-block">Elija la empresa.</div>
            }
            @if (noIssuers()) {
            <div class="text-warning small mt-1">Ese cliente no tiene empresas vinculadas: vincúlelas primero en Emisores.</div>
            }
          </div>
          <div class="col-12">
            <div class="form-check">
              <input id="cred-confirm" type="checkbox" class="form-check-input" formControlName="confirm" [class.is-invalid]="invalid('confirm')" />
              <label class="form-check-label" for="cred-confirm">
                Entiendo que las credenciales actuales de esa empresa dejarán de funcionar
              </label>
            </div>
            @if (invalid('confirm')) {
            <div class="invalid-feedback d-block">Confirme para continuar.</div>
            }
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">Entregar al ERP</button>
    </div>
  `
})
export class ApiCredentialCreateComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  readonly customers = new CustomerPicker();
  readonly instanceOptions = signal<Option[]>([]);
  readonly issuerOptions = signal<Option[]>([]);
  readonly loading = signal(false);
  readonly noInstances = signal(false);
  readonly noIssuers = signal(false);
  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private credentials: ApiCredentialService, private instances: InstanceService,
    private issuers: ApiSunatIssuerService, private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null, Validators.required],
      instanceId: [null as number | null, Validators.required],
      issuerId: [null as number | null, Validators.required],
      confirm: [false, Validators.requiredTrue]
    });
    this.form.get('customerId')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => this.loadOptions(id));
  }

  ngOnInit(): void {
    this.customers.start();
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  /** Instancias activas y empresas vinculadas del cliente elegido. */
  private loadOptions(customerId: number | null): void {
    this.instanceOptions.set([]);
    this.issuerOptions.set([]);
    this.noInstances.set(false);
    this.noIssuers.set(false);
    this.form.patchValue({ instanceId: null, issuerId: null }, { emitEvent: false });
    if (!customerId) {
      return;
    }
    this.loading.set(true);
    this.instances.GetAll(50, 0, `&customerId=${customerId}`).subscribe({
      next: (resp) => {
        const list = ((Array.isArray(resp.data) ? resp.data : []) as InstanceResponse[]).filter((i) => i.isActive);
        this.instanceOptions.set(list.map((i) => ({ id: i.id, label: i.url ? `${i.name} · ${i.url}` : i.name })));
        this.noInstances.set(list.length === 0);
        if (list.length === 1) {
          this.form.patchValue({ instanceId: list[0].id }, { emitEvent: false });
        }
      },
      error: () => this.loading.set(false)
    });
    this.issuers.GetAll(50, 0, `&customerId=${customerId}`).subscribe({
      next: (resp) => {
        const list = (Array.isArray(resp.data) ? resp.data : []) as IssuerResponse[];
        this.issuerOptions.set(list.map((i) => ({ id: i.id, label: `${i.businessName} (${i.ruc})` })));
        this.noIssuers.set(list.length === 0);
        if (list.length === 1) {
          this.form.patchValue({ issuerId: list[0].id }, { emitEvent: false });
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.credentials.create({ instanceId: v.instanceId, issuerId: v.issuerId, confirmInvalidatePrevious: !!v.confirm }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Entrega registrada', serverMessages(resp, 'Entrega registrada.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo registrar la entrega.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo registrar la entrega.'), 'danger');
      }
    });
  }
}
