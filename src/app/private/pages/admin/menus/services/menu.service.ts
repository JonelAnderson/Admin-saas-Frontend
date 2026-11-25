import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { map, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { MenuResponse } from '../models/menu-response.interface';
import { MenuRequest } from '../models/menu-request.interface';
import { MenuEditRequest } from '../models/menu-edit-request.interface';
import { NavigationItem } from '../models/navigation-response';
import { MenuNavApiItem } from '@shared/models/menu-nav-api.interface';
import { mapMenuNavApiToNavigation } from '@shared/mappers/menu-nav.mapper';
import { PermissionService } from '@shared/service/permission.service';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private navigationSubject = new BehaviorSubject<NavigationItem[]>([]);
  public navigation$ = this.navigationSubject.asObservable();

  constructor(
    private _http: HttpClient,
    private permissionService: PermissionService
  ) {
    // El menú del usuario vive solo en memoria (ya no en localStorage): SessionBootstrapService lo pide a la API al iniciar
    // sesión y al recargar la página.
  }

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    let requestUrl = `${env.apiUrl}${endpoint.LIST_MENU}?records=${size}&numPage=${page + 1}${getInputs}`;

    if (lastId) {
      requestUrl += `&lastId=${lastId}`;
    }

    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((resp: BaseResponse) => {
        if (!Array.isArray(resp.data)) {
          resp.data = [];
          return resp;
        }
        resp.data.forEach((e: MenuResponse) => {
          switch (e.isActive) {
            case false:
              e.badgeColor = 'badge-light-danger';
              break;
            case true:
              e.badgeColor = 'badge-light-success';
              break;
            default:
              e.badgeColor = 'badge-light-dark';
              break;
          }
        });
        return resp;
      })
    );
  }

  menuById(id: number): Observable<MenuResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_BY_ID}${id}`;
    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp.data;
      })
    );
  }

  menuRegister(menu: MenuRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_REGISTER}`;
    return this._http.post(requestUrl, menu).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  menuUpdate(menu: MenuEditRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_EDIT}`;
    return this._http.put(requestUrl, menu).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  menuDelete(id: number): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_REMOVE}${id}`;
    return this._http.delete(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  /** @deprecated Prefer loadUserNavigation() - maps API DTO to template NavigationItem. */
  getNavMenu(): Observable<NavigationItem[]> {
    return this.loadUserNavigation();
  }

  loadUserNavigation(): Observable<NavigationItem[]> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_NAV}`;
    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((resp: BaseResponse) => mapMenuNavApiToNavigation(resp.data as MenuNavApiItem[])),
      tap((data: NavigationItem[]) => {
        this.navigationSubject.next(data);
      })
    );
  }

  setNavigationFromCache(raw: unknown): void {
    if (!Array.isArray(raw)) {
      this.navigationSubject.next([]);
      return;
    }
    const first = raw[0] as NavigationItem | MenuNavApiItem | undefined;
    if (first && typeof (first as NavigationItem).id === 'string') {
      this.navigationSubject.next(raw as NavigationItem[]);
      return;
    }
    this.navigationSubject.next(mapMenuNavApiToNavigation(raw as MenuNavApiItem[]));
  }

  menuChangeState(id: number): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENU_CHANGE_STATE}${id}`;
    return this._http.put<BaseResponse>(requestUrl, {});
  }

  menuSelect(): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LIST_SELECT_MENU}`;
    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((resp: BaseResponse) => {
        if (!Array.isArray(resp.data)) {
          resp.data = [];
        }
        return resp;
      })
    );
  }
}
