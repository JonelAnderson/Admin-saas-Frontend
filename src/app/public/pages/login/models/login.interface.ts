export interface Login {
  userName: string;
  password: string;
}

/** Respuesta de identity/login, identity/login/mfa y identity/login/mfa/setup/confirm (Fase 12a). */
export interface TokenResponse {
  token?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiryTime?: string | null;
  userImageURL?: string | null;
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  mfaTicket?: string | null;
  recoveryCodesLeft?: number | null;
  recoveryCodes?: string[] | null;
  /** Al recordar el dispositivo: su token (se guarda en localStorage y se manda en el login). */
  deviceToken?: string | null;
  /** El login entró sin código porque el dispositivo está recordado. */
  deviceTrusted?: boolean;
}

/** Cuerpo de identity/login/mfa y identity/login/mfa/setup/confirm. */
export interface MfaLoginRequest {
  mfaTicket: string;
  code?: string;
  recoveryCode?: string;
}

/** Respuesta de identity/login/mfa/setup. */
export interface MfaSetupResponse {
  sharedKey: string;
  authenticatorUri: string;
}

/** Respuesta de identity/mfa/status. */
export interface MfaStatusResponse {
  enabled: boolean;
  recoveryCodesLeft: number;
}

/** Etapa del login en dos pasos. */
export type MfaStage = 'verify' | 'setup';
