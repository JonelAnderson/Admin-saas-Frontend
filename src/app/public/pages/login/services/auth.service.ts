import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint, httpOptions } from '@shared/apis/endpoint';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as jwt_decode from 'jwt-decode';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { Login, MfaStage, TokenResponse } from '../models/login.interface';
import { SessionBootstrapService } from '@shared/service/session-bootstrap.service';

/** Motivo del cierre de sesión: se muestra una vez en el login (sobrevive al reload, no a cerrar la pestaña). */
const LOGOUT_REASON_KEY = 'erp.logoutReason';

/**
 * Token del dispositivo recordado: tras ingresar el código con "Recordar este dispositivo", el login desde este navegador pide
 * solo usuario y contraseña, salvo que pasen 7 días sin entrar. Sobrevive al cierre de sesión (no es una sesión).
 */
const DEVICE_TOKEN_KEY = 'erp.deviceToken';

/** Se renueva el token de acceso (30 min) cuando le quedan menos de 2 minutos. */
const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export const SESSION_EXPIRED_MESSAGE = 'Su sesión venció o se cerró desde otro dispositivo. Inicie sesión nuevamente.';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user: BehaviorSubject<BaseResponse>;

  /** Renovación en curso: todas las peticiones que la necesiten esperan la misma (un solo POST de refresh). */
  private refreshInFlight$: Observable<string> | null = null;
  private loggingOut = false;

  /**
   * Ticket del login en dos pasos (Fase 12a). Vive SOLO en memoria:
   * nunca se escribe en localStorage ni sessionStorage. Vence en el servidor a los 5 minutos.
   */
  private readonly _mfaTicket = signal<string | null>(null);
  private readonly _mfaStage = signal<MfaStage | null>(null);
  readonly mfaStage = this._mfaStage.asReadonly();

  /** Casilla "Recordar este dispositivo" del paso del código (marcada por defecto). */
  readonly rememberDevice = signal(true);

  constructor(
    private http: HttpClient,
    private _router: Router,
    private sessionBootstrap: SessionBootstrapService
  ) {
    if (typeof window !== 'undefined') {
      const storedToken = this.accessToken();
      this.user = new BehaviorSubject<BaseResponse>((storedToken as any) || null);
    }
  }

  /**
   * Paso 1: usuario + contraseña. Solo guarda la sesión cuando la respuesta trae `token`;
   * si trae `mfaRequired` / `mfaSetupRequired`, guarda el ticket en memoria para el paso 2.
   */
  login(req: Login): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN}`;
    this.clearMfa();

    const body = { ...req, deviceToken: readDeviceToken() };
    return this.http.post<BaseResponse>(requestUrl, body, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /** Paso 2 (usuario con MFA): código de 6 dígitos o código de recuperación. */
  verifyMfa(payload: { code?: string; recoveryCode?: string }): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA}`;
    const body = { mfaTicket: this._mfaTicket() ?? '', ...payload, ...this.deviceFields() };
    return this.http.post<BaseResponse>(requestUrl, body, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /** "Olvidé mi contraseña": la respuesta es la misma exista o no el correo. */
  forgotPassword(email: string): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.FORGOT_PASSWORD}`, { email }, httpOptions);
  }

  /** Nueva contraseña con el token del enlace del correo (se envía tal como llegó). */
  resetPassword(body: { email: string; token: string; password: string; confirmPassword: string }): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.RESET_PASSWORD}`, body, httpOptions);
  }

  /** Enrolamiento: genera (o regenera) la clave y el URI otpauth. */
  mfaSetup(): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA_SETUP}`;
    return this.http
      .post<BaseResponse>(requestUrl, { mfaTicket: this._mfaTicket() ?? '' }, httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Enrolamiento: confirma el primer código; devuelve token + códigos de recuperación. */
  mfaSetupConfirm(code: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LOGIN_MFA_SETUP_CONFIRM}`;
    const body = { mfaTicket: this._mfaTicket() ?? '', code, ...this.deviceFields() };
    return this.http.post<BaseResponse>(requestUrl, body, httpOptions).pipe(
      map((resp: BaseResponse) => this.handleTokenResponse(resp)),
      catchError(this.handleError)
    );
  }

  /** Olvida el ticket del login en dos pasos. */
  clearMfa(): void {
    this._mfaTicket.set(null);
    this._mfaStage.set(null);
  }

  /** true si el mensaje del servidor indica que el ticket venció o ya no sirve. */
  isMfaTicketExpiredMessage(message: unknown): boolean {
    const text = (Array.isArray(message) ? message.join(' ') : String(message ?? '')).toLowerCase();
    return text.includes('venció') || text.includes('vencio') || text.includes('vuelva a iniciar sesión') || text.includes('expired');
  }

  /** Pide recordar el dispositivo (con un nombre para reconocerlo) si la casilla está marcada. */
  private deviceFields(): { rememberDevice: boolean; deviceLabel: string } {
    return { rememberDevice: this.rememberDevice(), deviceLabel: deviceLabel() };
  }

  private handleTokenResponse(resp: BaseResponse): BaseResponse {
    const data = (resp?.data ?? null) as TokenResponse | null;
    if (resp?.succeeded && data?.deviceToken) {
      try {
        localStorage.setItem(DEVICE_TOKEN_KEY, data.deviceToken);
      } catch {
        // sin localStorage el próximo login vuelve a pedir el código
      }
    }
    if (resp?.succeeded && data) {
      if (data.token) {
        this.clearMfa();
        this.saveSession(data);
      } else if (data.mfaTicket && (data.mfaRequired || data.mfaSetupRequired)) {
        this._mfaTicket.set(data.mfaTicket);
        this._mfaStage.set(data.mfaRequired ? 'verify' : 'setup');
      }
    }
    return resp;
  }

  /** Login completo: guarda los tokens y carga permisos, menú y contexto. */
  private saveSession(data: TokenResponse): void {
    this.storeTokens(data.token, data.refreshToken);
    this.sessionBootstrap.bootstrap().subscribe();
  }

  /** Mismo formato de siempre (JSON.stringify): los demás lectores de 'token' lo parsean. */
  private storeTokens(token: string, refreshToken: string | null | undefined): void {
    const decodedToken: any = jwt_decode.jwtDecode(token);
    const expTimestamp = decodedToken['exp'] * 1000;

    localStorage.setItem('token', JSON.stringify(token));
    if (refreshToken) {
      localStorage.setItem('refreshToken', JSON.stringify(refreshToken));
    }
    localStorage.setItem('tokenExpiryTime', expTimestamp.toString());

    this.user?.next(token as any);
  }

  public get userToken(): BaseResponse {
    if (this.user != null) {
      return this.user?.value || null;
    } else {
      return null;
    }
  }

  /** Token de acceso guardado (sin las comillas del JSON.stringify). */
  accessToken(): string | null {
    return readStored('token');
  }

  private refreshTokenValue(): string | null {
    return readStored('refreshToken');
  }

  /** true si al token le quedan menos de 2 minutos (o ya venció): hay que renovarlo antes de usarlo. */
  shouldRefresh(): boolean {
    const raw = localStorage.getItem('tokenExpiryTime');
    const expiry = raw ? parseInt(raw, 10) : NaN;
    return !Number.isFinite(expiry) || Date.now() >= expiry - REFRESH_MARGIN_MS;
  }

  isTokenExpired(tokenExpiryTime: number): boolean {
    return Date.now() > tokenExpiryTime;
  }

  /**
   * Renueva el token de acceso con el refresh token (que también rota). Una sola petición a la vez: las demás esperan
   * su resultado. Si falla pero otra pestaña ya guardó un token nuevo, se usa ese.
   */
  refreshSession(): Observable<string> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const token = this.accessToken();
    const refreshToken = this.refreshTokenValue();
    if (!token || !refreshToken) {
      return throwError(() => new Error(SESSION_EXPIRED_MESSAGE));
    }

    const requestUrl = `${env.apiUrl}${endpoint.REFRSHTOKEN}`;
    this.refreshInFlight$ = this.http.post<BaseResponse>(requestUrl, { token, refreshToken }, httpOptions).pipe(
      switchMap((resp: BaseResponse) => {
        const data = resp?.data as TokenResponse | null;
        if (!resp?.succeeded || !data?.token) {
          return throwError(() => new Error(SESSION_EXPIRED_MESSAGE));
        }
        this.storeTokens(data.token, data.refreshToken);
        return of(data.token);
      }),
      catchError((error) => {
        const current = this.accessToken();
        // Otra pestaña renovó primero (el refresh token rota): su token nuevo sirve aquí también.
        if (current && current !== token && !this.shouldRefresh()) {
          return of(current);
        }
        return throwError(() => error);
      }),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight$;
  }

  /**
   * Cerrar sesión: avisa al servidor (borra el refresh token y revoca los tokens de TODOS los dispositivos del usuario)
   * y limpia este navegador. Con `notifyServer = false` solo limpia (la sesión ya no vale en el servidor).
   */
  logout(reason?: string, notifyServer = true) {
    if (this.loggingOut) {
      return;
    }
    this.loggingOut = true;

    const token = this.accessToken();
    if (notifyServer && token && typeof fetch !== 'undefined') {
      // keepalive: la petición sigue aunque la página se recargue enseguida.
      fetch(`${env.apiUrl}${endpoint.LOGOUT}`, {
        method: 'POST',
        keepalive: true,
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => undefined);
    }

    this.clearMfa();
    // Se borra todo menos el dispositivo recordado: cerrar sesión no obliga a pedir el código en el próximo login.
    const device = readDeviceToken();
    localStorage.clear();
    if (device) {
      localStorage.setItem(DEVICE_TOKEN_KEY, device);
    }
    // El estado de la pestaña (sesión POS, carrito, ids entre pantallas) es del usuario que sale: el siguiente no lo hereda.
    try {
      sessionStorage.clear();
    } catch {
      // sin sessionStorage no hay nada que limpiar
    }
    if (reason) {
      try {
        sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
      } catch {
        // sin sessionStorage el login solo no muestra el motivo
      }
    }
    this.user?.next(null);
    this._router.navigate(['login']);
    window.location.reload();
  }

  /** Motivo del último cierre de sesión (se lee una sola vez). */
  consumeLogoutReason(): string | null {
    try {
      const reason = sessionStorage.getItem(LOGOUT_REASON_KEY);
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
      return reason;
    } catch {
      return null;
    }
  }

  private handleError(error: any) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error?.error?.messages ? error.error.messages[0] : 'Server Error';
    }
    return throwError(() => new Error(errorMessage));
  }
}

function readDeviceToken(): string | null {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** "Chrome en Windows", "Safari en iPhone"…: solo para que el usuario reconozca el dispositivo. */
function deviceLabel(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser = ua.includes('Edg/') ? 'Edge' : ua.includes('OPR/') ? 'Opera' : ua.includes('Firefox/') ? 'Firefox'
    : ua.includes('Chrome/') ? 'Chrome' : ua.includes('Safari/') ? 'Safari' : 'Navegador';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone / iPad'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'otro sistema';
  return `${browser} en ${os}`;
}

/** Lee un token de localStorage: se guarda con JSON.stringify, pero se acepta también el valor plano. */
function readStored(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const stored = localStorage.getItem(key);
  if (!stored) {
    return null;
  }
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : stored;
  } catch {
    return stored;
  }
}
