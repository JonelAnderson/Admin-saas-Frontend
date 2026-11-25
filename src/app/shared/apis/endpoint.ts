import { HttpHeaders } from "@angular/common/http";

export const endpoint = {

  // AUTH MODULE
  LOGIN: 'identity/login',
  REFRSHTOKEN: 'identity/refreshToken',
  LOGOUT: 'identity/logout',
  LOGIN_MFA: 'identity/login/mfa',
  LOGIN_MFA_SETUP: 'identity/login/mfa/setup',
  LOGIN_MFA_SETUP_CONFIRM: 'identity/login/mfa/setup/confirm',
  FORGOT_PASSWORD: 'identity/user/forgot-password',
  RESET_PASSWORD: 'identity/user/reset-password',

  // MFA (mi cuenta)
  MFA_STATUS: 'identity/mfa/status',
  MFA_RECOVERY_CODES: 'identity/mfa/recovery-codes',

  // ACCOUNT MODULE
  UPDATE_PROFILE: 'identity/account/UpdateProfile',
  USER_PROFILE_PICTURE: 'identity/account/profile-picture/',
  CHANGE_PASSWORD: 'identity/account/ChangePassword',
  GET_PERMISSIONS: 'identity/account/permissions',
  ACCOUNT_ME: 'identity/account/me',
  
  // PREFERENCES MODULE
  PREFERENCES_CHANGE_LANGUAGE: 'Preferences/changeLanguage',

  // ROLE MODULE
  LIST_ROLE: 'identity/role',
  PERMISSION_BY_ROLEID: 'identity/role/permissions/',
  MENUS_BY_ROLEID: 'identity/role/menus/',
  ROLE_REGISTER: 'identity/role',
  ROLE_UPDATE: 'identity/role/permissions/update',
  ROLE_MENUS_UPDATE: 'identity/role/menus/update',
  ROLE_DELETE: 'identity/role/',

  // USER MODULE
  LIST_USERS: 'identity/user',
  SELECT_LIST_USERS: 'identity/user/GetUserSelect',
  USER_BY_ID: 'identity/user/',
  USER_ROLES_BY_ID: 'identity/user/roles/',
  USER_ROLES_UPDATE_BY_ID: 'identity/user/roles/',
  USER_REGISTER: 'identity/user',
  USER_ACTIVATE: 'identity/user/toggle-status',
  /** POST identity/users/{id}/mfa/reset y identity/users/{id}/unlock (Fase 12a). */
  USERS_BASE: 'identity/users/',

  // Auditoría (solo SuperAdmin)
  AUDIT_TRAILS: 'Audits/Trails',
  AUDIT_TABLES: 'Audits/Tables',

  // MENU MODULE
  LIST_MENU: "v1/Menu",
  MENU_NAV: "v1/Menu/Nav",
  MENU_BY_ID: "v1/Menu/",
  MENU_REGISTER: "v1/Menu/Create",
  MENU_EDIT: "v1/Menu/Update",
  MENU_REMOVE: "v1/Menu/Delete/",
  MENU_CHANGE_STATE: "v1/Menu/ChangeState/",
  LIST_SELECT_MENU: "v1/Menu/Select",

  // COMERCIAL (consola): planes, clientes, suscripciones y pagos
  PLAN: 'v1/Plan',
  PLAN_SELECT: 'v1/Plan/GetSelect',
  PLAN_CREATE: 'v1/Plan/Create',
  PLAN_UPDATE: 'v1/Plan/Update',
  PLAN_CHANGE_STATE: 'v1/Plan/ChangeState/',
  CUSTOMER: 'v1/Customer',
  CUSTOMER_LOOKUP: 'v1/Customer/Lookup',
  CUSTOMER_CREATE: 'v1/Customer/Create',
  CUSTOMER_UPDATE: 'v1/Customer/Update',
  CUSTOMER_CHANGE_STATE: 'v1/Customer/ChangeState/',
  SUBSCRIPTION: 'v1/Subscription',
  SUBSCRIPTION_CREATE: 'v1/Subscription/Create',
  SUBSCRIPTION_UPDATE: 'v1/Subscription/Update',
  SUBSCRIPTION_EXTEND: 'v1/Subscription/Extend',
  SUBSCRIPTION_SUSPEND: 'v1/Subscription/Suspend',
  SUBSCRIPTION_REACTIVATE: 'v1/Subscription/Reactivate',
  SUBSCRIPTION_CANCEL: 'v1/Subscription/Cancel',
  PAYMENT: 'v1/Payment',
  PAYMENT_REGISTER: 'v1/Payment/Register',
  PAYMENT_VOID: 'v1/Payment/Void',
  API_SUNAT_ISSUER: 'v1/ApiSunatIssuer',
  API_SUNAT_ISSUER_TENANTS: 'v1/ApiSunatIssuer/Tenants',
  API_SUNAT_ISSUER_LINK: 'v1/ApiSunatIssuer/Link',
  API_SUNAT_ISSUER_SYNC: 'v1/ApiSunatIssuer/Sync/',
  INSTANCE: 'v1/Instance',
  INSTANCE_CREATE: 'v1/Instance/Create',
  INSTANCE_UPDATE: 'v1/Instance/Update',
  INSTANCE_ROTATE_KEY: 'v1/Instance/RotateKey/',
  DEPLOYMENT: 'v1/Deployment',
  DEPLOYMENT_SETTINGS: 'v1/Deployment/Settings',
  DEPLOYMENT_PROVISION: 'v1/Deployment/Provision',
  DEPLOYMENT_UPGRADE: 'v1/Deployment/Upgrade',
  DEPLOYMENT_RETRY: 'v1/Deployment/Retry/',
  DEPLOYMENT_CANCEL: 'v1/Deployment/Cancel/',
  REMOTE_ACTION: 'v1/RemoteAction',
  REMOTE_ACTION_RETRY: 'v1/RemoteAction/Retry/',
  PORTAL_ACCESS: 'v1/PortalAccess',
  PORTAL_ACCESS_SETTINGS: 'v1/PortalAccess/Settings',
  PORTAL_ACCESS_INVITE: 'v1/PortalAccess/Invite',
  PORTAL_ACCESS_RETRY: 'v1/PortalAccess/Retry/',
  API_CREDENTIAL: 'v1/ApiCredentialDelivery',
  API_CREDENTIAL_SETTINGS: 'v1/ApiCredentialDelivery/Settings',
  API_CREDENTIAL_RETRY: 'v1/ApiCredentialDelivery/Retry/',
  API_CREDENTIAL_CANCEL: 'v1/ApiCredentialDelivery/Cancel/',
  NOTIFICATION: 'v1/Notification',
  NOTIFICATION_RETRY: 'v1/Notification/Retry/',
  DASHBOARD: 'v1/Dashboard',

};

export const httpOptions = {
  headers: new HttpHeaders({
    "Content-Type": "application/json",
  }),
};
