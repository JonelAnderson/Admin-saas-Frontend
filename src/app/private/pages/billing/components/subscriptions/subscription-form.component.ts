import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import {
  BillingCycle, CYCLE_OPTIONS, CustomerLookup, PlanProduct, PlanSelect, PRODUCT_OPTIONS, SubscriptionResponse, limaTodayYmd, money,
  serverMessages
} from '../../models/billing.models';
import { PlanService, SubscriptionService } from '../../services/billing.services';
import { CustomerPicker } from '../customer-picker';

/**
 * Nueva suscripción (un cliente contrata un plan) o edición (cambio de plan del mismo producto, ciclo, precio pactado, día de
 * vencimiento, gracia). La prueba gratuita, la moneda y el estado los pone el servidor.
 */
@Component({
  selector: 'app-subscription-form',
  imports: [SharedModule, NgSelectModule],
  templateUrl: './subscription-form.component.html'
})
export class SubscriptionFormComponent implements OnInit {
  @Input() subscriptionId: number | null = null;
  @Input() presetCustomer: CustomerLookup | null = null;

  readonly products = PRODUCT_OPTIONS;
  readonly cycles = CYCLE_OPTIONS;
  readonly picker = new CustomerPicker();
  readonly plans = signal<PlanSelect[]>([]);
  readonly saving = signal(false);
  readonly editing = signal<SubscriptionResponse | null>(null);
  readonly money = money;
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private planService: PlanService, private subscriptions: SubscriptionService,
    private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null],
      product: [PlanProduct.Erp, Validators.required],
      planId: [null as number | null, Validators.required],
      billingCycle: [BillingCycle.Monthly, Validators.required],
      startOn: [limaTodayYmd()],
      price: [null as number | null, Validators.min(0)],
      billingDay: [null as number | null, [Validators.min(1), Validators.max(28)]],
      graceDays: [5, [Validators.required, Validators.min(0), Validators.max(30)]],
      notes: ['', Validators.maxLength(1000)]
    });
  }

  get selectedPlan(): PlanSelect | undefined {
    return this.plans().find((p) => p.id === this.form.value.planId);
  }

  ngOnInit(): void {
    if (this.subscriptionId) {
      this.subscriptions.byId(this.subscriptionId).subscribe((resp) => {
        if (!resp.succeeded) {
          return;
        }
        const s = resp.data as SubscriptionResponse;
        this.editing.set(s);
        this.form.patchValue({
          product: s.product, planId: s.planId, billingCycle: s.billingCycle, price: s.price, billingDay: s.billingDay,
          graceDays: s.graceDays, notes: s.notes ?? ''
        });
        this.form.get('product')!.disable();
        this.form.get('price')!.addValidators(Validators.required);
        this.form.get('billingDay')!.addValidators(Validators.required);
        // El plan actual puede estar inactivo (no viene en el combo de activos): se agrega para que se vea.
        this.loadPlans(s.product, { id: s.planId, product: s.product, code: s.planCode, name: s.planName, monthlyPrice: s.price, currency: s.currency });
      });
      return;
    }
    this.form.get('customerId')!.addValidators(Validators.required);
    this.picker.start(this.presetCustomer);
    if (this.presetCustomer) {
      this.form.patchValue({ customerId: this.presetCustomer.id });
    }
    this.loadPlans(PlanProduct.Erp);
  }

  onProductChange(product: PlanProduct): void {
    this.form.patchValue({ planId: null });
    this.loadPlans(product);
  }

  private loadPlans(product: PlanProduct, current?: PlanSelect): void {
    this.planService.select(product).subscribe((rows) =>
      this.plans.set(current && !rows.some((p) => p.id === current.id) ? [...rows, current] : rows));
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
    const notes = (v.notes ?? '').trim() || null;
    const editing = this.editing();
    const call = editing
      ? this.subscriptions.update({
          id: editing.id, planId: v.planId, billingCycle: v.billingCycle, price: v.price, billingDay: v.billingDay, graceDays: v.graceDays, notes
        })
      : this.subscriptions.create({
          customerId: v.customerId, planId: v.planId, billingCycle: v.billingCycle, startOn: v.startOn || null,
          price: v.price === '' ? null : v.price, billingDay: v.billingDay || null, graceDays: v.graceDays, notes
        });
    this.saving.set(true);
    call.subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Listo', serverMessages(resp, 'Suscripción guardada.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo guardar la suscripción.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo guardar la suscripción.'), 'danger');
      }
    });
  }
}
