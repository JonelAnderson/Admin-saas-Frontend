import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { AuditTrail, decorateAuditTrail } from './audit-trail.models';

/** Pista de auditoría (solo SuperAdmin). `GetAll` es la fuente de app-list-table. */
@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  constructor(private http: HttpClient) {}

  GetAll(size: number, page: number, getInputs: string): Observable<BaseResponse> {
    const url = `${env.apiUrl}${endpoint.AUDIT_TRAILS}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
    return this.http.get<BaseResponse>(url).pipe(
      map((resp) => {
        resp.data = Array.isArray(resp.data) ? (resp.data as AuditTrail[]).map(decorateAuditTrail) : [];
        return resp;
      })
    );
  }

  /** Entidades con filas en la pista, para el filtro. */
  tables(): Observable<{ id: string; name: string }[]> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.AUDIT_TABLES}`).pipe(
      map((resp) => (resp?.succeeded && Array.isArray(resp.data) ? (resp.data as string[]).map((t) => ({ id: t, name: t })) : [])),
      catchError(() => of([]))
    );
  }
}
