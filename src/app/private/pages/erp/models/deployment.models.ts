/** Modelos de los despliegues de instancias del ERP en Coolify (fase C5). Los enums viajan como número; las fechas-hora como texto UTC. */
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Option } from '../../billing/models/billing.models';

export enum DeploymentType {
  Create = 1,
  Update = 2
}

/** Mismos números que RemoteActionStatus en el servidor. */
export enum DeploymentStatus {
  Pending = 1,
  Running = 2,
  Done = 3,
  Failed = 4,
  Abandoned = 5,
  Cancelled = 6
}

export const DEPLOYMENT_STATUS_OPTIONS: Option<DeploymentStatus>[] = [
  { id: DeploymentStatus.Pending, name: 'Pendiente' },
  { id: DeploymentStatus.Running, name: 'En curso' },
  { id: DeploymentStatus.Done, name: 'Hecho' },
  { id: DeploymentStatus.Failed, name: 'Fallido (se reintenta)' },
  { id: DeploymentStatus.Abandoned, name: 'Abandonado' },
  { id: DeploymentStatus.Cancelled, name: 'Cancelado' }
];

/** Mismos colores que la bandeja de acciones remotas. */
export const DEPLOYMENT_BADGE: Record<DeploymentStatus, string> = {
  [DeploymentStatus.Pending]: 'badge-light-info',
  [DeploymentStatus.Running]: 'badge-light-info',
  [DeploymentStatus.Done]: 'badge-light-success',
  [DeploymentStatus.Failed]: 'badge-light-warning',
  [DeploymentStatus.Abandoned]: 'badge-light-danger',
  [DeploymentStatus.Cancelled]: 'badge-light-secondary'
};

export interface DeploymentResponse {
  id: number;
  instanceId: number;
  instanceName: string;
  instanceUrl?: string | null;
  customerId: number;
  customerName: string;
  type: DeploymentType;
  typeName: string;
  version: string;
  step: number;
  stepName: string;
  actor: string;
  status: DeploymentStatus;
  statusName: string;
  attempts: number;
  nextAttemptOnUtc: string;
  lastError?: string | null;
  doneOnUtc?: string | null;
  createdOn: string;
  // Para la tabla
  badgeColor?: string;
  instanceText?: string;
  stepText?: string;
  createdText?: string;
  nextText?: string;
}

export interface ProvisioningSettings {
  isConfigured: boolean;
  baseDomain?: string | null;
  defaultVersion?: string | null;
}

export interface ProvisionRequest {
  instanceId: number;
  subdomain: string;
  version: string;
}

export interface ProvisionResponse {
  deploymentId: number;
  url: string;
  initialAdminUser: string;
  initialAdminPassword: string;
}

export interface UpgradeRequest {
  instanceId: number;
  version: string;
}

/** Igual que el servidor: 2 a 30 caracteres, minúsculas, números y guiones, sin guion al inicio ni al final. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/;

/** Etiqueta de las imágenes: letras, números, punto, guion y guion bajo (hasta 40); "latest" no se acepta. */
export const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/;

export function versionValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) {
    return null;
  }
  return VERSION_PATTERN.test(value) && value.toLowerCase() !== 'latest' ? null : { version: true };
}

export function subdomainValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim().toLowerCase();
  if (!value) {
    return null;
  }
  return SUBDOMAIN_PATTERN.test(value) ? null : { subdomain: true };
}
