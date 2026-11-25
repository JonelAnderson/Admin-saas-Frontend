import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import {
  ApiTenant, InviteToPortalRequest, IssuerResponse, LinkIssuerRequest, PortalAccessResponse, PortalSettings, REMOTE_ACTION_BADGE,
  RemoteActionResponse, RemoteActionStatus, utcToLima
} from '../models/api-sunat.models';

/** Arma la URL de un listado como espera app-list-table (records / numPage / filtros / cursor). */
function listUrl(path: string, size: number, page: number, getInputs: string, lastId?: number): string {
  let url = `${env.apiUrl}${path}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
  if (lastId) {
    url += `&lastId=${lastId}`;
  }
  return url;
}

function rows<T>(data: BaseResponse): T[] {
  if (!Array.isArray(data.data)) {
    data.data = [];
  }
  return data.data as T[];
}

// ---------------------------------------------------------------- Emisores
@Injectable({ providedIn: 'root' })
export class ApiSunatIssuerService {
  private http = inject(HttpClient);

  static decorate(i: IssuerResponse): IssuerResponse {
    i.customerText = `${i.customerName} (${i.customerRuc})`;
    i.issuerText = `${i.businessName} (${i.ruc})`;
    i.usageText = i.documentsThisMonth != null ? `${i.documentsThisMonth} / ${i.maxDocumentsMonth ?? '∞'}` : '';
    i.syncedText = utcToLima(i.lastSyncedOnUtc);
    if (i.planPending && !i.syncPending && !i.suspendApplied) {
      i.stateName = `Plan ${i.desiredPlan} en camino`;
      i.badgeColor = 'badge-light-warning';
    } else if (i.syncPending) {
      i.stateName = i.suspendDesired ? 'Suspensión en camino' : 'Reactivación en camino';
      i.badgeColor = 'badge-light-warning';
    } else if (i.suspendApplied) {
      i.stateName = 'Emisión suspendida';
      i.badgeColor = 'badge-light-danger';
    } else {
      i.stateName = 'Emite';
      i.badgeColor = 'badge-light-success';
    }
    return i;
  }

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.API_SUNAT_ISSUER, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<IssuerResponse>(data).forEach(ApiSunatIssuerService.decorate);
        return data;
      })
    );
  }

  /** Busca empresas en la API SUNAT (por RUC o razón social; máx. 30) para vincularlas. */
  searchTenants(text: string): Observable<ApiTenant[]> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.API_SUNAT_ISSUER_TENANTS}?text=${encodeURIComponent(text ?? '')}`).pipe(
      map((resp) => ((resp.succeeded && Array.isArray(resp.data) ? resp.data : []) as ApiTenant[])
        .map((t) => ({ ...t, label: `${t.ruc} · ${t.businessName}` })))
    );
  }

  link(body: LinkIssuerRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.API_SUNAT_ISSUER_LINK}`, { linkIssuerRequestDto: body });
  }

  sync(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.API_SUNAT_ISSUER_SYNC}${id}`, {});
  }

  unlink(id: number): Observable<BaseResponse> {
    return this.http.delete<BaseResponse>(`${env.apiUrl}${endpoint.API_SUNAT_ISSUER}/${id}`);
  }
}

// ---------------------------------------------------------------- Portal de clientes (acceso por invitación)
@Injectable({ providedIn: 'root' })
export class PortalAccessService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.PORTAL_ACCESS, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<PortalAccessResponse>(data).forEach((a) => {
          a.badgeColor = REMOTE_ACTION_BADGE[a.status] ?? 'badge-light-secondary';
          a.customerText = `${a.customerName} (${a.customerRuc})`;
          a.personText = `${a.name} · ${a.email}`;
          a.issuersText = a.issuers.map((i) => `${i.businessName} (${i.ruc})`).join(', ');
          a.accessText = !a.invited ? 'Sin usuario aún' : a.isEnabled ? 'Habilitado' : 'Deshabilitado';
          a.invitedText = utcToLima(a.invitedOnUtc);
          // Mientras algo está en camino, el estado dice qué: "Invitar: Pendiente".
          a.stateText = a.status === RemoteActionStatus.Done ? 'Al día' : `${a.workTypeName}: ${a.statusName}`;
          a.nextText = a.status === RemoteActionStatus.Pending || a.status === RemoteActionStatus.Failed ? utcToLima(a.nextAttemptOnUtc) : '';
        });
        return data;
      })
    );
  }

  settings(): Observable<PortalSettings> {
    return this.http.get<PortalSettings>(`${env.apiUrl}${endpoint.PORTAL_ACCESS_SETTINGS}`);
  }

  /** Invita o reinvita (el correo identifica el acceso): el enlace de activación le llega por correo. */
  invite(body: InviteToPortalRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.PORTAL_ACCESS_INVITE}`, body);
  }

  setEnabled(id: number, enabled: boolean): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.PORTAL_ACCESS}/${id}/Enabled/${enabled}`, {});
  }

  retry(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.PORTAL_ACCESS_RETRY}${id}`, {});
  }
}

// ---------------------------------------------------------------- Acciones remotas
@Injectable({ providedIn: 'root' })
export class RemoteActionService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.REMOTE_ACTION, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<RemoteActionResponse>(data).forEach((a) => {
          a.badgeColor = REMOTE_ACTION_BADGE[a.status] ?? 'badge-light-secondary';
          a.issuerText = `${a.issuerName} (${a.issuerRuc})`;
          a.createdText = utcToLima(a.createdOn);
          a.attemptsText = String(a.attempts);
          // La próxima hora solo importa mientras la acción espera su turno.
          a.nextText = a.status === RemoteActionStatus.Pending || a.status === RemoteActionStatus.Failed ? utcToLima(a.nextAttemptOnUtc) : '';
        });
        return data;
      })
    );
  }

  retry(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.REMOTE_ACTION_RETRY}${id}`, {});
  }
}
