import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomerLookup, serverMessages } from '../../../billing/models/billing.models';
import { CustomerPicker } from '../../../billing/components/customer-picker';
import { ApiTenant } from '../../models/api-sunat.models';
import { ApiSunatIssuerService } from '../../services/api-sunat.services';

/**
 * Vincula una empresa de la API SUNAT a un cliente. La empresa se busca en la API (por RUC o razón social) y sus datos se
 * leen de ahí, no se escriben: así el RUC y la razón social siempre coinciden con los de la API.
 */
@Component({
  selector: 'app-issuer-link',
  imports: [SharedModule, NgSelectModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-link"></em>Vincular empresa de la API SUNAT</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="link-customer">Cliente <span class="erp-required">*</span></label>
            <ng-select labelForId="link-customer" [items]="customers.items()" bindLabel="label" bindValue="id" formControlName="customerId"
              [typeahead]="customers.search$" [loading]="customers.loading()" placeholder="Escriba RUC o razón social" appendTo="body"
              [class.is-invalid]="invalid('customerId')" />
            @if (invalid('customerId')) {
            <div class="invalid-feedback d-block">Elija el cliente.</div>
            }
          </div>
          <div class="col-12">
            <label class="form-label" for="link-tenant">Empresa en la API SUNAT <span class="erp-required">*</span></label>
            <ng-select labelForId="link-tenant" [items]="tenants()" bindLabel="label" bindValue="id" formControlName="tenantId"
              [typeahead]="tenantSearch$" [loading]="loadingTenants()" placeholder="Escriba RUC o razón social" appendTo="body"
              [class.is-invalid]="invalid('tenantId')" (change)="selected.set($event ?? null)">
              <ng-template ng-option-tmp let-item="item">
                <span [class.text-muted]="item.linked">{{ item.label }}</span>
                @if (item.linked) {
                <span class="badge badge-light-secondary ms-2">ya vinculada</span>
                }
              </ng-template>
            </ng-select>
            @if (invalid('tenantId')) {
            <div class="invalid-feedback d-block">Elija la empresa.</div>
            }
            @if (tenantError()) {
            <div class="text-danger small mt-1">{{ tenantError() }}</div>
            }
          </div>
          @if (selected(); as t) {
          <div class="col-12">
            <div class="border rounded p-3 bg-light small">
              <div><strong>{{ t.businessName }}</strong> · RUC {{ t.ruc }}</div>
              <div class="text-muted">
                Ambiente {{ t.environment || '—' }} · Plan {{ t.plan || '—' }} · Uso del mes {{ t.documentsThisMonth }} / {{ t.maxDocumentsMonth }}
              </div>
              @if (t.billingSuspended) {
              <div class="text-warning mt-1">Ya está suspendida por falta de pago en la API.</div>
              }
              @if (!t.isActive) {
              <div class="text-danger mt-1">Está suspendida a mano en el panel de la API: la consola no la reactiva.</div>
              }
              @if (t.linked) {
              <div class="text-danger mt-1">Ya está vinculada a un cliente.</div>
              }
            </div>
          </div>
          }
          <div class="col-12">
            <label class="form-label" for="link-notes">Notas</label>
            <textarea id="link-notes" class="form-control" rows="2" maxlength="1000" formControlName="notes"></textarea>
          </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">Vincular</button>
    </div>
  `
})
export class IssuerLinkComponent implements OnInit {
  /** Cliente ya elegido (cuando se llega desde la lista filtrada por cliente). */
  @Input() presetCustomer: CustomerLookup | null = null;

  private destroyRef = inject(DestroyRef);
  readonly customers = new CustomerPicker();
  readonly tenantSearch$ = new Subject<string>();
  readonly tenants = signal<ApiTenant[]>([]);
  readonly loadingTenants = signal(false);
  readonly tenantError = signal('');
  readonly selected = signal<ApiTenant | null>(null);
  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private issuers: ApiSunatIssuerService, private alerts: AlertModalService,
    public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null, Validators.required],
      tenantId: [null as number | null, Validators.required],
      notes: ['', Validators.maxLength(1000)]
    });
    this.tenantSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => { this.loadingTenants.set(true); this.tenantError.set(''); }),
      switchMap((text) => this.issuers.searchTenants(text ?? '')),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (rows) => { this.tenants.set(rows); this.loadingTenants.set(false); },
      error: () => {
        this.tenants.set([]);
        this.loadingTenants.set(false);
        this.tenantError.set('No se pudo consultar la API SUNAT.');
      }
    });
  }

  ngOnInit(): void {
    if (this.presetCustomer) {
      this.customers.start({ ...this.presetCustomer, label: `${this.presetCustomer.ruc} · ${this.presetCustomer.businessName}` });
      this.form.patchValue({ customerId: this.presetCustomer.id });
    } else {
      this.customers.start();
    }
    this.tenantSearch$.next('');
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
    if (this.selected()?.linked) {
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.issuers.link({ customerId: v.customerId, tenantId: v.tenantId, notes: (v.notes ?? '').trim() || null }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Empresa vinculada', serverMessages(resp, 'Empresa vinculada.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo vincular la empresa.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo vincular la empresa.'), 'danger');
      }
    });
  }
}
