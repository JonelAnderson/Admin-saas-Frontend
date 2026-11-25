import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { IdTransferService } from '@shared/service/id-transfer.service';
import { UserUpdateRequest } from '../../models/user-update.interface';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { RoleResponse } from '../../models/role-response.interface';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { UserByIdResponse } from '../../models/user-reponse-by-id.inertface';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-user-roles-update',
  standalone: true,
  imports: [SharedModule, PageHeaderComponent],
  templateUrl: './user-roles-update.component.html',
  styleUrl: './user-roles-update.component.scss',
})
export class UserRolesUpdateComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  disableRegisterButton: boolean = false;
  userId: string;

  selectedStates: boolean[] = [];
  stateValue: boolean[] = [];
  isAnyCheckboxChecked: boolean = false;
  roleData: RoleResponse[] = [];
  userData: UserByIdResponse;

  userName: string;

  constructor(
    private _idTransferService: IdTransferService,
    private _userService: UserService,
    private _customtitle: CustomTitleService,
    private alertModalService: AlertModalService,
    private _router: Router
  ) {
    this._customtitle.set('User Role');
  }

  ngOnInit(): void {
    this.userId = this._idTransferService.getSelectedIdKey();
    this.getRole();
    this.getUser();

    if (this.roleData) {
      this.selectedStates = this.roleData.map(() => false);
      this.stateValue = this.roleData.map(() => false);
    }
  }

  getUser(): void {
    this._userService
      .userById(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resp) => {
        if (resp.succeeded) {
          this.userData = resp.data;
          this.userName = this.userData.userName;
        }
      });
  }

  getRole(): void {
    this._userService
      .userRolesById(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resp) => {
        if (resp.succeeded) {
          this.roleData = resp.data.userRoles;
          this.selectedStates = this.roleData.map((role) => role.selected);
          this.stateValue = this.roleData.map((role) => role.selected);
        }
      });
  }

  onCheckboxChange() {
    this.isAnyCheckboxChecked = this.selectedStates.some((state) => state);
  }

  UpdateRoleUser(): void {
    if (!this.roleData) {
      return;
    }
    this.disableRegisterButton = true;

    const userRequest: UserUpdateRequest = {
      userId: this.userId,
      userRoles: this.roleData.map((role, index) => {
        return {
          roleName: role.roleName,
          roleDescription: role.roleDescription,
          selected: this.selectedStates[index] || false
        };
      })
    };

    this._userService
      .userRolesUpdate(this.userId, userRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (resp) => {
          this.disableRegisterButton = false;
          if (resp.succeeded) {
            this.selectedStates = [];
            localStorage.removeItem('selectedIdKey');
            this._router.navigate(['/private/admin/users']);
            await this.alertModalService.showNotification('Excelente', resp.messages, 'success');
          } else {
            await this.alertModalService.showNotification('Atención', resp.messages, 'warning');
          }
        }
      });
  }
  goBack(): void {
    this._router.navigate(['/private/admin/users']);
  }
}
