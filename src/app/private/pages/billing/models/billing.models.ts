/**
 * Modelos del módulo Comercial de la consola (planes, clientes, suscripciones y pagos). Los enums viajan como número y las
 * fechas como texto yyyy-MM-dd (fechas de Lima, DateOnly en el backend): nunca pasarlas por `new Date()` (corre un día por la
 * zona horaria). Para mostrarlas se usa `ymdToDisplay`.
 */

export enum PlanProduct {
  Erp = 1,
  ApiSunat = 2
}

export enum BillingCycle {
  Monthly = 1,
  Yearly = 2
}

export enum SubscriptionStatus {
  Trial = 1,
  Active = 2,
  Grace = 3,
  Suspended = 4,
  Cancelled = 5
}

export enum PaymentMethod {
  Transfer = 1,
  Deposit = 2,
  Yape = 3,
  Plin = 4,
  Cash = 5,
  Card = 6,
  Other = 9
}

export enum PaymentStatus {
  Registered = 1,
  Voided = 2
}

export interface Option<T> {
  id: T;
  name: string;
}

export const PRODUCT_OPTIONS: Option<PlanProduct>[] = [
  { id: PlanProduct.Erp, name: 'ERP' },
  { id: PlanProduct.ApiSunat, name: 'API SUNAT' }
];

export const CYCLE_OPTIONS: Option<BillingCycle>[] = [
  { id: BillingCycle.Monthly, name: 'Mensual' },
  { id: BillingCycle.Yearly, name: 'Anual' }
];

export const CURRENCY_OPTIONS: Option<string>[] = [
  { id: 'PEN', name: 'Soles (PEN)' },
  { id: 'USD', name: 'Dólares (USD)' }
];

export const SUBSCRIPTION_STATUS_OPTIONS: Option<SubscriptionStatus>[] = [
  { id: SubscriptionStatus.Trial, name: 'Prueba' },
  { id: SubscriptionStatus.Active, name: 'Activa' },
  { id: SubscriptionStatus.Grace, name: 'En gracia' },
  { id: SubscriptionStatus.Suspended, name: 'Suspendida' },
  { id: SubscriptionStatus.Cancelled, name: 'Cancelada' }
];

export const PAYMENT_METHOD_OPTIONS: Option<PaymentMethod>[] = [
  { id: PaymentMethod.Transfer, name: 'Transferencia' },
  { id: PaymentMethod.Deposit, name: 'Depósito' },
  { id: PaymentMethod.Yape, name: 'Yape' },
  { id: PaymentMethod.Plin, name: 'Plin' },
  { id: PaymentMethod.Cash, name: 'Efectivo' },
  { id: PaymentMethod.Card, name: 'Tarjeta' },
  { id: PaymentMethod.Other, name: 'Otro' }
];

export const PAYMENT_STATUS_OPTIONS: Option<PaymentStatus>[] = [
  { id: PaymentStatus.Registered, name: 'Registrado' },
  { id: PaymentStatus.Voided, name: 'Anulado' }
];

// ---------------------------------------------------------------- Planes
export interface PlanRequest {
  product: PlanProduct;
  code: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  yearlyPrice?: number | null;
  currency: string;
  trialDays: number;
  sortOrder: number;
  maxCompanies?: number | null;
  maxUsers?: number | null;
  maxBranches?: number | null;
  includesAi: boolean;
  apiPlanSlug?: string | null;
  maxIssuers?: number | null;
  maxDocumentsPerMonth?: number | null;
}

export interface PlanResponse extends PlanRequest {
  id: number;
  productName: string;
  isActive: boolean;
  // Para la tabla
  badgeColor?: string;
  priceText?: string;
  limitsText?: string;
}

export interface PlanSelect {
  id: number;
  product: PlanProduct;
  code: string;
  name: string;
  monthlyPrice: number;
  currency: string;
}

// ---------------------------------------------------------------- Clientes
export interface CustomerRequest {
  ruc: string;
  businessName: string;
  tradeName?: string | null;
  address?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
}

export interface CustomerResponse extends CustomerRequest {
  id: number;
  isActive: boolean;
  openSubscriptions: number;
  badgeColor?: string;
  contactText?: string;
}

