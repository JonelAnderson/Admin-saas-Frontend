
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class PreferenceService {

  constructor(private http: HttpClient) { }

  changeLanguage(languageCode: string): Observable<BaseResponse> {
    const requestUrl = `${env.apiUrl}${endpoint.PREFERENCES_CHANGE_LANGUAGE}?languageCode=${languageCode}`;
    return this.http.post<BaseResponse>(requestUrl, {});
  }
}
