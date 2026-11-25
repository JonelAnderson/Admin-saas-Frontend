import { Component, OnInit, ViewChild, ChangeDetectorRef, signal } from '@angular/core';
import { DateRange, FiltersBox } from '@shared/models/search-options.interface';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { UserService } from '../../services/user.service';
import { componentSettings } from './user-list-config';
import { UserManageComponent } from '../user-manage/user-manage.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { FilterByStateComponent } from '@shared/components/reusables/filter-by-state/filter-by-state.component';
import { IdTransferService } from '@shared/service/id-transfer.service';
import { Router } from '@angular/router';
import { UpdateProfileComponent } from '../update-profile/update-profile.component';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { TableAction } from '@shared/models/table-action.interface';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { PermissionService } from '@shared/service/permission.service';

@Component({
  selector: 'vex-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [
    SharedModule,
    ListTableComponent,
     SearchBoxMultipleComponent,
     FilterByStateComponent,
     ButtonResetFiltersComponent,
    PageHeaderComponent
  ]
})
export class UserListComponent implements OnInit {
  @ViewChild('listTable') listTableComponent: ListTableComponent<any>;
  @ViewChild('stateFilter') stateFilterComponent: FilterByStateComponent;
  @ViewChild('searchBox') searchBoxComponent: SearchBoxMultipleComponent;

  component=componentSettings;
   getInputs = signal('');

  constructor(
    customTitle: CustomTitleService,
    public _userService: UserService,
    private modalService: NgbModal,
    private _idTransferService: IdTransferService,
    private alertModalService: AlertModalService,
    private _router: Router,
    private _permissionService: PermissionService,
    private cd: ChangeDetectorRef
  ) {
    customTitle.set('Usuarios');
  }

  ngOnInit(): void {
    this.formatGetInputs();
  }

  tableActions: TableAction[] = [
    {
      id: 'toggle-active',
      label: (user) => (user.isActive ? 'Desactivar' : 'Activar'),
      icon: (user) => (user.isActive ? 'block' : 'check_circle_outline'),
      color: (user) => (user.isActive ? 'accent' : 'primary'),
      tooltip: (user) => (user.isActive ? 'Desactivar usuario' : 'Activar usuario'),
      visible: (user) => user.userName != 'superadmin' && this.canChangeState()
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'border_color',
      color: 'primary',
      tooltip: 'Editar usuario',
      visible: () => this.canEdit()
    },
    {
      id: 'rol',
      label: 'G. Roles',
      icon: 'settings',
      color: 'primary',
      tooltip: 'G. Roles',
      visible: () => this.canEdit()
    },
    {
      id: 'password',
      label: 'C. Contraseña',
      icon: 'lock',
      color: 'primary',
      tooltip: 'C. Contraseña',
      visible: () => this.canEdit()
    },
    {
      id: 'reset-mfa',
      label: 'Restablecer MFA',
      icon: 'phonelink_lock',
      color: 'warn',
      tooltip: 'Restablecer la verificación en dos pasos (se vuelve a enrolar en su siguiente login)',
      visible: (user) => this.canResetMfa() && !!user.mfaEnabled
    },
    {
      id: 'unlock',
      label: 'Desbloquear',
      icon: 'lock_open',
      color: 'primary',
      tooltip: 'Quitar el bloqueo por intentos fallidos',
      visible: (user) => this.canResetMfa() && !!user.isLocked
    }
  ];

  onActionTriggered(event: { action: string; row: any }) {
    const { action, row } = event;

    switch (action) {
      case 'toggle-active':
        this.handleToggleActive(row);
        break;
      case 'edit':
        this.hanldeUpdateProfile(row);
        break;
      case 'rol':
        this.handleUpdateUserRole(row);
        break;
      case 'password':
        this.handleChangePassword(row);
        break;
      case 'reset-mfa':
        this.handleResetMfa(row);
        break;
      case 'unlock':
        this.handleUnlock(row);
        break;
    }
  }

  setData(value: number) {
    this.component.filters.stateFilter = value;
    this.formatGetInputs();
  }

  search(data: FiltersBox) {
    this.component.filters.textFilter = data.searchData;
    this.formatGetInputs();
  }

  searchDateRange(date: DateRange) {
    this.component.filters.startDate = date.startDate;
    this.component.filters.endDate = date.endDate;
    this.formatGetInputs();
  }

  resetFilters() {
    this.component.filters = { ...this.component.resetFilters };
    if (this.stateFilterComponent) {
      this.stateFilterComponent.resetFilter();
    }
    if (this.searchBoxComponent) {
      this.searchBoxComponent.resetComplete();
    }
    this.formatGetInputs();
  }

