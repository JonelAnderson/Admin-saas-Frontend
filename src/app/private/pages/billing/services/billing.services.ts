import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment as env } from '@envs/environment';
import { endpoint } from '@shared/apis/endpoint';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import {
  CreateSubscriptionRequest, CustomerLookup, CustomerRequest, CustomerResponse, PaymentResponse, PaymentStatus, PlanProduct,
  PlanRequest, PlanResponse, PlanSelect, RegisterPaymentRequest, SUBSCRIPTION_BADGE, SubscriptionResponse, UpdateSubscriptionRequest,
  money, ymdToDisplay
} from '../models/billing.models';

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

const limit = (label: string, value?: number | null) => `${label}: ${value ?? '∞'}`;

// ---------------------------------------------------------------- Planes
@Injectable({ providedIn: 'root' })
export class PlanService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.PLAN, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<PlanResponse>(data).forEach((p) => {
          p.badgeColor = p.isActive ? 'badge-light-success' : 'badge-light-danger';
          p.priceText = money(p.currency, p.monthlyPrice) + (p.yearlyPrice != null ? ` / año ${money(p.currency, p.yearlyPrice)}` : '');
          p.limitsText = p.product === PlanProduct.Erp
            ? [limit('Empresas', p.maxCompanies), limit('Usuarios', p.maxUsers), limit('Sucursales', p.maxBranches),
               p.includesAi ? 'IA' : '', p.apiPlanSlug ? `API ${p.apiPlanSlug}` : ''].filter(Boolean).join(' · ')
            : [`API ${p.apiPlanSlug ?? '?'}`, limit('Emisores', p.maxIssuers), limit('Comprobantes/mes', p.maxDocumentsPerMonth)].join(' · ');
        });
        return data;
      })
    );
  }

  byId(id: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.PLAN}/${id}`);
  }

  select(product?: PlanProduct | null): Observable<PlanSelect[]> {
    const query = product ? `?product=${product}` : '';
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.PLAN_SELECT}${query}`)
      .pipe(map((resp) => (resp.succeeded && Array.isArray(resp.data) ? resp.data : []) as PlanSelect[]));
  }

  create(body: PlanRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.PLAN_CREATE}`, { planRequestDto: body });
  }

  update(body: PlanRequest & { id: number }): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.PLAN_UPDATE}`, { updatePlanRequestDto: body });
  }

  changeState(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.PLAN_CHANGE_STATE}${id}`, {});
  }

  remove(id: number): Observable<BaseResponse> {
    return this.http.delete<BaseResponse>(`${env.apiUrl}${endpoint.PLAN}/${id}`);
  }
}

// ---------------------------------------------------------------- Clientes
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.CUSTOMER, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<CustomerResponse>(data).forEach((c) => {
          c.badgeColor = c.isActive ? 'badge-light-success' : 'badge-light-danger';
          c.contactText = [c.contactName, c.contactEmail, c.contactPhone].filter(Boolean).join(' · ');
        });
        return data;
      })
    );
  }

  byId(id: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER}/${id}`);
  }

  /** Buscador por RUC o nombre (máx. 30, solo activos). */
  lookup(text: string): Observable<CustomerLookup[]> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER_LOOKUP}?text=${encodeURIComponent(text ?? '')}`).pipe(
      map((resp) => ((resp.succeeded && Array.isArray(resp.data) ? resp.data : []) as CustomerLookup[])
        .map((c) => ({ ...c, label: `${c.ruc} · ${c.businessName}` })))
    );
  }

  create(body: CustomerRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER_CREATE}`, { customerRequestDto: body });
  }

  update(body: CustomerRequest & { id: number }): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER_UPDATE}`, { updateCustomerRequestDto: body });
  }

  changeState(id: number): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER_CHANGE_STATE}${id}`, {});
  }

  remove(id: number): Observable<BaseResponse> {
    return this.http.delete<BaseResponse>(`${env.apiUrl}${endpoint.CUSTOMER}/${id}`);
  }
}

// ---------------------------------------------------------------- Suscripciones
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);

  static decorate(s: SubscriptionResponse): SubscriptionResponse {
    s.badgeColor = SUBSCRIPTION_BADGE[s.status] ?? 'badge-light-secondary';
    s.priceText = `${money(s.currency, s.price)} ${s.billingCycleName.toLowerCase()}`;
    s.coveredUntilText = ymdToDisplay(s.coveredUntil);
    s.suspendOnText = ymdToDisplay(s.suspendOn);
    s.customerText = `${s.customerName} (${s.customerRuc})`;
    return s;
  }

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.SUBSCRIPTION, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<SubscriptionResponse>(data).forEach(SubscriptionService.decorate);
        return data;
      })
    );
  }

  /** Suscripciones abiertas (no canceladas) de un cliente, para registrar un pago. */
  openOfCustomer(customerId: number): Observable<SubscriptionResponse[]> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.SUBSCRIPTION}?records=50&numPage=1&customerId=${customerId}`).pipe(
      map((resp) => ((Array.isArray(resp.data) ? resp.data : []) as SubscriptionResponse[])
        .filter((s) => s.status !== 5)
        .map(SubscriptionService.decorate))
    );
  }

  byId(id: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(`${env.apiUrl}${endpoint.SUBSCRIPTION}/${id}`);
  }

  create(body: CreateSubscriptionRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.SUBSCRIPTION_CREATE}`, { createSubscriptionRequestDto: body });
  }

  update(body: UpdateSubscriptionRequest): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.SUBSCRIPTION_UPDATE}`, { updateSubscriptionRequestDto: body });
  }

  extend(id: number, paidUntil: string, reason: string): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.SUBSCRIPTION_EXTEND}`,
      { extendSubscriptionRequestDto: { id, paidUntil, reason } });
  }

  /** Suspender, reactivar o cancelar (siempre con motivo). */
  reasonAction(action: 'suspend' | 'reactivate' | 'cancel', id: number, reason: string): Observable<BaseResponse> {
    const path = { suspend: endpoint.SUBSCRIPTION_SUSPEND, reactivate: endpoint.SUBSCRIPTION_REACTIVATE, cancel: endpoint.SUBSCRIPTION_CANCEL }[action];
    return this.http.put<BaseResponse>(`${env.apiUrl}${path}`, { subscriptionReasonRequestDto: { id, reason } });
  }
}

// ---------------------------------------------------------------- Pagos
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  GetAll(size: number, page: number, getInputs: string, lastId?: number): Observable<BaseResponse> {
    return this.http.get<BaseResponse>(listUrl(endpoint.PAYMENT, size, page, getInputs, lastId)).pipe(
      map((data) => {
        rows<PaymentResponse>(data).forEach((p) => {
          p.badgeColor = p.status === PaymentStatus.Voided ? 'badge-light-danger' : 'badge-light-success';
          p.amountText = money(p.currency, p.amount);
          p.paidOnText = ymdToDisplay(p.paidOn);
          p.periodText = `${ymdToDisplay(p.periodStart)} – ${ymdToDisplay(p.periodEnd)}`;
          p.customerText = `${p.customerName} (${p.customerRuc})`;
        });
        return data;
      })
    );
  }

  register(body: RegisterPaymentRequest): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${env.apiUrl}${endpoint.PAYMENT_REGISTER}`, { registerPaymentRequestDto: body });
  }

  void(id: number, reason: string): Observable<BaseResponse> {
    return this.http.put<BaseResponse>(`${env.apiUrl}${endpoint.PAYMENT_VOID}`, { voidPaymentRequestDto: { id, reason } });
  }
}
