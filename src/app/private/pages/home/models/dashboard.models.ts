/** Contrato de `GET v1/Dashboard` (tablero de Inicio). Las fechas de negocio llegan como yyyy-MM-dd (Lima). */
export interface DashboardCount {
  status: number;
  name: string;
  count: number;
}

export interface DashboardRevenue {
  currency: string;
  amount: number;
  payments: number;
}

export interface DashboardDue {
  subscriptionId: number;
  customerId: number;
  customerName: string;
  productName: string;
  planName: string;
  /** "Vence" o "Se suspende". */
  event: string;
  date: string;
  daysLeft: number;
}

export interface DashboardInstance {
  id: number;
  customerId: number;
  customerName: string;
  name: string;
  version?: string | null;
  lastContactOnUtc?: string | null;
  contactName: string;
}

/** Resumen de la API SUNAT; con `available = false` no se pudo consultar (la consola sigue funcionando). */
export interface DashboardApi {
  available: boolean;
  error?: string | null;
  tenantsActive: number;
  documentsThisMonth: number;
  rejectedThisMonth: number;
  rejectedToday?: number | null;
  pendingNow: number;
  failedJobs: number;
  certificatesExpiring: number;
  certificatesBroken: number;
}

export interface Dashboard {
  today: string;
  customers: number;
  subscriptionsByStatus: DashboardCount[];
  monthRevenue: DashboardRevenue[];
  dueThisWeek: DashboardDue[];
  instancesTotal: number;
  instancesWithoutContact: DashboardInstance[];
  latestVersion?: string | null;
  instancesOutdated: DashboardInstance[];
  remoteActionsNeedingAttention: number;
  notificationsNeedingAttention: number;
  api?: DashboardApi | null;
}
