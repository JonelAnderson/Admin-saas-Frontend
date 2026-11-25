import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment as env } from "src/environments/environment";
import { endpoint } from "@shared/apis/endpoint";
import { map } from "rxjs/operators";
import { BaseResponse } from "@shared/models/base-api-response.interface";
import { RoleRequest } from "../models/role-request.interface";
import { PermissionRequest } from "../models/permission-request.interface";

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(private _http: HttpClient) { }

  GetAllList(): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.LIST_ROLE}`;
    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((data: BaseResponse) => {
        return data;
      }));
  }

  PermissionsByRoleId(id: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.PERMISSION_BY_ROLEID}${id}`;
    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((resp: BaseResponse) => {
        const data = resp?.data as Record<string, unknown> | undefined;
        if (data && !Array.isArray(data['roleClaims']) && Array.isArray(data['RoleClaims'])) {
          data['roleClaims'] = data['RoleClaims'];
        }
        return resp;
      })
    );
  }

  RoleRegister(role: RoleRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.ROLE_REGISTER}`;
   
    return this._http.post(requestUrl, role).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  RoleUpdate(role: PermissionRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.ROLE_UPDATE}`;
   
    return this._http.put(requestUrl, role).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  RoleDelete(id: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.ROLE_DELETE}${id}`;
    return this._http.delete(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  MenusByRoleId(id: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.MENUS_BY_ROLEID}${id}`;
    return this._http.get(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  RoleMenusUpdate(request: any): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.ROLE_MENUS_UPDATE}`;
    return this._http.put(requestUrl, request).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }
}
