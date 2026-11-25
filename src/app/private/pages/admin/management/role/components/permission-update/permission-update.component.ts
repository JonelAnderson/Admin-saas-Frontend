import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { IdTransferService } from '@shared/service/id-transfer.service';
import { RoleService } from '../../services/role.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { PermissionRequest, RoleClaimRequest } from '../../models/permission-request.interface';
import { NotificationService } from '@shared/service/notification.service';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GenericLoadingComponent } from '@shared/components/reusables/generic-loading/generic-loading.component';
import { PermissionResponse, RoleClaimsResponse } from '../../models/role-claims-response.interface';
import { BaseResponse } from '@shared/models/base-api-response.interface';

@Component({
  // Menús y roles: sin mayúsculas automáticas (installUppercaseTextInputs); se escribe tal cual.
  host: { 'data-keep-case': '' },
  selector: 'app-permission-update',
  imports: [SharedModule, FormsModule, GenericLoadingComponent, PageHeaderComponent],
  templateUrl: './permission-update.component.html',
  styleUrl: './permission-update.component.scss'
})
export class PermissionUpdateComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  disableRegisterButton = false;
  roleId: string | null = null;

  permissionData: PermissionResponse | null = null;
  isUpdatingPermission = false;
  isLoadingPermissions = true;

  entities: string[] = [];
  actions: string[] = [];
  permissionsMap: { [key: string]: { [key: string]: { selected: boolean; disabled: boolean } } } = {};

  constructor(
    private _idTransferService: IdTransferService,
    private _roleService: RoleService,
    private _customtitle: CustomTitleService,
    private _notificationService: NotificationService,
    private _router: Router
  ) {
    this._customtitle.set('Actualizar Permisos');
  }

  ngOnInit(): void {
    this.roleId = this._idTransferService.getSelectedIdKey();
    if (!this.roleId) {
      this._router.navigate(['/private/admin/roles']);
      return;
    }
    this.getPermissionByRoleId();
  }

  /** API may return camelCase or PascalCase property names. */
  private normalizePermissionPayload(res: BaseResponse): PermissionResponse | null {
    const raw = (res?.data ?? res) as Record<string, unknown> | null;
    if (!raw) {
      return null;
    }

    const claimsRaw = (raw['roleClaims'] ?? raw['RoleClaims']) as Record<string, unknown>[] | undefined;
    const roleClaims: RoleClaimsResponse[] = Array.isArray(claimsRaw)
      ? claimsRaw.map((c) => ({
          id: (c['id'] ?? c['Id']) as number,
          roleId: (c['roleId'] ?? c['RoleId'] ?? null) as string | null,
          type: String(c['type'] ?? c['Type'] ?? ''),
          value: String(c['value'] ?? c['Value'] ?? ''),
          description: String(c['description'] ?? c['Description'] ?? ''),
          group: String(c['group'] ?? c['Group'] ?? ''),
          selected: Boolean(c['selected'] ?? c['Selected'])
        }))
      : [];

    return {
      roleId: String(raw['roleId'] ?? raw['RoleId'] ?? this.roleId ?? ''),
      roleName: String(raw['roleName'] ?? raw['RoleName'] ?? ''),
      roleClaims
    };
  }

  private entityLabel(claim: RoleClaimsResponse): string {
    if (claim.group?.trim()) {
      return claim.group.trim();
    }
    const parts = claim.value?.split('.') ?? [];
    return parts.length >= 2 ? parts[1] : claim.value || '-';
  }

  private actionLabel(claim: RoleClaimsResponse): string {
    const parts = claim.value?.split('.') ?? [];
    return parts.length ? parts[parts.length - 1] : claim.value;
  }

  private buildPermissionsGrid(data: PermissionResponse): void {
    this.permissionsMap = {};
    const claims = data.roleClaims ?? [];
    if (!claims.length) {
      this.entities = [];
      this.actions = [];
      return;
    }

    this.entities = [...new Set(claims.map((p) => this.entityLabel(p)))].filter(Boolean).sort();
    this.actions = [...new Set(claims.map((p) => this.actionLabel(p)))].filter(Boolean).sort();

    this.entities.forEach((entity) => {
      this.permissionsMap[entity] = {};
      this.actions.forEach((action) => {
        const permission = claims.find(
          (p) => this.entityLabel(p) === entity && this.actionLabel(p) === action
        );
        this.permissionsMap[entity][action] = {
          selected: permission?.selected ?? false,
          disabled: !permission
        };
      });
    });
  }

  getPermissionByRoleId(): void {
    this.isLoadingPermissions = true;

    this._roleService.PermissionsByRoleId(this.roleId!).subscribe({
      next: (res) => {
        if (!res?.succeeded) {
          this._notificationService.showError(res?.messages ?? 'No se pudieron cargar los permisos', 'Atención');
          this.isLoadingPermissions = false;
          this.cdr.detectChanges();
          return;
        }

        this.permissionData = this.normalizePermissionPayload(res);
        if (!this.permissionData?.roleClaims?.length) {
          this._notificationService.showError('La API no devolvió permisos para este rol.', 'Atención');
        } else {
          this.buildPermissionsGrid(this.permissionData);
        }

        this.isLoadingPermissions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingPermissions = false;
        this._notificationService.showError('Error al cargar permisos del rol', 'Atención');
        this.cdr.detectChanges();
      }
    });
  }

  EditPermissionByRoleId(): void {
    if (!this.permissionData?.roleId) {
      return;
    }

    this.disableRegisterButton = true;
    this.isUpdatingPermission = true;

    const roleClaims: RoleClaimRequest[] = this.permissionData.roleClaims.map((originalClaim) => {
      const entity = this.entityLabel(originalClaim);
      const action = this.actionLabel(originalClaim);
      const permissionState = this.permissionsMap[entity]?.[action];

      return {
        id: originalClaim.id,
        roleId: originalClaim.roleId,
        type: originalClaim.type,
        value: originalClaim.value,
        description: originalClaim.description,
        group: originalClaim.group,
        selected: permissionState ? permissionState.selected : originalClaim.selected
      };
    });

    const permissionRequest: PermissionRequest = {
      roleId: this.permissionData.roleId,
      roleClaims
    };

    this._roleService
      .RoleUpdate(permissionRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this.disableRegisterButton = false;
          this.isUpdatingPermission = false;
          if (resp.succeeded) {
            this._notificationService.showSuccess(resp.messages, 'Excelente');
            localStorage.removeItem('selectedIdKey');
            this._router.navigate(['/private/admin/roles']);
          } else {
            this._notificationService.showError(resp.messages, 'Atención');
          }
        },
        error: () => {
          this.disableRegisterButton = false;
          this.isUpdatingPermission = false;
          this._notificationService.showError('Error al guardar permisos', 'Error');
        }
      });
  }

  onCheckboxChange(entity: string, action: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.permissionsMap[entity]?.[action] && !this.permissionsMap[entity][action].disabled) {
      this.permissionsMap[entity][action].selected = checked;
    }
  }

  hasActions(entity: string): boolean {
    return Object.values(this.permissionsMap[entity] ?? {}).some((permission) => !permission.disabled);
  }

  goBack(): void {
    this._router.navigate(['/private/admin/roles']);
  }
}
