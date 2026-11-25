import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { utcToLima } from '../../api-sunat/models/api-sunat.models';
import { NOTIFICATION_BADGE, NotificationResponse } from '../models/notification.models';

/** Bandeja de avisos por correo a los clientes (listado paginado y reintento). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    let url = `${env.apiUrl}${endpoint.NOTIFICATION}?records=${size}&numPage=${page + 1}${getInputs ?? ''}`;
    if (lastId) {
      url += `&lastId=${lastId}`;
    }
    return this.http.get<BaseResponse>(url).pipe(
      map((data) => {
        if (!Array.isArray(data.data)) {
          data.data = [];
        }
        (data.data as NotificationResponse[]).forEach((n) => {
          n.badgeColor = NOTIFICATION_BADGE[n.status] ?? 'badge-light-secondary';
          n.createdText = utcToLima(n.createdOn);
          n.sentText = utcToLima(n.sentOnUtc);
          n.attemptsText = String(n.attempts);
        });
        return data;
      })
    );
  }

  retry(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.NOTIFICATION_RETRY}${id}`, {});
  }
}
