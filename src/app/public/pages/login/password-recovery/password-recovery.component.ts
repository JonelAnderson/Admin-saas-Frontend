import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { AuthService } from '../services/auth.service';

type RecoveryMode = 'forgot' | 'reset';

/** Reglas de la contraseña (ErpIdentitySetup + ErpPasswordValidator): 8–16 con mayúscula, minúscula, número y especial. */
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'Entre 8 y 16 caracteres', test: (p) => p.length >= 8 && p.length <= 16 },
  { label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p) => /\d/.test(p) },
  { label: 'Un carácter especial (# $ % & ...)', test: (p) => /[^a-zA-Z0-9]/.test(p) }
];

/**
 * Recuperación de contraseña sin sesión:
 * - forgot: pide el correo y envía el enlace (la respuesta es la misma exista o no la cuenta).
 * - reset: llega desde el enlace del correo (account/reset-password?Token=...), pide correo y nueva contraseña.
 */
@Component({
  selector: 'app-password-recovery',
  templateUrl: './password-recovery.component.html',
  styleUrls: ['../sign-in/sign-in.component.scss', './password-recovery.component.scss'],
  imports: [FormsModule, NgClass, RouterLink]
})
export class PasswordRecoveryComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly mode: RecoveryMode = this.route.snapshot.data['mode'] === 'reset' ? 'reset' : 'forgot';
  /** Token tal como vino en el enlace (Base64Url); el servidor lo decodifica. */
  readonly token = this.route.snapshot.queryParamMap.get('Token') ?? this.route.snapshot.queryParamMap.get('token') ?? '';

  readonly rules = PASSWORD_RULES;
  email = signal('');
  password = signal('');
  confirm = signal('');
  showPassword = signal(false);
  showConfirm = signal(false);
  isLoading = signal(false);
  /** Mensaje de éxito (correo enviado / contraseña cambiada). */
  done = signal<string | null>(null);
  error = signal<string | null>(null);

  readonly emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim()));
  readonly passwordValid = computed(() => this.rules.every((r) => r.test(this.password())));
  readonly confirmMatches = computed(() => this.confirm().length > 0 && this.confirm() === this.password());
  readonly canSubmit = computed(() =>
    !this.isLoading() && this.emailValid() && (this.mode === 'forgot' || (this.passwordValid() && this.confirmMatches()))
  );

  constructor(title: CustomTitleService) {
    title.set(this.mode === 'reset' ? 'RESTABLECER CONTRASEÑA' : 'RECUPERAR CONTRASEÑA');
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const email = this.email().trim();
      const response =
        this.mode === 'forgot'
          ? await firstValueFrom(this.auth.forgotPassword(email))
          : await firstValueFrom(
              this.auth.resetPassword({ email, token: this.token, password: this.password(), confirmPassword: this.confirm() })
            );
      if (response?.succeeded) {
        this.done.set(this.messageOf(response) ?? (this.mode === 'forgot'
          ? 'Si el correo está registrado, le enviaremos un enlace para restablecer la contraseña.'
          : 'Su contraseña se cambió. Ya puede iniciar sesión con la nueva.'));
        this.password.set('');
        this.confirm.set('');
      } else {
        this.error.set(this.messageOf(response) ?? 'No se pudo completar la solicitud.');
      }
    } catch (e) {
      const body = e instanceof HttpErrorResponse ? (e.error as BaseResponse | null) : null;
      this.error.set(this.messageOf(body) ?? 'No se pudo conectar con el servidor. Intente de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/sign-in']);
  }

  private messageOf(response: BaseResponse | null | undefined): string | null {
    const messages = response?.messages;
    if (Array.isArray(messages)) return messages.filter(Boolean).join(' ') || null;
    return typeof messages === 'string' && messages ? messages : null;
  }
}
