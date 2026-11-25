import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { InstanceForm, InstanceResponse, LicenseStatus } from '../models/erp.models';
import { utcToLima } from '../../api-sunat/models/api-sunat.models';

/** Instancias del ERP de los clientes y su clave de licencia. */
@Injectable({ providedIn: 'root' })
export class InstanceService {
  private http = inject(HttpClient);

  static decorate(i: InstanceResponse): InstanceResponse {
    i.customerText = `${i.customerName} (${i.customerRuc})`;
    i.licenseText = i.licenseStatusName;
    i.contactText = i.lastContactOnUtc ? `${i.contactName} · ${utcToLima(i.lastContactOnUtc)}` : i.contactName;
    i.usageText = i.companies != null
      ? `${i.companies} emp. · ${i.users ?? '?'} usu. · ${i.branches ?? '?'} suc. · ${i.documentsThisMonth ?? '?'} doc.`
      : '';
    i.keyText = `…${i.licenseKeyHint}`;
    i.stackText = i.isProvisioned ? `Consola${i.deployedVersion ? ` v${i.deployedVersion}` : ' (montando)'}` : 'Manual';
    i.badgeColor = i.licenseStatus === LicenseStatus.Active ? 'badge-light-success'
      : i.licenseStatus === LicenseStatus.Grace ? 'badge-light-warning' : 'badge-light-danger';
    return i;
  }

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    let url = `${env.apiUrl}${endpoint.INSTANCE}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
    if (lastId) {
      url += `&lastId=${lastId}`;
    }
    return this.http.get<BaseResponse>(url).pipe(
      map((data) => {
        if (!Array.isArray(data.data)) {
          data.data = [];
        }
        (data.data as InstanceResponse[]).forEach(InstanceService.decorate);
        return data;
      })
    );
  }

  create(body: InstanceForm): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.INSTANCE_CREATE}`, { createInstanceRequestDto: body });
  }

  update(id: number, body: InstanceForm): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.INSTANCE_UPDATE}`, {
      updateInstanceRequestDto: { id, name: body.name, url: body.url, server: body.server, notes: body.notes }
    });
  }

  rotateKey(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.INSTANCE_ROTATE_KEY}${id}`, {});
  }

  delete(id: number): Observable<BaseResponse> {
    return this.http.delete<BaseResponse>(`${env.apiUrl}${endpoint.INSTANCE}/${id}`);
  }
}