  formatGetInputs() {
    let str = '';

    if (this.component.filters.textFilter != null && this.component.filters.textFilter != '') {
      str += `&textFilter=${this.component.filters.textFilter}`;
    }

    if (this.component.filters.stateFilter != null) {
      str += `&stateFilter=${this.component.filters.stateFilter}`;
    }

    if (this.component.filters.startDate != '' && this.component.filters.endDate != '') {
      str += `&startDate=${this.component.filters.startDate}`;
      str += `&endDate=${this.component.filters.endDate}`;
    }

    if (this.component.filters.refresh) {
      let random = Math.random();
      str += `&refresh=${random}`;
      this.component.filters.refresh = false;
    }

    this.getInputs.set(str);
  }

  public canCreate(): boolean {
    return this._permissionService.hasPermission('Permissions.Users.Create');
  }

  public canEdit(): boolean {
    return this._permissionService.hasPermission('Permissions.Users.Edit');
  }

  public canResetMfa(): boolean {
    return this._permissionService.hasPermission('Permissions.Users.ResetMfa');
  }

  public canChangeState(): boolean {
    return this._permissionService.hasPermission('Permissions.Users.ChangeState');
  }

  OpenModalRegister() {
    const modalRef = this.modalService.open(UserManageComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true,
      size: 'lg'
    });
    modalRef.result.then((result) => {
      if (result) {
        this.setGetInputsUsers(true);
      }
    });
  }

  hanldeUpdateProfile($event: any) {
    const modalRef = this.modalService.open(UpdateProfileComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true,
      size: 'lg'
    });
    modalRef.componentInstance.userId = $event.id;
    modalRef.result.then((result) => {
      if (result) {
        this.setGetInputsUsers(true);
      }
    });
  }

  handleChangePassword($event: any) {
    const modalRef = this.modalService.open(ChangePasswordComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
    modalRef.componentInstance.userId = $event.id;
    modalRef.result.then((result) => {
      if (result) {
        this.setGetInputsUsers(true);
      }
    });
  }

  handleUpdateUserRole($event: any) {
    this._idTransferService.setSelectedIdKey($event.id);
    this._router.navigate(['/private/admin/users/user-role']);
  }

  async handleToggleActive($event: any) {
    const user = {
      activateUser: !$event.isActive,
      userId: $event.id
    };
    const action = $event.isActive ? 'desactivar' : 'activar';
    const confirmButtonText = $event.isActive ? 'Sí, desactivar' : 'Sí, activar';

    const result = await this.alertModalService.show({
      title: `¿Realmente deseas ${action} al usuario ${$event.userName}?`,
      message: `Se ${action}á el usuario!`,
      type: 'warning',
      showCancel: true,
      confirmText: confirmButtonText,
      cancelText: 'Cancelar'
    });

    if (result) {
      this._userService
        .userChangeState(user)
        .subscribe({
          next: async (resp) => {
            if (resp.succeeded) {
              await this.alertModalService.showNotification('Excelente', resp.messages, 'success');
              this.setGetInputsUsers(true);
            } else {
              await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
            }
          }
        });
    }
  }

  async handleResetMfa($event: any) {
    const result = await this.alertModalService.show({
      title: `¿Restablecer la verificación en dos pasos de ${$event.userName}?`,
      message: 'Se borrarán su app autenticadora y sus códigos de recuperación, y se cerrará su sesión. Deberá volver a enrolarse en su siguiente login.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Sí, restablecer',
      cancelText: 'Cancelar'
    });
    if (!result) {
      return;
    }
    this._userService.resetMfa($event.id).subscribe({
      next: (resp) => this.notifyAndRefresh(resp),
      error: (err) => this.alertModalService.showNotification('Atención', this.messagesText(err?.error?.messages), 'warning')
    });
  }

  async handleUnlock($event: any) {
    const result = await this.alertModalService.show({
      title: `¿Desbloquear al usuario ${$event.userName}?`,
      message: 'Podrá volver a intentar iniciar sesión de inmediato.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Sí, desbloquear',
      cancelText: 'Cancelar'
    });
    if (!result) {
      return;
    }
    this._userService.unlock($event.id).subscribe({
      next: (resp) => this.notifyAndRefresh(resp),
      error: (err) => this.alertModalService.showNotification('Atención', this.messagesText(err?.error?.messages), 'warning')
    });
  }

  private async notifyAndRefresh(resp: any) {
    if (resp?.succeeded) {
      await this.alertModalService.showNotification('Excelente', this.messagesText(resp.messages, 'Operación realizada.'), 'success');
      this.setGetInputsUsers(true);
    } else {
      await this.alertModalService.showNotification('Atención', this.messagesText(resp?.messages), 'warning');
    }
  }

  private messagesText(messages: unknown, fallback = 'No se pudo completar la operación.'): string {
    if (Array.isArray(messages) && messages.length) {
      return messages.join(' ');
    }
    return messages ? String(messages) : fallback;
  }

  setGetInputsUsers(refresh: boolean) {
    this.component.filters.refresh = refresh;
    this.formatGetInputs();
  }
}
