import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { IdTransferService } from '@shared/service/id-transfer.service';
import { RoleService } from '../../services/role.service';
import { MenuService } from '../../../../menus/services/menu.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { NotificationService } from '@shared/service/notification.service';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GenericLoadingComponent } from '@shared/components/reusables/generic-loading/generic-loading.component';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { fetchAllPages } from '@shared/functions/fetch-all-pages';
import { map } from 'rxjs/operators';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-role-menu-update',
  standalone: true,
  imports: [SharedModule, FormsModule, GenericLoadingComponent, PageHeaderComponent],
  templateUrl: './role-menu-update.component.html',
  styleUrl: './role-menu-update.component.scss'
})
export class RoleMenuUpdateComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  disableRegisterButton = false;
  roleId: string;
  roleName = '';

  allMenus: any[] = [];
  selectedMenuIds: number[] = [];
  isUpdating = false;
  isLoading = true;

  constructor(
    private _idTransferService: IdTransferService,
    private _roleService: RoleService,
    private _menuService: MenuService,
    private _customtitle: CustomTitleService,
    private _notificationService: NotificationService,
    private _router: Router
  ) {
    this._customtitle.set('Asignar Menús a Rol');
  }

  ngOnInit(): void {
    this.roleId = this._idTransferService.getSelectedIdKey();
    if (!this.roleId) {
      this._router.navigate(['/private/admin/roles']);
      return;
    }

    this.loadData();
  }

  private endLoading(): void {
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private applyMenus(resp: BaseResponse | null | undefined): void {
    this.allMenus = Array.isArray(resp?.data) ? resp.data : [];
    if (!this.allMenus.length && resp?.succeeded === false) {
      this._notificationService.showError(
        'No se pudo cargar el listado de menús. Verifique permiso Menús → Ver.',
        'Atención'
      );
    }
  }

  loadData(): void {
    this.isLoading = true;
    let menusDone = false;
    let roleMenusDone = false;

    const tryFinish = (): void => {
      if (menusDone && roleMenusDone) {
        this.endLoading();
      }
    };

    this._menuService.menuSelect().subscribe({
      next: (resp) => {
        this.applyMenus(resp);
        menusDone = true;
        tryFinish();
      },
      error: () => {
        // Every menu, page after page of 50 (the API maximum).
        fetchAllPages((page, size) => this._menuService.GetAll(size, page, ''))
          .pipe(map((data) => ({ succeeded: data.length > 0, data, totalRecords: data.length, messages: null, errors: null }) as BaseResponse))
          .subscribe({
          next: (resp) => {
            this.applyMenus(resp);
            menusDone = true;
            tryFinish();
          },
          error: () => {
            this.allMenus = [];
            menusDone = true;
            tryFinish();
          }
        });
      }
    });

    this._roleService.MenusByRoleId(this.roleId).subscribe({
      next: (resp) => {
        this.selectedMenuIds = Array.isArray(resp?.data) ? resp.data : [];
        roleMenusDone = true;
        tryFinish();
      },
      error: () => {
        this.selectedMenuIds = [];
        roleMenusDone = true;
        tryFinish();
      }
    });

    setTimeout(() => {
      if (this.isLoading) {
        menusDone = true;
        roleMenusDone = true;
        this.endLoading();
      }
    }, 25000);
  }

  onCheckboxChange(menuId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedMenuIds.includes(menuId)) {
        this.selectedMenuIds = [...this.selectedMenuIds, menuId];
      }
    } else {
      this.selectedMenuIds = this.selectedMenuIds.filter((id) => id !== menuId);
    }
  }

  isMenuSelected(menuId: number): boolean {
    return this.selectedMenuIds.includes(menuId);
  }

  saveChanges(): void {
    this.disableRegisterButton = true;
    this.isUpdating = true;

    const request = {
      roleId: this.roleId,
      menuIds: this.selectedMenuIds
    };

    this._roleService.RoleMenusUpdate(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.disableRegisterButton = false;
          this.isUpdating = false;
          if (resp.succeeded) {
            this._notificationService.showSuccess(resp.messages, 'Excelente');
            this._router.navigate(['/private/admin/roles']);
          } else {
            this._notificationService.showError(resp.messages, 'Atención');
          }
        },
        error: () => {
          this.disableRegisterButton = false;
          this.isUpdating = false;
          this._notificationService.showError('Ocurrió un error al guardar', 'Error');
        }
      });
  }

  goBack(): void {
    this._router.navigate(['/private/admin/roles']);
  }
}
