import { Component, Input, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomerRequest, serverMessages } from '../../models/billing.models';
import { CustomerService } from '../../services/billing.services';

/** RUC peruano: 11 dígitos, prefijo 10/15/16/17/20 y dígito verificador módulo 11 (misma regla que RucRules del backend). */
export function rucValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }
  if (!/^\d{11}$/.test(value) || !['10', '15', '16', '17', '20'].includes(value.substring(0, 2))) {
    return { ruc: true };
  }
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(value[i]), 0);
  let check = 11 - (sum % 11);
  check = check === 10 ? 0 : check === 11 ? 1 : check;
  return check === Number(value[10]) ? null : { ruc: true };
}

/** Crear o editar un cliente de la plataforma (customerId = null crea). */
@Component({
  selector: 'app-customer-form',
  imports: [SharedModule],
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  @Input() customerId: number | null = null;

  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private customers: CustomerService, private alerts: AlertModalService,
    public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      ruc: ['', [Validators.required, rucValidator]],
      businessName: ['', [Validators.required, Validators.maxLength(200)]],
      tradeName: ['', Validators.maxLength(200)],
      address: ['', Validators.maxLength(300)],
      contactName: ['', Validators.maxLength(150)],
      contactEmail: ['', [Validators.email, Validators.maxLength(150)]],
      contactPhone: ['', [Validators.pattern(/^\+?[0-9 ]{6,20}$/)]],
      notes: ['', Validators.maxLength(1000)]
    });
  }

  ngOnInit(): void {
    if (this.customerId) {
      this.customers.byId(this.customerId).subscribe((resp) => {
        if (resp.succeeded) {
          this.form.patchValue(resp.data);
        }
      });
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
    const body: CustomerRequest = this.form.getRawValue();
    body.ruc = body.ruc.trim();
    this.saving.set(true);
    const call = this.customerId ? this.customers.update({ ...body, id: this.customerId }) : this.customers.create(body);
    call.subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Listo', serverMessages(resp, 'Cliente guardado.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo guardar el cliente.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo guardar el cliente.'), 'danger');
      }
    });
  }
}
