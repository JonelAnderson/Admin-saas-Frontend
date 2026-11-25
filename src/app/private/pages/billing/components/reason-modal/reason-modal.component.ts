import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';

export interface ReasonModalResult {
  reason: string;
  date: string | null;
}

/**
 * Pide el motivo (obligatorio) de una acción: suspender, reactivar, cancelar, anular un pago o prorrogar (esta última también
 * pide la nueva fecha). Cierra con { reason, date }.
 */
@Component({
  selector: 'app-reason-modal',
  imports: [SharedModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather {{ icon }}"></em>{{ title }}</h5>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      @if (description) {
      <p class="text-muted">{{ description }}</p>
      }
      <form [formGroup]="form" class="erp-form" novalidate>
        @if (askDate) {
        <div class="mb-3">
          <label class="form-label" for="reason-date">{{ dateLabel }} <span class="erp-required">*</span></label>
          <input id="reason-date" type="date" class="form-control" formControlName="date" [min]="minDate || null"
            [class.is-invalid]="invalid('date')" />
          @if (invalid('date')) {
          <div class="invalid-feedback">Indique la fecha.</div>
          }
        </div>
        }
        <label class="form-label" for="reason-text">Motivo <span class="erp-required">*</span></label>
        <textarea id="reason-text" class="form-control" rows="3" formControlName="reason" maxlength="400"
          placeholder="Queda registrado en la suscripción y en la auditoría" [class.is-invalid]="invalid('reason')"></textarea>
        @if (invalid('reason')) {
        <div class="invalid-feedback">Indique el motivo.</div>
        }
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn {{ confirmClass }}" (click)="confirm()">{{ confirmText }}</button>
    </div>
  `
})
export class ReasonModalComponent implements OnInit {
  @Input() title = 'Motivo';
  @Input() description = '';
  @Input() icon = 'icon-edit-3';
  @Input() confirmText = 'Confirmar';
  @Input() confirmClass = 'btn-primary';
  @Input() askDate = false;
  @Input() dateLabel = 'Fecha';
  @Input() minDate = '';
  @Input() defaultDate = '';

  form: FormGroup;
  private submitted = false;

  constructor(private fb: FormBuilder, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      date: [''],
      reason: ['', [Validators.required, Validators.maxLength(400)]]
    });
  }

  ngOnInit(): void {
    if (this.askDate) {
      this.form.get('date')!.setValidators(Validators.required);
      this.form.patchValue({ date: this.defaultDate });
    }
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  confirm(): void {
    this.submitted = true;
    const reason = (this.form.value.reason ?? '').trim();
    if (!reason) {
      this.form.get('reason')!.setValue('');
    }
    if (this.form.invalid || !reason) {
      this.form.markAllAsTouched();
      return;
    }
    this.activeModal.close({ reason, date: this.askDate ? this.form.value.date : null } as ReasonModalResult);
  }
}
