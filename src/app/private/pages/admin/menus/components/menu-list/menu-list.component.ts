import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { MenuService } from '../../services/menu.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { componentSettings } from './menu-list-config';
import { FiltersBox } from '@shared/models/search-options.interface';
import { MenuUpdateComponent } from '../menu-update/menu-update.component';
import { MenuRegisterComponent } from '../menu-register/menu-register.component';
import { TableAction } from '@shared/models/table-action.interface';
import { PermissionService } from '@shared/service/permission.service';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { FilterByStateComponent } from '@shared/components/reusables/filter-by-state/filter-by-state.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-menu-list',
  imports: [
    SharedModule,
    ListTableComponent,
    SearchBoxMultipleComponent,
    FilterByStateComponent,
    ButtonResetFiltersComponent,
    PageHeaderComponent
  ],
  templateUrl: './menu-list.component.html',
  styleUrl: './menu-list.component.scss'
})
export class MenuListComponent implements OnInit {

  @ViewChild('listTable') listTableComponent: ListTableComponent<any>;
  @ViewChild('stateFilter') stateFilterComponent: FilterByStateComponent;
  @ViewChild('searchBox') searchBoxComponent: SearchBoxMultipleComponent;

  infoTooltip = "Descargar resultados en formato Excel.";
   getInputs = signal('');

  component = componentSettings;
  tableActions: TableAction[] = [
    {
      id: 'toggle-active',
      label: (menu) => (menu.isActive ? 'Desactivar' : 'Activar'),
      icon: (menu) => (menu.isActive ? 'block' : 'check_circle_outline'),
      color: (menu) => (menu.isActive ? 'accent' : 'primary'),
      tooltip: (menu) => (menu.isActive ? 'Desactivar' : 'Activar'),
      visible: () => this.canChangeState()
    },
    {
      id: 'edit',
      label: 'Editar',
      icon: 'border_color',
      color: 'primary',
      tooltip: 'Editar',
      visible: () => this.canEdit()
    },
    {
      id: 'delete',
      label: 'Eliminar',
      icon: 'delete_forever',
      color: 'warn',
      tooltip: 'Eliminar',
      visible: () => this.canDelete()
    }
  ];

  constructor(
    private _modalService: NgbModal,
    public _menuService: MenuService,
    private _alertModalService: AlertModalService,
    private customTitle: CustomTitleService,
    private _permissionService: PermissionService,
    private _cdr: ChangeDetectorRef
  ) {
    this.customTitle.set("Menús");
  }

  ngOnInit(): void {
    this.formatGetInputs();
  }

  setData(value: number) {
    this.component.filters.stateFilter = value;
    this.formatGetInputs();
  }

  search(data: FiltersBox) {
    this.component.filters.numFilter = data.searchValue;
    this.component.filters.textFilter = data.searchData;
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
    let str = "";
    if (this.component.filters.textFilter != null && this.component.filters.textFilter != '') {
      str += `&textFilter=${this.component.filters.textFilter}`;
    }
    if (this.component.filters.stateFilter != null) {
      str += `&stateFilter=${this.component.filters.stateFilter}`;
    }
    if (this.component.filters.refresh) {
      let random = Math.random();
      str += `&refresh=${random}`;
      this.component.filters.refresh = false;
    }
     this.getInputs.set(str);
  }

  canCreate(): boolean {
    return this._permissionService.hasPermission('Permissions.Menus.Create');
  }

  canEdit(): boolean {
    return this._permissionService.hasPermission('Permissions.Menus.Edit');
  }

  canDelete(): boolean {
    return this._permissionService.hasPermission('Permissions.Menus.Delete');
  }

  canChangeState(): boolean {
    // Menus use Edit permission for ChangeState according to my backend change
    return this._permissionService.hasPermission('Permissions.Menus.Edit');
  }

  OpenModalRegister() {
    const modalRef = this._modalService.open(MenuRegisterComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    modalRef.result.then((result) => {
      if (result) {
        this.setGetInputsMenus(true);
      }
    }, () => {});
  }

  onAction(event: { action: string; row: any }) {
    switch (event.action) {
      case 'toggle-active':
        this.handleToggleActive(event.row);
        break;
      case 'edit':
        this.OpenModalUpdate(event.row);
        break;
      case 'delete':
        this.onDelete(event.row);
        break;
    }
  }

  async onDelete($event: any): Promise<void> {
    const result = await this._alertModalService.show({
      title: `¿Realmente deseas eliminar el menú ${$event.title}?`,
      message: "Se borrará de forma permanente!",
      type: 'warning',
      showCancel: true,
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
    });

    if (result) {
      this._menuService.menuDelete($event.id).subscribe((resp) => {
        if (resp.succeeded) {
          this._alertModalService.showNotification('Excelente', resp.messages, 'success');
          this.setGetInputsMenus(true);
        } else {
          this._alertModalService.showNotification('Atención', resp.messages, 'warning');
        }
      });
    }
  }

  OpenModalUpdate($event: any) {
    const modalRef = this._modalService.open(MenuUpdateComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      centered: true
    });
    modalRef.componentInstance.id = $event.id;
    modalRef.result.then((result) => {
      if (result) {
        this.setGetInputsMenus(true);
      }
    }, () => {});
  }

  setGetInputsMenus(refresh: boolean) {
    this.component.filters.refresh = refresh;
    this.formatGetInputs();
  }

  async handleToggleActive($event: any): Promise<void> {
    const action = $event.isActive ? 'desactivar' : 'activar';
    const confirmButtonText = $event.isActive ? 'Sí, desactivar' : 'Sí, activar';

    const result = await this._alertModalService.show({
      title: `¿Realmente deseas ${action} el menú ${$event.title}?`,
      message: `Se ${action}á el registro!`,
      type: 'warning',
      showCancel: true,
      confirmText: confirmButtonText,
      cancelText: 'Cancelar'
    });

    if (result) {
      this._menuService.menuChangeState($event.id).subscribe({
        next: async (resp) => {
          if (resp.succeeded) {
            await this._alertModalService.showNotification('Excelente', resp.messages, 'success');
            this.setGetInputsMenus(true);
          } else {
            await this._alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        }
      });
    }
  }
}
