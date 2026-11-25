import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { utcToLima } from '../../api-sunat/models/api-sunat.models';
import {
  DEPLOYMENT_BADGE, DeploymentResponse, DeploymentStatus, DeploymentType, ProvisionRequest, ProvisioningSettings, UpgradeRequest
} from '../models/deployment.models';

/** Despliegues de instancias del ERP en Coolify: montar, actualizar de versión y ver su avance. */
@Injectable({ providedIn: 'root' })
export class DeploymentService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    let url = `${env.apiUrl}${endpoint.DEPLOYMENT}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
    if (lastId) {
      url += `&lastId=${lastId}`;
    }
    return this.http.get<BaseResponse>(url).pipe(
      map((data) => {
        if (!Array.isArray(data.data)) {
          data.data = [];
        }
        (data.data as DeploymentResponse[]).forEach((d) => {
          d.badgeColor = DEPLOYMENT_BADGE[d.status] ?? 'badge-light-secondary';
          d.instanceText = `${d.customerName} · ${d.instanceName}`;
          d.stepText = d.type === DeploymentType.Create ? d.stepName : '';
          d.createdText = utcToLima(d.createdOn);
          // La próxima hora solo importa mientras el despliegue espera su turno.
          d.nextText = d.status === DeploymentStatus.Pending || d.status === DeploymentStatus.Failed ? utcToLima(d.nextAttemptOnUtc) : '';
        });
        return data;
      })
    );
  }

  /** Respuesta directa (sin el sobre Result): dominio base y versión sugerida; nada secreto. */
  settings(): Observable<ProvisioningSettings> {
    return this.http.get<ProvisioningSettings>(`${env.apiUrl}${endpoint.DEPLOYMENT_SETTINGS}`);
  }

  provision(body: ProvisionRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.DEPLOYMENT_PROVISION}`, { provisionInstanceRequestDto: body });
  }

  upgrade(body: UpgradeRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.DEPLOYMENT_UPGRADE}`, { upgradeInstanceRequestDto: body });
  }

  retry(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.DEPLOYMENT_RETRY}${id}`, {});
  }

  cancel(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.DEPLOYMENT_CANCEL}${id}`, {});
  }
}
