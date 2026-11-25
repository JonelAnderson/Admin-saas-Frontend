/** Modelos del módulo ERP de la consola (instancias y licencias). Los enums viajan como número; las fechas-hora como texto UTC. */
import { Option } from '../../billing/models/billing.models';

export enum LicenseStatus {
  Active = 1,
  Grace = 2,
  Suspended = 3,
  Cancelled = 4
}

export const LICENSE_STATUS_OPTIONS: Option<LicenseStatus>[] = [
  { id: LicenseStatus.Active, name: 'Activa' },
  { id: LicenseStatus.Grace, name: 'En gracia' },
  { id: LicenseStatus.Suspended, name: 'Suspendida (solo lectura)' },
  { id: LicenseStatus.Cancelled, name: 'Cancelada (solo lectura)' }
];

export interface InstanceResponse {
  id: number;
  customerId: number;
  customerRuc: string;
  customerName: string;
  name: string;
  url?: string | null;
  server?: string | null;
  notes?: string | null;
  licenseKeyHint: string;
  keyRotatedOnUtc?: string | null;
  lastContactOnUtc?: string | null;
  version?: string | null;
  lastMigration?: string | null;
  companies?: number | null;
  users?: number | null;
  branches?: number | null;
  documentsThisMonth?: number | null;
  isActive: boolean;
  /** Su stack lo creó la consola en Coolify (fase C5). */
  isProvisioned: boolean;
  /** Versión de las imágenes que la consola desplegó por última vez. */
  deployedVersion?: string | null;
  licenseStatus: LicenseStatus;
  licenseStatusName: string;
  contactName: string;
  contactLevel: 'online' | 'delayed' | 'lost' | 'never';
  // Textos para la tabla (los arma el servicio)
  customerText?: string;
  licenseText?: string;
  contactText?: string;
  usageText?: string;
  keyText?: string;
  stackText?: string;
  badgeColor?: string;
}

export interface InstanceForm {
  customerId?: number;
  name: string;
  url: string | null;
  server: string | null;
  notes: string | null;
}

export interface InstanceKeyResponse {
  id: number;
  licenseKey: string;
}
