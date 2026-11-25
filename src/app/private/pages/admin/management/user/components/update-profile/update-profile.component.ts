import { ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { UserService } from '../../services/user.service';
import { GenericValidators } from '@shared/validators/generic-validators';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { UpdateProfileRequest } from '../../models/user-request.interface';
import { FileUploadModule } from '@iplab/ngx-file-upload';
import { FileSelectorComponent } from '@shared/components/reusables/file-selector/file-selector.component';
import { httpErrorMessage } from '@shared/functions/http-error-message';

@Component({
  selector: 'app-update-profile',
  imports: [SharedModule, NgSelectModule, FileUploadModule, FileSelectorComponent],
  templateUrl: './update-profile.component.html',
  styleUrl: './update-profile.component.scss'
})
export class UpdateProfileComponent implements OnInit {

  isSubmit: boolean;

  disableRegisterButton = signal(false);
  form: FormGroup;

  UserData: any[] = [];

  @Input() userId: string;

  currentUrlPhoto: string = '';
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
    if (this.userId != null) {
      this.getUserById(this.userId);
    }

    this.userSelect();
  }

  initForm(): void {
    this.form = this._fb.group({
      profileId: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
      phoneNumber: ['', [Validators.required, Validators.minLength(9), Validators.maxLength(12)]],
      email: ['', [Validators.required, GenericValidators.emailValidation]],
      userLogin: ['', [Validators.required]],
      userId: [null, [Validators.required]],
      profileImage: [null]
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

    if (control.hasError('emailValidation')) {
      return 'El correo no es válido.';
    }

    if (control.hasError('IsNotNumberDecimal')) {
      return 'El Campo debe ser solo numeros.';
    }

    if (control.hasError('IsNotNumber')) {
      return 'El Campo debe ser solo numeros.';
    }

    return '';
  }

  updateProfile(): void {

    if (this.form.invalid) {
      this.disableRegisterButton.set(false);
      return Object.values(this.form.controls).forEach((controls) => {
        controls.markAllAsTouched();        
      });
    }
  this.disableRegisterButton.set(true);
    const formValue = this.form.value;

    const userData: UpdateProfileRequest = {
      profileId: formValue.profileId,
      firstName: formValue.firstName,
      phoneNumber: formValue.phoneNumber,
      lastName: formValue.lastName,
      email: formValue.email,
      userLogin: formValue.userLogin,
      userId: formValue.userId
    };

    // La foto no va en el JSON: se sube aparte, como archivo, después de guardar los datos.
    this._userService.updateProfile(userData)
      .subscribe({
        next: async (resp) => {
          if (resp.succeeded) {
            const pictureWarning = await this._userService.saveSelectedPicture(formValue.profileId, formValue.profileImage);
            this.disableRegisterButton.set(false);
            this.activeModal.close(true);
            await this.alertModalService.showNotification(pictureWarning ? 'Usuario actualizado' : 'Excelente',
              pictureWarning ?? resp.messages, pictureWarning ? 'warning' : 'success');
          } else {
            this.disableRegisterButton.set(false);
            await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        },
        // Un 400 / 500 / sin red: se avisa y el botón vuelve a estar disponible (antes se quedaba en "Loading...").
        error: async (err) => {
          this.disableRegisterButton.set(false);
          this.cd.detectChanges();
          await this.alertModalService.showNotification('Atención', httpErrorMessage(err), 'warning');
        }
      });
  }
  getUserById(id: string): void {
    this._userService.userById(id).subscribe((resp) => {
      if (resp.succeeded) {
        this.form.reset({
          profileId: resp.data.id,
          firstName: resp.data.firstName,
          lastName: resp.data.lastName,
          phoneNumber: resp.data.phoneNumber,
          email: resp.data.email,
          userLogin: resp.data.userName,
          userId: resp.data.userId
        });
        this.currentUrlPhoto = resp.data.profilePictureDataUrl;
        this.cd.detectChanges();
      }
    });
  }


  userSelect(): void {
    this._userService .userSelect().subscribe((resp) => {
        if (resp.succeeded) {
          this.UserData = resp.data;
          this.cd.detectChanges();
        }
      });
  }

  selectedFile(fileData: { fileName: string; fileType: string; extension: string; data: string | ArrayBuffer }) {
    this.form.get('profileImage').setValue(fileData);
  }
}
