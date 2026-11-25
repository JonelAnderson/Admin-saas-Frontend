import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { SharedModule } from '@shared/shared.module';
import { UserService } from '../../services/user.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PASSWORD_POLICY_MESSAGE, passwordPolicyValidator } from '@shared/validators/password-policy';
import { PasswordRequirementsComponent } from '@shared/components/reusables/password-requirements/password-requirements.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from 'src/app/public/pages/login/services/auth.service';

@Component({
  selector: 'app-change-password',
  imports: [SharedModule, NgSelectModule, PasswordRequirementsComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  isSubmit: boolean;

 disableRegisterButton = signal(false);
  ocultarPassword: boolean = true;
  ocultarNewPassword: boolean = true;
  ocultarNewPasswordConfirm: boolean = true;

  form: FormGroup;
  profileId: string = '';

  @Input() userId: string;
  constructor(
    private _fb: FormBuilder,
    private alertModalService: AlertModalService,
    private _userService: UserService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    if (this.userId != null) {
      this.profileId = this.userId;
    }
    this.initForm();
  }

  initForm(): void {
    this.form = this._fb.group(
      {
        profileId: [this.profileId, [Validators.required]],
        // La contraseña actual puede ser de la política anterior (6+): no se le exige la nueva.
        password: ['', [Validators.required]],
        newPassword: ['', [Validators.required, passwordPolicyValidator]],
        confirmNewPassword: ['', [Validators.required]]
      },
      {
        validator: this.passwordMatchValidator
      }
    );
  }

  getFormControl(controlName: string) {
    return this.form.get(controlName);
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.getFormControl(controlName);
    return control ? control.invalid && (control.dirty || control.touched || this.isSubmit) : false;
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const passwordControl = formGroup.get('newPassword');
    const confirmPasswordControl = formGroup.get('confirmNewPassword');

    if (passwordControl && confirmPasswordControl) {
      const password = passwordControl.value;
      const confirmPassword = confirmPasswordControl.value;

      if (password !== confirmPassword) {
        confirmPasswordControl.setErrors({ passwordMismatch: true });
      } else {
        confirmPasswordControl.setErrors(null);
      }
    }
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

    if (control.hasError('emailValidation')) {
      return 'El correo no es válido.';
    }

    if (control.hasError('IsNotNumberDecimal')) {
      return 'El Campo debe ser solo numeros.';
    }

    if (control.hasError('IsNotNumber')) {
      return 'El Campo debe ser solo numeros.';
    }
    if (control.hasError('InvalidPassword')) {
      return 'La contraseña debe contener números, letras mayúsculas y minúsculas y un carácter especial.';
    }

    if (control.hasError('passwordPolicy')) {
      return PASSWORD_POLICY_MESSAGE;
    }

    if (control.hasError('passwordMismatch')) {
      return 'La contraseña no coinciden.';
    }

    return '';
  }

  changePassword(): void {

    if (this.form.invalid) {
      this.disableRegisterButton.set(false);
      return Object.values(this.form.controls).forEach((controls) => {
        controls.markAllAsTouched();
      });
    }
    this.disableRegisterButton.set(true);

    const formValue = this.form.getRawValue();

    this._userService
      .changePassword(formValue)
      .subscribe({
        next: async (resp) => {
          this.disableRegisterButton.set(false);
          if (resp.succeeded) {
            this.activeModal.close(true);
            await this.alertModalService.showNotification('Contraseña actualizada',
              'Por seguridad se cerró la sesión en todos sus dispositivos. Ingrese con la nueva contraseña.', 'success');
            // El servidor ya revocó los tokens (nuevo security stamp): solo queda limpiar este navegador.
            this.authService.logout('Contraseña actualizada. Ingrese con la nueva contraseña.', false);
          } else {
            await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        }
      });
  }
  onBlur(formControlName: string) {
    this.form.get(formControlName)?.markAsDirty();
  }
}
