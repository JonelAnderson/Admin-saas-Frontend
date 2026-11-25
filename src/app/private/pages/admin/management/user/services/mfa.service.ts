import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from 'src/environments/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';

/** Verificación en dos pasos del usuario conectado (Fase 12a, ruta base api/identity/mfa). */
@Injectable({
  providedIn: 'root'
})
export class MfaService {
  constructor(private _http: HttpClient) {}

  /** Result<MfaStatusResponse> { enabled, recoveryCodesLeft }. */
  status(): Observable<BaseResponse> {
    return this._http.get<BaseResponse>(`${env.apiUrl}${endpoint.MFA_STATUS}`);
  }

  /** Result<string[]> con 10 códigos nuevos; pide el código actual de la app. */
  regenerateRecoveryCodes(code: string): Observable<BaseResponse> {
    return this._http.post<BaseResponse>(`${env.apiUrl}${endpoint.MFA_RECOVERY_CODES}`, { code });
  }
}
