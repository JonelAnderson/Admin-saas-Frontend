import { Component, inject, OnInit, signal } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as jwt_decode from 'jwt-decode';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { RecoveryCodesComponent } from '@shared/components/reusables/recovery-codes/recovery-codes.component';
import { MfaStatusResponse } from 'src/app/public/pages/login/models/login.interface';
import { MfaService } from '../../services/mfa.service';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { CurrentUserProfileService } from '@shared/service/current-user-profile.service';

/**
 * Mi perfil → Seguridad (Fase 12a): estado del MFA, códigos restantes, regenerar códigos
 * de recuperación y acceso al cambio de contraseña. No hay opción de desactivar el MFA.
 */
@Component({
  selector: 'app-security',
  imports: [SharedModule, RecoveryCodesComponent],
  templateUrl: './security.component.html'
})
export class SecurityComponent implements OnInit {
  activeModal = inject(NgbActiveModal);
  private modalService = inject(NgbModal);
  private mfaService = inject(MfaService);
  private alertModalService = inject(AlertModalService);
  private profile = inject(CurrentUserProfileService);

  readonly loading = signal(true);
  readonly status = signal<MfaStatusResponse | null>(null);
  readonly regenerating = signal(false);
  readonly showRegenerate = signal(false);
  readonly code = signal('');
  readonly newCodes = signal<string[]>([]);

  userId = '';
  userName = '';

  ngOnInit(): void {
    this.readUserFromToken();
    this.loadStatus();
  }

  loadStatus(): void {
    this.loading.set(true);
    this.mfaService.status().subscribe({
      next: (resp) => {
        this.loading.set(false);
        if (resp.succeeded) {
          this.status.set(resp.data as MfaStatusResponse);
        } else {
          this.alertModalService.showNotification('Atención', this.text(resp.messages), 'warning');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.alertModalService.showNotification('Atención', this.text(err?.error?.messages), 'warning');
      }
    });
  }

  startRegenerate(): void {
    this.newCodes.set([]);
    this.code.set('');
    this.showRegenerate.set(true);
  }

  cancelRegenerate(): void {
    this.code.set('');
    this.showRegenerate.set(false);
  }

  onCodeInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const digits = (el.value ?? '').replace(/\D/g, '').slice(0, 6);
    el.value = digits;
    this.code.set(digits);
  }

  async regenerate(): Promise<void> {
    if (this.code().length !== 6 || this.regenerating()) {
      return;
    }
    const confirmed = await this.alertModalService.show({
      title: '¿Generar nuevos códigos de recuperación?',
      message: 'Los códigos anteriores dejarán de servir.',
      type: 'warning',
      showCancel: true,
      confirmText: 'Sí, generar',
      cancelText: 'Cancelar'
    });
    if (!confirmed) {
      return;
    }

    this.regenerating.set(true);
    this.mfaService.regenerateRecoveryCodes(this.code()).subscribe({
      next: (resp) => {
        this.regenerating.set(false);
        this.code.set('');
        if (resp.succeeded && Array.isArray(resp.data)) {
          this.newCodes.set(resp.data as string[]);
          this.showRegenerate.set(false);
          this.status.update((s) => (s ? { ...s, recoveryCodesLeft: (resp.data as string[]).length } : s));
        } else {
          this.alertModalService.showNotification('Atención', this.text(resp.messages), 'warning');
        }
      },
      error: (err) => {
        this.regenerating.set(false);
        this.code.set('');
        this.alertModalService.showNotification('Atención', this.text(err?.error?.messages), 'warning');
      }
    });
  }

  openChangePassword(): void {
    const modalRef = this.modalService.open(ChangePasswordComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
      scrollable: true
    });
    modalRef.componentInstance.userId = this.userId;
  }

  private readUserFromToken(): void {
    try {
      const stored = localStorage.getItem('token');
      if (!stored) {
        return;
      }
      let token = stored;
      try {
        const parsed = JSON.parse(stored);
        token = typeof parsed === 'string' ? parsed : stored;
      } catch {
        token = stored;
      }
      const decoded: any = jwt_decode.jwtDecode(token);
      this.userId = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '';
      // El usuario ya no va en el JWT (sin datos personales): sale del perfil (GET identity/account/me).
      this.userName = this.profile.profile()?.userName ?? '';
    } catch {
      this.userId = '';
    }
  }

  private text(messages: unknown): string {
    if (Array.isArray(messages) && messages.length) {
      return messages.join(' ');
    }
    return messages ? String(messages) : 'No se pudo completar la operación.';
  }
}
