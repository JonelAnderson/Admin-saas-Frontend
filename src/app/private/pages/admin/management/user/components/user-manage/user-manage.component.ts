import { Component, DestroyRef, inject, OnInit, ChangeDetectorRef, signal } from '@angular/core';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { GenericValidators } from '@shared/validators/generic-validators';
import { PASSWORD_POLICY_MESSAGE, passwordPolicyValidator } from '@shared/validators/password-policy';
import { PasswordRequirementsComponent } from '@shared/components/reusables/password-requirements/password-requirements.component';
import { SharedModule } from '@shared/shared.module';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FileSelectorComponent } from '@shared/components/reusables/file-selector/file-selector.component';
import { UserRequest } from '../../models/user-request.interface';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { httpErrorMessage } from '@shared/functions/http-error-message';

@Component({
  selector: 'vex-user-manage',
  imports: [SharedModule, FileSelectorComponent, NgSelectModule, PasswordRequirementsComponent],
  templateUrl: './user-manage.component.html',
  styleUrls: ['./user-manage.component.scss']
})
export class UserManageComponent implements OnInit {
  isSubmit: boolean;

  ocultarPassword: boolean = true;
  ocultarConfirmPassword: boolean = true;

 disableRegisterButton = signal(false);
  form: FormGroup;

  UserData: any[] = [];

  constructor(
    private _fb: FormBuilder,
    private alertModalService: AlertModalService,
    private _userService: UserService,
    public activeModal: NgbActiveModal,
    private cd: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.userSelect();
  }

  initForm(): void {
    this.form = this._fb.group(
      {
        firstName: [
          '',
          [Validators.required, Validators.minLength(4), Validators.maxLength(100), GenericValidators.onlyTextAndSpaceValidator]
        ],
        lastName: [
          '',
          [Validators.required, Validators.minLength(4), Validators.maxLength(100), GenericValidators.onlyTextAndSpaceValidator]
        ],
        userName: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20), GenericValidators.noSpacesValidator]],
        email: ['', [Validators.required, GenericValidators.emailValidation]],
        password: ['', [Validators.required, passwordPolicyValidator]],
        confirmPassword: ['', [Validators.required]],
        phoneNumber: ['', [Validators.minLength(9), Validators.maxLength(11)]],
        userId: [null, [Validators.required]],
        activateUser: [true],
        autoConfirmEmail: [true],
        profileImage: [null]
      },
      {
        validator: this.passwordMatchValidator
      }
    );
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const passwordControl = formGroup.get('password');
    const confirmPasswordControl = formGroup.get('confirmPassword');

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

    if (control.hasError('emailValidation')) {
      return 'El correo no es válido.';
    }

    if (control.hasError('IsNotTextOrSpace')) {
      return 'El Campo debe ser solo texto.';
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

    if (control.hasError('hasSpaces')) {
      return ' El Usuario no debe tener espacios.';
    }

    return '';
  }


  userSelect(): void {
    this._userService
      .userSelect()
      .subscribe((resp) => {
        if (resp.succeeded) {
          this.UserData = resp.data;
          this.cd.detectChanges();
        }
      });
  }

  UserRegister(): void {
    if (this.form.invalid) {
      this.disableRegisterButton.set(false);
      return Object.values(this.form.controls).forEach((controls) => {
        controls.markAllAsTouched();
        
      });
    }
    this.disableRegisterButton.set(true);

    
    const formValue = this.form.value;

    const userData: UserRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      userName: formValue.userName,
      email: formValue.email,
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
      phoneNumber: formValue.phoneNumber,
      userId: formValue.userId,
      activateUser: formValue.activateUser,
      autoConfirmEmail: formValue.autoConfirmEmail
    };

    // La foto no va en el JSON: se sube aparte, como archivo, con el Id del usuario recién creado.
    this._userService
      .userRegister(userData)
      .subscribe({
        next: async (resp) => {
          if (resp.succeeded) {
            const pictureWarning = await this._userService.saveSelectedPicture(resp.data, formValue.profileImage);
            this.disableRegisterButton.set(false);
            this.activeModal.close(true);
            await this.alertModalService.showNotification(pictureWarning ? 'Usuario registrado' : 'Excelente',
              pictureWarning ?? resp.messages, pictureWarning ? 'warning' : 'success');
          } else {
            this.disableRegisterButton.set(false);
            await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        },
        // Un 400 / 500 / sin red: se avisa y el botón vuelve a estar disponible.
        error: async (err) => {
          this.disableRegisterButton.set(false);
          this.cd.detectChanges();
          await this.alertModalService.showNotification('Atención', httpErrorMessage(err), 'warning');
        }
      });
  }

  onBlur(formControlName: string) {
    this.form.get(formControlName)?.markAsDirty();
  }

  selectedFile(fileData: { fileName: string; fileType: string; extension: string; data: string | ArrayBuffer }) {
    this.form.get('profileImage').setValue(fileData);
  }
}
