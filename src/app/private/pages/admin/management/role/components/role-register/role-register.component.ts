import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '@shared/shared.module';
import { RoleService } from '../../services/role.service';
import { GenericValidators } from '@shared/validators/generic-validators';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-role-register',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './role-register.component.html',
  styleUrl: './role-register.component.scss'
})
export class RoleRegisterComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  isSubmit: boolean;
  disableRegisterButton: boolean = false;

  form: FormGroup;
  constructor(
    private _fb: FormBuilder,
    private _roleService: RoleService,
    private alertModalService: AlertModalService,
    public activeModal: NgbActiveModal
  ) {
    this.initForm();
  }
  ngOnInit(): void {
    this.isSubmit = false;
  }

  initForm(): void {
    this.form = this._fb.group({
      name: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100), GenericValidators.noSpacesValidator]],
      description: [
        '',
        [Validators.required, Validators.minLength(4), Validators.maxLength(255), GenericValidators.onlyTextAndSpaceValidator]
      ]
    });
  }

  getFormControl(controlName: string) {
    return this.form.get(controlName);
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.getFormControl(controlName);
    return control ? control.invalid && (control.dirty || control.touched || this.isSubmit) : false;
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }

    if (control.hasError('minlength')) {
      return `Debe tener al menos ${control.getError('minlength').requiredLength} caracteres`;
    }

    if (control.hasError('maxlength')) {
      return `No puede tener más de ${control.getError('maxlength').requiredLength} caracteres`;
    }

    return '';
  }

  RoleRegister(): void {
    this.disableRegisterButton = true;

    if (this.form.invalid) {
      this.isSubmit = true;
      return Object.values(this.form.controls).forEach((controls) => {
        controls.markAllAsTouched();
      });
    }
    this._roleService
      .RoleRegister(this.form.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (resp) => {
          this.disableRegisterButton = false;
          if (resp.succeeded) {
            this.activeModal.close(true);
            await this.alertModalService.showNotification('Excelente', resp.messages, 'success');
          } else {
            await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        }
      });
  }
}
