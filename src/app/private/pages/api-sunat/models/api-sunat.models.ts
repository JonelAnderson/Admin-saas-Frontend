/**
 * Modelos del módulo API SUNAT de la consola (emisores y bandeja de acciones remotas). Los enums viajan como número y las
 * fechas-hora como texto UTC; los textos para la tabla se arman en los servicios.
 */
import { Option } from '../../billing/models/billing.models';

export enum RemoteActionType {
  SuspendIssuer = 1,
  ReactivateIssuer = 2,
  ApplyPlan = 3
}

export enum RemoteActionStatus {
  Pending = 1,
  Sending = 2,
  Done = 3,
  Failed = 4,
  Abandoned = 5,
  Cancelled = 6
}

export const REMOTE_ACTION_STATUS_OPTIONS: Option<RemoteActionStatus>[] = [
  { id: RemoteActionStatus.Pending, name: 'Pendiente' },
  { id: RemoteActionStatus.Sending, name: 'Enviando' },
  { id: RemoteActionStatus.Done, name: 'Hecha' },
  { id: RemoteActionStatus.Failed, name: 'Fallida (se reintenta)' },
  { id: RemoteActionStatus.Abandoned, name: 'Abandonada' },
  { id: RemoteActionStatus.Cancelled, name: 'Cancelada' }
];

export const SUSPENSION_OPTIONS: Option<boolean>[] = [
  { id: true, name: 'Emisión suspendida' },
  { id: false, name: 'Emite con normalidad' }
];

export const REMOTE_ACTION_BADGE: Record<RemoteActionStatus, string> = {
  [RemoteActionStatus.Pending]: 'badge-light-info',
  [RemoteActionStatus.Sending]: 'badge-light-info',
  [RemoteActionStatus.Done]: 'badge-light-success',
  [RemoteActionStatus.Failed]: 'badge-light-warning',
  [RemoteActionStatus.Abandoned]: 'badge-light-danger',
  [RemoteActionStatus.Cancelled]: 'badge-light-secondary'
};

/** Empresa emisora de la API SUNAT vinculada a un cliente. */
export interface IssuerResponse {
  id: number;
  customerId: number;
  customerRuc: string;
  customerName: string;
  tenantId: number;
  ruc: string;
  businessName: string;
  tradeName?: string | null;
  environment?: string | null;
  apiPlan?: string | null;
  documentsThisMonth?: number | null;
  maxDocumentsMonth?: number | null;
  suspendDesired: boolean;
  suspendApplied: boolean;
  syncPending: boolean;
  desiredPlan?: string | null;
  planPending?: boolean;
  lastSyncedOnUtc?: string | null;
  notes?: string | null;
  // Para la tabla
  customerText?: string;
  issuerText?: string;
  usageText?: string;
  stateName?: string;
  badgeColor?: string;
  syncedText?: string;
}

/** Empresa de la API SUNAT para elegirla al vincular. */
export interface ApiTenant {
  id: number;
  ruc: string;
  businessName: string;
  tradeName?: string | null;
  environment?: string | null;
  plan?: string | null;
  isActive: boolean;
  billingSuspended: boolean;
  documentsThisMonth: number;
  maxDocumentsMonth: number;
  linked: boolean;
  label?: string;
}

export interface LinkIssuerRequest {
  customerId: number;
  tenantId: number;
  notes?: string | null;
}

export interface RemoteActionResponse {
  id: number;
  type: RemoteActionType;
  typeName: string;
  issuerId: number;
  issuerRuc: string;
  issuerName: string;
  customerId: number;
  customerName: string;
  reason: string;
  actor: string;
  status: RemoteActionStatus;
  statusName: string;
  attempts: number;
  nextAttemptOnUtc: string;
  lastError?: string | null;
  doneOnUtc?: string | null;
  createdOn: string;
  // Para la tabla
  badgeColor?: string;
  issuerText?: string;
  createdText?: string;
  nextText?: string;
  attemptsText?: string;
}

/** Empresa emisora a la que da acceso un acceso al portal. */
export interface PortalIssuer {
  id: number;
  ruc: string;
  businessName: string;
}

/** Persona de un cliente con acceso al portal de clientes de la API SUNAT (nunca trae el token de activación). */
export interface PortalAccessResponse {
  id: number;
  customerId: number;
  customerName: string;
  customerRuc: string;
  email: string;
  name: string;
  isEnabled: boolean;
  resetMfa: boolean;
  /** La API ya creó al usuario (la primera invitación se cumplió). */
  invited: boolean;
  invitedOnUtc?: string | null;
  invitationExpiresOnUtc?: string | null;
  workType: number;
  workTypeName: string;
  status: RemoteActionStatus;
  statusName: string;
  attempts: number;
  nextAttemptOnUtc: string;
  lastError?: string | null;
  doneOnUtc?: string | null;
  createdOn: string;
  issuers: PortalIssuer[];
  // Para la tabla
  customerText?: string;
  personText?: string;
  issuersText?: string;
  accessText?: string;
  invitedText?: string;
  badgeColor?: string;
  stateText?: string;
  nextText?: string;
}

export interface InviteToPortalRequest {
  customerId: number;
  email: string;
  name: string;
  issuerIds: number[];
  resetMfa: boolean;
}

export interface PortalSettings {
  isConfigured: boolean;
  publicUrl?: string | null;
}

export const PORTAL_ENABLED_OPTIONS: Option<boolean>[] = [
  { id: true, name: 'Habilitados' },
  { id: false, name: 'Deshabilitados' }
];

/** Fecha-hora UTC del servidor → dd/MM/yyyy HH:mm en hora de Lima (UTC−5). */
export function utcToLima(value?: string | null): string {
  if (!value) {
    return '';
  }
  const utc = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const ms = Date.parse(utc);
  if (Number.isNaN(ms)) {
    return value;
  }
  const lima = new Date(ms - 5 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(lima.getUTCDate())}/${p(lima.getUTCMonth() + 1)}/${lima.getUTCFullYear()} ${p(lima.getUTCHours())}:${p(lima.getUTCMinutes())}`;
}
