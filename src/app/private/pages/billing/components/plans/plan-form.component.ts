import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CURRENCY_OPTIONS, PlanProduct, PlanRequest, PRODUCT_OPTIONS, serverMessages } from '../../models/billing.models';
import { PlanService } from '../../services/billing.services';

/** Crear o editar un plan (planId = null crea). Los límites que no aplican al producto se envían vacíos. */
@Component({
  selector: 'app-plan-form',
  imports: [SharedModule, NgSelectModule],
  templateUrl: './plan-form.component.html'
})
export class PlanFormComponent implements OnInit {
  @Input() planId: number | null = null;

  readonly products = PRODUCT_OPTIONS;
  readonly currencies = CURRENCY_OPTIONS;
  readonly apiPlans = [
    { value: 'free', label: 'free' },
    { value: 'pro', label: 'pro' },
    { value: 'business', label: 'business' }
  ];
  readonly saving = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private plans: PlanService, private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    const limit = [null as number | null, [Validators.min(1)]];
    this.form = this.fb.group({
      product: [PlanProduct.Erp, Validators.required],
      code: ['', [Validators.required, Validators.maxLength(32), Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      monthlyPrice: [0, [Validators.required, Validators.min(0)]],
      yearlyPrice: [null, Validators.min(0)],
      currency: ['PEN', Validators.required],
      trialDays: [0, [Validators.required, Validators.min(0), Validators.max(90)]],
      sortOrder: [0, [Validators.required, Validators.min(0)]],
      maxCompanies: limit,
      maxUsers: limit,
      maxBranches: limit,
      includesAi: [false],
      apiPlanSlug: [null as string | null],
      maxIssuers: limit,
      maxDocumentsPerMonth: limit
    });
  }

  get isErp(): boolean {
    return this.form.value.product === PlanProduct.Erp;
  }

  /** Un plan de la API siempre lleva límites de la API; uno del ERP solo si la incluye. */
  get hasApi(): boolean {
    return !this.isErp || !!this.form.value.apiPlanSlug;
  }

  ngOnInit(): void {
    if (this.planId) {
      this.plans.byId(this.planId).subscribe((resp) => {
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
    const v = this.form.getRawValue();
    const erp = v.product === PlanProduct.Erp;
    if (!erp && !v.apiPlanSlug) {
      this.form.get('apiPlanSlug')?.setErrors({ required: true });
      this.form.markAllAsTouched();
      return;
    }
    const hasApi = !erp || !!v.apiPlanSlug;
    const body: PlanRequest = {
      ...v,
      code: (v.code ?? '').trim().toUpperCase(),
      maxCompanies: erp ? v.maxCompanies : null,
      maxUsers: erp ? v.maxUsers : null,
      maxBranches: erp ? v.maxBranches : null,
      includesAi: erp && v.includesAi,
      apiPlanSlug: v.apiPlanSlug || null,
      maxIssuers: hasApi ? v.maxIssuers : null,
      maxDocumentsPerMonth: hasApi ? v.maxDocumentsPerMonth : null
    };
    this.saving.set(true);
    const call = this.planId ? this.plans.update({ ...body, id: this.planId }) : this.plans.create(body);
    call.subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (resp.succeeded) {
          this.activeModal.close(true);
          await this.alerts.showNotification('Listo', serverMessages(resp, 'Plan guardado.'), 'success');
        } else {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo guardar el plan.'), 'warning');
        }
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo guardar el plan.'), 'danger');
      }
    });
  }
}
