/**
 * Modelos de la bandeja de avisos por correo a los clientes. Los enums viajan como número y las fechas-hora como texto UTC
 * (se muestran en Lima con `utcToLima`); los textos para la tabla se arman en el servicio.
 */
import { Option } from './billing.models';

export enum NotificationType {
  DueSoon = 1,
  DueToday = 2,
  GraceEntered = 3,
  Suspended = 4,
  PaymentRegistered = 5,
  CertificateExpiring = 6
}

export enum NotificationStatus {
  Pending = 1,
  Sending = 2,
  Sent = 3,
  Failed = 4,
  Abandoned = 5,
  Skipped = 6
}

export const NOTIFICATION_TYPE_OPTIONS: Option<NotificationType>[] = [
  { id: NotificationType.DueSoon, name: 'Por vencer' },
  { id: NotificationType.DueToday, name: 'Vence hoy' },
  { id: NotificationType.GraceEntered, name: 'En gracia' },
  { id: NotificationType.Suspended, name: 'Suspensión' },
  { id: NotificationType.PaymentRegistered, name: 'Pago registrado' },
  { id: NotificationType.CertificateExpiring, name: 'Certificado' }
];

export const NOTIFICATION_STATUS_OPTIONS: Option<NotificationStatus>[] = [
  { id: NotificationStatus.Pending, name: 'Pendiente' },
  { id: NotificationStatus.Sending, name: 'Enviando' },
  { id: NotificationStatus.Sent, name: 'Enviado' },
  { id: NotificationStatus.Failed, name: 'Fallido (se reintenta)' },
  { id: NotificationStatus.Abandoned, name: 'Abandonado' },
  { id: NotificationStatus.Skipped, name: 'Omitido' }
];

export const NOTIFICATION_BADGE: Record<NotificationStatus, string> = {
  [NotificationStatus.Pending]: 'badge-light-info',
  [NotificationStatus.Sending]: 'badge-light-info',
  [NotificationStatus.Sent]: 'badge-light-success',
  [NotificationStatus.Failed]: 'badge-light-warning',
  [NotificationStatus.Abandoned]: 'badge-light-danger',
  [NotificationStatus.Skipped]: 'badge-light-secondary'
};

/** Fila de la bandeja de avisos (sin el cuerpo del correo). */
export interface NotificationResponse {
  id: number;
  type: NotificationType;
  typeName: string;
  customerId: number;
  customerName: string;
  toEmail?: string | null;
  subject: string;
  status: NotificationStatus;
  statusName: string;
  attempts: number;
  nextAttemptOnUtc: string;
  lastError?: string | null;
  sentOnUtc?: string | null;
  createdOn: string;
  // Para la tabla
  badgeColor?: string;
  createdText?: string;
  sentText?: string;
  attemptsText?: string;
}
