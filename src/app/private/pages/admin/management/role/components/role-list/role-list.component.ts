import { Component, DestroyRef, EventEmitter, inject, OnInit } from '@angular/core';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { RoleResponse } from '../../models/role-response.interface';
import { RoleService } from '../../services/role.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { componentSettings } from './role-list-config';
import { RoleRegisterComponent } from '../role-register/role-register.component';
import { Router } from '@angular/router';
import { IdTransferService } from '@shared/service/id-transfer.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { TableAction } from '@shared/models/table-action.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ListTableSimpleComponent } from '@shared/components/reusables/list-table-simple/list-table.component';
import { PermissionService } from '@shared/service/permission.service';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-role-list',
  standalone: true,
  imports: [SharedModule, ListTableSimpleComponent, PageHeaderComponent],
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss'
})
export class RoleListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private _permissionService = inject(PermissionService);
  
  deleteRole = new EventEmitter<void>();
  registerRole = new EventEmitter<void>();

  component;

  constructor(
    private modalService: NgbModal,
    public _roleService: RoleService,
    private alertModalService: AlertModalService,
    private customTitle: CustomTitleService,
    private _router: Router,
    private _idTransferService: IdTransferService
  ) {
    this.customTitle.set('Roles');
  }

  ngOnInit(): void {
    this.component = componentSettings;
  }

  tableActions: TableAction[] = [
    {
      id: 'edit',
      label: 'G. Permisos',
      icon: 'settings',
      color: 'primary',
      tooltip: 'G. Permisos',
      visible: () => this.canEdit()
    },
    {
      id: 'menu',
      label: 'G. Menús',
      icon: 'menu_open',
      color: 'accent',
      tooltip: 'G. Menús',
      visible: () => this.canEdit()
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: 'delete_forever',
      color: 'warn',
      tooltip: 'Eliminar rol',
      visible: () => this.canDelete()
    }
  ];

  public canCreate(): boolean {
    return this._permissionService.hasPermission('Permissions.Roles.Create');
  }

  public canEdit(): boolean {
    return this._permissionService.hasPermission('Permissions.Roles.Edit');
  }

  public canDelete(): boolean {
    return this._permissionService.hasPermission('Permissions.Roles.Delete');
  }

  onActionTriggered(event: { action: string; row: any }) {
    const { action, row } = event;

    switch (action) {
      case 'edit':
        this.handlePermissionUpdate(row);
        break;

      case 'menu':
        this.handleMenuUpdate(row);
        break;

      case 'delete':
        this.handleDelete(row);
        break;
    }
  }

  openDialogRegister() {
    const modalRef = this.modalService.open(RoleRegisterComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    modalRef.componentInstance.title = 'Registrar';
    modalRef.result.then((result) => {
      if (result) {
        this.registerRole.emit();
      }
    });
  }

  handlePermissionUpdate($event: any) {
    this._idTransferService.setSelectedIdKey($event.id);
    this._router.navigate(['/private/admin/roles/update-permissions']);
  }

  handleMenuUpdate($event: any) {
    this._idTransferService.setSelectedIdKey($event.id);
    this._router.navigate(['/private/admin/roles/update-role-menus']);
  }

  async handleDelete($event: any) {
    const result = await this.alertModalService.show({
      title: `¿Realmente deseas eliminar al rol ${$event.name}?`,
      message: `El registro se borrará de forma permanente!`,
      type: 'warning',
      showCancel: true,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (result) {
      this._roleService
        .RoleDelete($event.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: async (resp) => {
            if (resp.succeeded) {
              await this.alertModalService.showNotification('Excelente', resp.messages, 'success');
              this.deleteRole.emit();
            } else {
              await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
            }
          }
        });
    }
  }
}
