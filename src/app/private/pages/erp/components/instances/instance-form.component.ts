import { Component, Input, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomerLookup, serverMessages } from '../../../billing/models/billing.models';
import { CustomerPicker } from '../../../billing/components/customer-picker';
import { MODAL_OPTIONS } from '../../../billing/components/list-helpers';
import { InstanceKeyResponse, InstanceResponse } from '../../models/erp.models';
import { InstanceService } from '../../services/erp.services';
import { InstanceKeyComponent } from './instance-key.component';

/** Vacía o dirección http(s) absoluta (igual que el validador del servidor). */
function httpUrl(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return !value || /^https?:\/\/\S+$/i.test(value) ? null : { url: true };
}

/** Alta y edición de una instancia del ERP. Al crearla muestra la clave de licencia una sola vez. */
@Component({
  selector: 'app-instance-form',
  imports: [SharedModule, NgSelectModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-hard-drive"></em>{{ instance ? 'Editar instancia' : 'Nueva instancia del ERP' }}</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="ins-customer">Cliente <span class="erp-required">*</span></label>
            @if (instance) {
            <input id="ins-customer" class="form-control" readonly [value]="instance.customerText" />
            } @else {
            <ng-select labelForId="ins-customer" [items]="customers.items()" bindLabel="label" bindValue="id" formControlName="customerId"
              [typeahead]="customers.search$" [loading]="customers.loading()" placeholder="Escriba RUC o razón social" appendTo="body"
              [class.is-invalid]="invalid('customerId')" />
            @if (invalid('customerId')) {
            <div class="invalid-feedback d-block">Elija el cliente.</div>
            }
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="ins-name">Nombre <span class="erp-required">*</span></label>
            <input id="ins-name" class="form-control" maxlength="120" formControlName="name" placeholder="Producción" [class.is-invalid]="invalid('name')" />
            @if (invalid('name')) {
            <div class="invalid-feedback d-block">Escriba un nombre (máx. 120).</div>
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="ins-server">Servidor</label>
            <input id="ins-server" class="form-control" maxlength="120" formControlName="server" placeholder="vps-1" />
          </div>
          <div class="col-12">
            <label class="form-label" for="ins-url">Dirección</label>
            <input id="ins-url" class="form-control" maxlength="300" formControlName="url" placeholder="https://cliente.erp.pe" [class.is-invalid]="invalid('url')" />
            @if (invalid('url')) {
            <div class="invalid-feedback d-block">Debe empezar con http:// o https://.</div>
            }
          </div>
          <div class="col-12">
            <label class="form-label" for="ins-notes">Notas</label>
            <textarea id="ins-notes" class="form-control" rows="2" maxlength="1000" formControlName="notes"></textarea>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ instance ? 'Guardar' : 'Crear y ver clave' }}</button>
    </div>
  `
})
export class InstanceFormComponent implements OnInit {
  /** Instancia a editar; vacía para crear. */
  @Input() instance: InstanceResponse | null = null;
  /** Cliente ya elegido (cuando se llega desde la lista filtrada por cliente). */
  @Input() presetCustomer: CustomerLookup | null = null;

  readonly customers = new CustomerPicker();
  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private instances: InstanceService, private alerts: AlertModalService,
    private modal: NgbModal, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null, Validators.required],
      name: ['', [Validators.required, Validators.maxLength(120)]],
      server: ['', Validators.maxLength(120)],
      url: ['', [Validators.maxLength(300), httpUrl]],
      notes: ['', Validators.maxLength(1000)]
    });
  }

  ngOnInit(): void {
    if (this.instance) {
      this.form.get('customerId')?.clearValidators();
      this.form.get('customerId')?.updateValueAndValidity();
      this.form.patchValue({ name: this.instance.name, server: this.instance.server ?? '', url: this.instance.url ?? '', notes: this.instance.notes ?? '' });
    } else if (this.presetCustomer) {
      this.customers.start({ ...this.presetCustomer, label: `${this.presetCustomer.ruc} · ${this.presetCustomer.businessName}` });
      this.form.patchValue({ customerId: this.presetCustomer.id });
    } else {
      this.customers.start();
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { customerId: v.customerId, name: String(v.name).trim(), server: (v.server ?? '').trim() || null, url: (v.url ?? '').trim() || null, notes: (v.notes ?? '').trim() || null };
    this.saving.set(true);
    const call = this.instance ? this.instances.update(this.instance.id, body) : this.instances.create(body);
    call.subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (!resp.succeeded) {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo guardar la instancia.'), 'warning');
          return;
        }
        this.activeModal.close(true);
        if (this.instance) {
          await this.alerts.showNotification('Instancia actualizada', serverMessages(resp, 'Instancia actualizada.'), 'success');
        } else {
          InstanceFormComponent.showKey(this.modal, resp.data as InstanceKeyResponse, body.name);
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo guardar la instancia.'), 'danger');
      }
    });
  }

  /** Abre el modal de la clave (una sola vez) para una instancia recién creada o con la clave rotada. */
  static showKey(modal: NgbModal, key: InstanceKeyResponse, instanceName: string): void {
    const ref = modal.open(InstanceKeyComponent, MODAL_OPTIONS);
    ref.componentInstance.licenseKey = key.licenseKey;
    ref.componentInstance.instanceName = instanceName;
  }
}