export interface CustomerLookup {
  id: number;
  ruc: string;
  businessName: string;
  tradeName?: string | null;
  label?: string;
}

// ---------------------------------------------------------------- Suscripciones
export interface CreateSubscriptionRequest {
  customerId: number;
  planId: number;
  billingCycle: BillingCycle;
  startOn?: string | null;
  price?: number | null;
  billingDay?: number | null;
  graceDays: number;
  notes?: string | null;
}

export interface UpdateSubscriptionRequest {
  id: number;
  planId: number;
  billingCycle: BillingCycle;
  price: number;
  billingDay: number;
  graceDays: number;
  notes?: string | null;
}

export interface SubscriptionResponse {
  id: number;
  customerId: number;
  customerRuc: string;
  customerName: string;
  planId: number;
  planCode: string;
  planName: string;
  product: PlanProduct;
  productName: string;
  billingCycle: BillingCycle;
  billingCycleName: string;
  price: number;
  currency: string;
  startOn: string;
  trialEndsOn?: string | null;
  paidUntil?: string | null;
  billingDay: number;
  graceDays: number;
  coveredUntil: string;
  suspendOn?: string | null;
  status: SubscriptionStatus;
  statusName: string;
  suspendedManually: boolean;
  statusReason?: string | null;
  cancelledOn?: string | null;
  notes?: string | null;
  // Para la tabla
  badgeColor?: string;
  priceText?: string;
  coveredUntilText?: string;
  suspendOnText?: string;
  customerText?: string;
}

// ---------------------------------------------------------------- Pagos
export interface RegisterPaymentRequest {
  subscriptionId: number;
  paidOn?: string | null;
  amount: number;
  currency: string;
  method: PaymentMethod;
  operationNumber?: string | null;
  periods: number;
  notes?: string | null;
}

export interface PaymentResponse {
  id: number;
  subscriptionId: number;
  customerId: number;
  customerRuc: string;
  customerName: string;
  planName: string;
  product: PlanProduct;
  productName: string;
  paidOn: string;
  amount: number;
  expectedAmount: number;
  currency: string;
  method: PaymentMethod;
  methodName: string;
  operationNumber?: string | null;
  periods: number;
  periodStart: string;
  periodEnd: string;
  status: PaymentStatus;
  statusName: string;
  voidedOn?: string | null;
  voidReason?: string | null;
  notes?: string | null;
  // Para la tabla
  badgeColor?: string;
  amountText?: string;
  paidOnText?: string;
  periodText?: string;
  customerText?: string;
}

// ---------------------------------------------------------------- Utilidades
/** yyyy-MM-dd → dd/MM/yyyy sin pasar por Date (evita el corrimiento de zona horaria). */
export function ymdToDisplay(value?: string | null): string {
  if (!value) {
    return '';
  }
  const [y, m, d] = value.substring(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

/** Fecha de hoy en Lima (UTC−5) como yyyy-MM-dd, para los valores por defecto de los formularios. */
export function limaTodayYmd(): string {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return lima.toISOString().substring(0, 10);
}

export function money(currency: string, amount?: number | null): string {
  if (amount == null) {
    return '';
  }
  return `${currency} ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const SUBSCRIPTION_BADGE: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.Trial]: 'badge-light-info',
  [SubscriptionStatus.Active]: 'badge-light-success',
  [SubscriptionStatus.Grace]: 'badge-light-warning',
  [SubscriptionStatus.Suspended]: 'badge-light-danger',
  [SubscriptionStatus.Cancelled]: 'badge-light-secondary'
};

/** Mensajes de error del servidor (Result.messages o errores de validación) en un solo texto. */
export function serverMessages(resp: { messages?: string[] | string; errors?: { errorMessage?: string }[] } | null | undefined,
  fallback: string): string {
  const errors = resp?.errors?.map((e) => e.errorMessage).filter(Boolean) ?? [];
  if (errors.length) {
    return errors.join(' ');
  }
  const messages = resp?.messages;
  if (Array.isArray(messages) && messages.length) {
    return messages.join(' ');
  }
  return typeof messages === 'string' && messages ? messages : fallback;
}
