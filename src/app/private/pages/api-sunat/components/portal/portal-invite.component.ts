import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { serverMessages } from '../../../billing/models/billing.models';
import { CustomerPicker } from '../../../billing/components/customer-picker';
import { IssuerResponse, PortalAccessResponse } from '../../models/api-sunat.models';
import { ApiSunatIssuerService, PortalAccessService } from '../../services/api-sunat.services';

interface IssuerOption {
  id: number;
  label: string;
}

/**
 * Invita a una persona de un cliente al portal de la API SUNAT, o la reinvita (mismo correo): elige las empresas del cliente a las
 * que entra y, si perdió su teléfono, marca "restablecer MFA". La consola no envía el enlace en el momento: guarda la invitación y
 * en unos minutos le llega al invitado un correo con el enlace de activación (vale 72 horas y sirve una sola vez).
 */
@Component({
  selector: 'app-portal-invite',
  imports: [SharedModule, NgSelectModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title">
        <em class="feather icon-user-plus"></em>{{ reinvite ? 'Reinvitar al portal' : 'Invitar al portal de clientes' }}
      </h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (reinvite) {
      <div class="alert alert-info small">
        Se le enviará otro enlace de activación a <strong>{{ reinvite.email }}</strong>. Si entra con su contraseña de siempre no hace falta
        reinvitarla; reinvite para darle otras empresas, volver a habilitarla o si perdió su contraseña o su teléfono.
      </div>
      }
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="inv-customer">Cliente <span class="erp-required">*</span></label>
            <ng-select labelForId="inv-customer" [items]="customers.items()" bindLabel="label" bindValue="id" formControlName="customerId"
              [typeahead]="customers.search$" [loading]="customers.loading()" placeholder="Escriba RUC o razón social" appendTo="body"
              [class.is-invalid]="invalid('customerId')" />
            @if (invalid('customerId')) {
            <div class="invalid-feedback d-block">Elija el cliente.</div>
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="inv-email">Correo <span class="erp-required">*</span></label>
            <input id="inv-email" type="email" class="form-control" maxlength="200" formControlName="email" autocomplete="off"
              [class.is-invalid]="invalid('email')" />
            @if (invalid('email')) {
            <div class="invalid-feedback">Escriba un correo válido.</div>
            } @else {
            <div class="form-text">Es su usuario en el portal; un correo pertenece a un solo cliente.</div>
            }
          </div>
          <div class="col-md-6">
            <label class="form-label" for="inv-name">Nombre <span class="erp-required">*</span></label>
            <input id="inv-name" type="text" class="form-control" maxlength="120" formControlName="name" autocomplete="off"
              [class.is-invalid]="invalid('name')" />
            @if (invalid('name')) {
            <div class="invalid-feedback">Escriba el nombre de la persona.</div>
            }
          </div>
          <div class="col-12">
            <label class="form-label" for="inv-issuers">Empresas a las que entra <span class="erp-required">*</span></label>
            <ng-select labelForId="inv-issuers" [items]="issuerOptions()" bindLabel="label" bindValue="id" formControlName="issuerIds"
              [multiple]="true" [closeOnSelect]="false" [loading]="loadingIssuers()" appendTo="body"
              [placeholder]="form.value.customerId ? 'Elija una o más empresas' : 'Elija primero el cliente'"
              [class.is-invalid]="invalid('issuerIds')" />
            @if (invalid('issuerIds')) {
            <div class="invalid-feedback d-block">Elija al menos una empresa.</div>
            }
            @if (noIssuers()) {
            <div class="text-warning small mt-1">Ese cliente no tiene empresas vinculadas: vincúlelas primero en Emisores.</div>
            }
          </div>
          <div class="col-12">
            <div class="form-check">
              <input id="inv-mfa" type="checkbox" class="form-check-input" formControlName="resetMfa" />
              <label class="form-check-label" for="inv-mfa">Restablecer también su verificación en dos pasos (MFA)</label>
            </div>
            <div class="form-text">Márquelo solo si perdió su teléfono: tendrá que configurar el MFA de nuevo al activar.</div>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
        {{ reinvite ? 'Reinvitar' : 'Invitar' }}
      </button>
    </div>
  `
})
export class PortalInviteComponent implements OnInit {
  /** Reinvitar: el cliente y el correo ya están definidos y no se cambian. */
  @Input() reinvite: PortalAccessResponse | null = null;
  /** Cliente ya elegido (cuando la lista está filtrada por cliente). */
  @Input() presetCustomer: { id: number; name: string } | null = null;

  private destroyRef = inject(DestroyRef);
  readonly customers = new CustomerPicker();
  readonly issuerOptions = signal<IssuerOption[]>([]);
  readonly loadingIssuers = signal(false);
  readonly noIssuers = signal(false);
  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private portal: PortalAccessService, private issuers: ApiSunatIssuerService,
    private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null, Validators.required],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      name: ['', [Validators.required, Validators.maxLength(120)]],
      issuerIds: [[] as number[], Validators.required],
      resetMfa: [false]
    });
    this.form.get('customerId')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((id) => this.loadIssuers(id, []));
  }

  ngOnInit(): void {
    const r = this.reinvite;
    if (r) {
      this.customers.start({ id: r.customerId, ruc: r.customerRuc, businessName: r.customerName, label: `${r.customerRuc} · ${r.customerName}` });
      this.form.patchValue({ email: r.email, name: r.name }, { emitEvent: false });
      this.form.get('email')!.disable();
      this.form.get('customerId')!.disable({ emitEvent: false });
      this.form.get('customerId')!.setValue(r.customerId, { emitEvent: false });
      this.loadIssuers(r.customerId, r.issuers.map((i) => i.id));
    } else if (this.presetCustomer) {
      this.customers.start({ id: this.presetCustomer.id, ruc: '', businessName: this.presetCustomer.name, label: this.presetCustomer.name });
      this.form.patchValue({ customerId: this.presetCustomer.id });
    } else {
      this.customers.start();
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  /** Empresas emisoras vinculadas al cliente (las que se pueden dar de acceso). */
  private loadIssuers(customerId: number | null, selected: number[]): void {
    this.issuerOptions.set([]);
    this.noIssuers.set(false);
    this.form.patchValue({ issuerIds: selected }, { emitEvent: false });
    if (!customerId) {
      return;
    }
    this.loadingIssuers.set(true);
    this.issuers.GetAll(50, 0, `&customerId=${customerId}`).subscribe({
      next: (resp) => {
        const list = (Array.isArray(resp.data) ? resp.data : []) as IssuerResponse[];
        this.issuerOptions.set(list.map((i) => ({ id: i.id, label: `${i.businessName} (${i.ruc})` })));
        this.noIssuers.set(list.length === 0);
        this.loadingIssuers.set(false);
      },
      error: () => this.loadingIssuers.set(false)
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
    this.portal.invite({
      customerId: v.customerId, email: (v.email ?? '').trim(), name: (v.name ?? '').trim(), issuerIds: v.issuerIds, resetMfa: !!v.resetMfa
    }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Invitación registrada', serverMessages(resp, 'Invitación registrada.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo registrar la invitación.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo registrar la invitación.'), 'danger');
      }
    });
  }
}
