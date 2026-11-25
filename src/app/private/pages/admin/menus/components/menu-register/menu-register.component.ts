import { AfterViewInit, ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { SharedModule } from '@shared/shared.module';
import { MenuService } from '../../services/menu.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { GenericValidators } from '@shared/validators/generic-validators';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-menu-register',
  imports: [SharedModule, NgSelectModule],
  templateUrl: './menu-register.component.html',
  styleUrl: './menu-register.component.scss'
})
export class MenuRegisterComponent implements OnInit { 
  form: FormGroup;
   disableRegisterButton = signal(false);
  menuData: any[] = [];
  typeData = [
    {id: 'group', name: 'Grupo'}, 
    {id: 'item', name: 'Item'}, 
    {id: 'collapse', name: 'Colapsable'}
  ];

  constructor(
    private _fb: FormBuilder,
    private _alertModalService: AlertModalService,
    private _menuService: MenuService,
    public activeModal: NgbActiveModal,
    private _cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  initForm(): void {
    this.form = this._fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      type: ['item', [Validators.required]],
      url: [''],
      icon: [''],
      order: [0, [Validators.required, GenericValidators.onlyNumberValidator]],
      hidden: [false],
      disabled: [false],
      exactMatch: [false],
      external: [false],
      target: [false],
      breadcrumbs: [false],
      badgeTitle: [''],
      badgeType: [''],
      menuParentId: [null]
    });
  }

  loadMenus() {
    this._menuService.menuSelect().subscribe((resp) => {
      if (resp.succeeded) {
        this.menuData = resp.data;
        this._cdr.detectChanges();
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.form.get(controlName);
    if (control.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control.hasError('maxlength')) {
      return `No puede tener más de ${control.getError('maxlength').requiredLength} caracteres`;
    }
    if (control.hasError('IsNotNumber')) {
      return 'El Campo debe ser solo numeros.';
    }
    return '';
  }

  menuRegister(): void {

    if (this.form.invalid) {
       this.disableRegisterButton.set(false);
      return Object.values(this.form.controls).forEach((controls) => {
        controls.markAllAsTouched();       
        this._cdr.detectChanges();
      });
    }
    this.disableRegisterButton.set(true);

    const formValue = this.form.getRawValue();

    this._menuService.menuRegister(formValue).subscribe((resp) => {
      this.disableRegisterButton.set(false);
      this._cdr.detectChanges();
      if (resp.succeeded) {
        this.activeModal.close(true);
        this._alertModalService.showNotification('Excelente', resp.messages, 'success');
        
      } else {
        this._alertModalService.showNotification('Atención', resp.messages, 'warning');
      }
    });
  }
}
