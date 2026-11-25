export interface UserResponse {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  phoneNumber: string;
  reportUser:string;
  password: string;
  confirmPassword: string;
  isActive: boolean;
  userStatus:string;
  autoConfirmEmail: boolean;
  badgeColor:any;
  /** Fase 12a: MFA activado (app autenticadora). */
  mfaEnabled?: boolean;
  /** Fase 12a: bloqueado por intentos fallidos hasta esta fecha (UTC) o null. */
  lockedUntil?: string | null;
  /** Calculados en el frontend para el listado. */
  mfaStatus?: string;
  badgeColorTwo?: string;
  lockedUntilText?: string;
  isLocked?: boolean;
  }
