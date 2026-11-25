import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  /** Tablero de Inicio: `data` trae un `Dashboard` (ver dashboard.models.ts). */
  get(): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.DASHBOARD}`);
  }
}
