import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import {
  PAYMENT_METHOD_OPTIONS, PaymentMethod, SubscriptionResponse, limaTodayYmd, money, serverMessages, ymdToDisplay
} from '../../models/billing.models';
import { PaymentService, SubscriptionService } from '../../services/billing.services';
import { CustomerPicker } from '../customer-picker';

/**
 * Registrar un pago. El periodo que cubre lo calcula el servidor (desde el día siguiente a "cubierto hasta", o desde hoy si
 * estuvo suspendida más allá de la gracia); el monto se sugiere como precio pactado × ciclos y se puede cambiar.
 */
@Component({
  selector: 'app-payment-register',
  imports: [SharedModule, NgSelectModule],
  templateUrl: './payment-register.component.html'
})
export class PaymentRegisterComponent implements OnInit {
  @Input() presetSubscription: SubscriptionResponse | null = null;

  readonly methods = PAYMENT_METHOD_OPTIONS;
  readonly picker = new CustomerPicker();
  readonly subscriptionOptions = signal<SubscriptionResponse[]>([]);
  readonly saving = signal(false);
  readonly today = limaTodayYmd();
  readonly money = money;
  readonly ymd = ymdToDisplay;
  form: FormGroup;
  submitted = false;
  private amountTouched = false;

  constructor(private fb: FormBuilder, private subscriptions: SubscriptionService, private payments: PaymentService,
    private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      customerId: [null as number | null],
      subscriptionId: [null as number | null, Validators.required],
      paidOn: [this.today, Validators.required],
      periods: [1, [Validators.required, Validators.min(1), Validators.max(24)]],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      method: [PaymentMethod.Transfer, Validators.required],
      operationNumber: ['', Validators.maxLength(60)],
      notes: ['', Validators.maxLength(1000)]
    });
  }

  get selected(): SubscriptionResponse | undefined {
    return this.subscriptionOptions().find((s) => s.id === this.form.value.subscriptionId);
  }

  ngOnInit(): void {
    if (this.presetSubscription) {
      this.subscriptionOptions.set([this.presetSubscription]);
      this.form.patchValue({ subscriptionId: this.presetSubscription.id });
      this.suggestAmount();
    } else {
      this.picker.start();
    }
    this.form.get('periods')!.valueChanges.subscribe(() => this.suggestAmount());
  }

  onCustomerChange(customerId: number | null): void {
    this.form.patchValue({ subscriptionId: null, amount: null });
    this.amountTouched = false;
    this.subscriptionOptions.set([]);
    if (customerId) {
      this.subscriptions.openOfCustomer(customerId).subscribe((rows) => {
        this.subscriptionOptions.set(rows);
        if (rows.length === 1) {
          this.form.patchValue({ subscriptionId: rows[0].id });
          this.suggestAmount();
        }
      });
    }
  }

  onSubscriptionChange(): void {
    this.amountTouched = false;
    this.suggestAmount();
  }

  onAmountInput(): void {
    this.amountTouched = true;
  }

  /** Precio pactado × ciclos, mientras el usuario no haya escrito otro monto. */
  private suggestAmount(): void {
    const s = this.selected;
    const periods = Number(this.form.value.periods) || 1;
    if (s && !this.amountTouched) {
      this.form.patchValue({ amount: Math.round(s.price * periods * 100) / 100 }, { emitEvent: false });
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    const s = this.selected;
    if (this.form.invalid || !s) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.payments.register({
      subscriptionId: s.id, paidOn: v.paidOn, amount: v.amount, currency: s.currency, method: v.method,
      operationNumber: (v.operationNumber ?? '').trim() || null, periods: v.periods, notes: (v.notes ?? '').trim() || null
    }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Pago registrado', serverMessages(resp, 'Pago registrado.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo registrar el pago.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo registrar el pago.'), 'danger');
      }
    });
  }
}
