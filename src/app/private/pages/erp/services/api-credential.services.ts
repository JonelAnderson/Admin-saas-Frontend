import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { utcToLima } from '../../api-sunat/models/api-sunat.models';
import {
  API_CREDENTIAL_BADGE, ApiCredentialDeliveryResponse, ApiCredentialDeliveryStatus, ApiCredentialSettings, CreateApiCredentialDeliveryRequest
} from '../models/api-credential.models';

/** Entrega de las credenciales de la API SUNAT a la instancia del ERP de un cliente: pedir, reintentar, cancelar y ver su estado. */
@Injectable({ providedIn: 'root' })
export class ApiCredentialService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    let url = `${env.apiUrl}${endpoint.API_CREDENTIAL}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
    if (lastId) {
      url += `&lastId=${lastId}`;
    }
    return this.http.get<BaseResponse>(url).pipe(
      map((data) => {
        if (!Array.isArray(data.data)) {
          data.data = [];
        }
        (data.data as ApiCredentialDeliveryResponse[]).forEach((d) => {
          d.badgeColor = API_CREDENTIAL_BADGE[d.status] ?? 'badge-light-secondary';
          d.createdText = utcToLima(d.createdOn);
          d.instanceText = `${d.customerName} · ${d.instanceName}`;
          d.issuerText = `${d.issuerName} (${d.issuerRuc})`;
          d.detailText = this.detail(d);
        });
        return data;
      })
    );
  }

  /** Lo que el operador necesita saber de cada estado, sin mostrar nunca credenciales. */
  private detail(d: ApiCredentialDeliveryResponse): string {
    switch (d.status) {
      case ApiCredentialDeliveryStatus.Ready:
        return d.waitingForErp
          ? `Sin recoger por el ERP · vence ${utcToLima(d.expiresOnUtc)}`
          : `El ERP ya la vio, falta su confirmación · vence ${utcToLima(d.expiresOnUtc)}`;
      case ApiCredentialDeliveryStatus.Delivered:
        return `Entregada ${utcToLima(d.deliveredOnUtc)}`;
      case ApiCredentialDeliveryStatus.Pending:
      case ApiCredentialDeliveryStatus.Failed:
        return `Próximo intento ${utcToLima(d.nextAttemptOnUtc)}`;
      default:
        return '';
    }
  }

  /** Respuesta directa (sin el sobre Result): si la API SUNAT tiene dirección pública; nada secreto. */
  settings(): Observable<ApiCredentialSettings> {
    return this.http.get<ApiCredentialSettings>(`${env.apiUrl}${endpoint.API_CREDENTIAL_SETTINGS}`);
  }

  create(body: CreateApiCredentialDeliveryRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.API_CREDENTIAL}`, { createApiCredentialDeliveryRequestDto: body });
  }

  retry(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.API_CREDENTIAL_RETRY}${id}`, {});
  }

  cancel(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.API_CREDENTIAL_CANCEL}${id}`, {});
  }
}
