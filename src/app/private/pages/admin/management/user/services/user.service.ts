import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, firstValueFrom } from "rxjs";
import { environment as env } from "src/environments/environment";
import { endpoint } from "@shared/apis/endpoint";
import { map } from "rxjs/operators";
import {BaseResponse} from "@shared/models/base-api-response.interface";
import { UserResponse } from "../models/user-response.interface"; 
import { ChangePasswordRequest, UpdateProfileRequest, UserRequest, UserUpdateRequest } from "../models/user-request.interface"; 

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private _http: HttpClient) { 
   
  }

  GetAll(size,  page, getInputs, lastId?: string): Observable<BaseResponse> {
    let requestUrl = `${env.apiUrl}${endpoint.LIST_USERS}?records=${size}&numPage=${page + 1}${getInputs}`;

    if (lastId) {
      requestUrl += `&lastStringValue=${lastId}`;
    }

    return this._http.get<BaseResponse>(requestUrl).pipe(
      map((data: BaseResponse) => {
        data.data.forEach(function (e: UserResponse) {
          // Fase 12a: MFA y bloqueo por intentos fallidos.
          e.mfaStatus = e.mfaEnabled ? 'Activo' : 'Pendiente';
          e.badgeColorTwo = e.mfaEnabled ? 'bg-success' : 'bg-warning text-dark';
          const lockedUntil = e.lockedUntil ? new Date(e.lockedUntil) : null;
          e.isLocked = !!lockedUntil && !isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now();
          e.lockedUntilText = e.isLocked
            ? `Hasta ${lockedUntil.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : '-';
          switch (e.isActive) {
            case false: 
              e.badgeColor = 'bg-danger';
              break;
            case true:
              e.badgeColor = 'bg-success';
              break;
            default:
              e.badgeColor = 'bg-light text-dark';
              break;
          }
        });
        return data;
      })
    );
  }

  userSelect(): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.SELECT_LIST_USERS}`;
    return this._http.get(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }
  
  userById(userId: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USER_BY_ID}${userId}`;
    return this._http.get(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  userRegister(user:  UserRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USER_REGISTER}`;
    return this._http.post(requestUrl, user).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }


  userRolesById(id: any): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USER_ROLES_BY_ID}${id}`;
    return this._http.get(requestUrl).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }


  userRolesUpdate(userId:string,userRoles: UserUpdateRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USER_ROLES_UPDATE_BY_ID}${userId}`;

    return this._http.put(requestUrl, userRoles).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }
 

  userChangeState(user: any): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USER_ACTIVATE}`;
    return this._http.post(requestUrl, user).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  /** Fase 12a: restablece el MFA de otro usuario (permiso Users.ResetMfa). */
  resetMfa(userId: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USERS_BASE}${encodeURIComponent(userId)}/mfa/reset`;
    return this._http.post<BaseResponse>(requestUrl, {});
  }

  /** Fase 12a: quita el bloqueo por intentos fallidos (permiso Users.ResetMfa). */
  unlock(userId: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.USERS_BASE}${encodeURIComponent(userId)}/unlock`;
    return this._http.post<BaseResponse>(requestUrl, {});
  }

  updateProfile(user:UpdateProfileRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.UPDATE_PROFILE}`;
    return this._http.put(requestUrl, user).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }

  /** Foto de perfil de un usuario, como archivo (multipart, campo "request"); va aparte del JSON de alta / edición. */
  uploadProfilePicture(userId: string, file: File): Observable<BaseResponse> {
    const body = new FormData();
    body.append('request', file, file.name);
    return this._http.post<BaseResponse>(`${env.apiUrl}${endpoint.USER_PROFILE_PICTURE}${encodeURIComponent(userId)}`, body);
  }

  /**
   * Sube la imagen elegida en el selector (data URL) después de guardar el usuario. Sin imagen nueva no hace nada.
   * Devuelve null si salió bien o un aviso si los datos se guardaron pero la foto no.
   */
  async saveSelectedPicture(userId: string | null | undefined,
    selection: { fileName?: string; fileType?: string; data?: string | ArrayBuffer } | null): Promise<string | null> {
    if (!userId || !selection?.data || typeof selection.data !== 'string' || !selection.data.startsWith('data:')) {
      return null;
    }
    const warning = 'Los datos se guardaron, pero la foto no se pudo subir. Inténtelo de nuevo desde Editar.';
    try {
      const blob = await (await fetch(selection.data)).blob();
      const file = new File([blob], selection.fileName || 'foto', { type: selection.fileType || blob.type });
      const resp = await firstValueFrom(this.uploadProfilePicture(userId, file));
      if (resp?.succeeded) {
        return null;
      }
      return Array.isArray(resp?.messages) && resp.messages.length ? resp.messages.join(' ') : warning;
    } catch {
      return warning;
    }
  }

  changePassword(user:ChangePasswordRequest): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.CHANGE_PASSWORD}`;
    return this._http.put(requestUrl, user).pipe(
      map((resp: BaseResponse) => {
        return resp;
      })
    );
  }
}
