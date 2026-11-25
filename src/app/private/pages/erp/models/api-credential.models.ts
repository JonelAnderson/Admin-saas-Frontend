/** Modelos de la entrega de credenciales de la API SUNAT al ERP (fase C6b). Los enums viajan como número; las fechas-hora como texto UTC. */
import { Option } from '../../billing/models/billing.models';

/** Mismos números que ApiCredentialDeliveryStatus en el servidor. */
export enum ApiCredentialDeliveryStatus {
  Pending = 1,
  Sending = 2,
  Ready = 3,
  Delivered = 4,
  Failed = 5,
  Abandoned = 6,
  Cancelled = 7,
  Expired = 8
}

export const API_CREDENTIAL_STATUS_OPTIONS: Option<ApiCredentialDeliveryStatus>[] = [
  { id: ApiCredentialDeliveryStatus.Pending, name: 'Pendiente' },
  { id: ApiCredentialDeliveryStatus.Sending, name: 'En curso' },
  { id: ApiCredentialDeliveryStatus.Ready, name: 'Lista (esperando al ERP)' },
  { id: ApiCredentialDeliveryStatus.Delivered, name: 'Entregada' },
  { id: ApiCredentialDeliveryStatus.Failed, name: 'Fallida (se reintenta)' },
  { id: ApiCredentialDeliveryStatus.Abandoned, name: 'Abandonada' },
  { id: ApiCredentialDeliveryStatus.Cancelled, name: 'Cancelada' },
  { id: ApiCredentialDeliveryStatus.Expired, name: 'Vencida' }
];

export const API_CREDENTIAL_BADGE: Record<ApiCredentialDeliveryStatus, string> = {
  [ApiCredentialDeliveryStatus.Pending]: 'badge-light-info',
  [ApiCredentialDeliveryStatus.Sending]: 'badge-light-info',
  [ApiCredentialDeliveryStatus.Ready]: 'badge-light-primary',
  [ApiCredentialDeliveryStatus.Delivered]: 'badge-light-success',
  [ApiCredentialDeliveryStatus.Failed]: 'badge-light-warning',
  [ApiCredentialDeliveryStatus.Abandoned]: 'badge-light-danger',
  [ApiCredentialDeliveryStatus.Cancelled]: 'badge-light-secondary',
  [ApiCredentialDeliveryStatus.Expired]: 'badge-light-secondary'
};

/** Una fila nunca trae la API key ni el secret: solo el estado de la entrega. */
export interface ApiCredentialDeliveryResponse {
  id: number;
  customerId: number;
  customerName: string;
  instanceId: number;
  instanceName: string;
  issuerId: number;
  issuerRuc: string;
  issuerName: string;
  status: ApiCredentialDeliveryStatus;
  statusName: string;
  attempts: number;
  nextAttemptOnUtc: string;
  lastError?: string | null;
  readyOnUtc?: string | null;
  expiresOnUtc?: string | null;
  lastPulledOnUtc?: string | null;
  deliveredOnUtc?: string | null;
  waitingForErp: boolean;
  createdOn: string;
  // Para la tabla
  badgeColor?: string;
  createdText?: string;
  instanceText?: string;
  issuerText?: string;
  detailText?: string;
}

export interface ApiCredentialSettings {
  isConfigured: boolean;
  publicUrl?: string | null;
}

export interface CreateApiCredentialDeliveryRequest {
  instanceId: number;
  issuerId: number;
  confirmInvalidatePrevious: boolean;
}
