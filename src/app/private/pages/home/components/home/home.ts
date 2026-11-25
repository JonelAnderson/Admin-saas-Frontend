import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermissionService } from '@shared/service/permission.service';
import { money, ymdToDisplay } from '../../../billing/models/billing.models';
import { utcToLima } from '../../../api-sunat/models/api-sunat.models';
import { Dashboard } from '../../models/dashboard.models';
import { DashboardService } from '../../services/dashboard.service';

interface Shortcut {
  label: string;
  description: string;
  icon: string;
  url: string;
  permission: string | null;
}

const SHORTCUTS: Shortcut[] = [
  { label: 'Clientes', description: 'Quién contrata el ERP o la API SUNAT', icon: 'icon-briefcase', url: '/private/billing/customers', permission: 'Permissions.Customers.Menu' },
  { label: 'Suscripciones', description: 'Qué cliente tiene qué plan y su estado', icon: 'icon-repeat', url: '/private/billing/subscriptions', permission: 'Permissions.Subscriptions.Menu' },
  { label: 'Pagos', description: 'Registrar y anular pagos', icon: 'icon-dollar-sign', url: '/private/billing/payments', permission: 'Permissions.Payments.Menu' },
  { label: 'Planes', description: 'Planes del ERP y de la API SUNAT', icon: 'icon-layers', url: '/private/billing/plans', permission: 'Permissions.Plans.Menu' },
  { label: 'Avisos', description: 'Correos a los clientes: vencimientos y constancias', icon: 'icon-mail', url: '/private/billing/notifications', permission: 'Permissions.Notifications.Menu' },
  { label: 'Ayuda', description: 'Soporte', icon: 'icon-help-circle', url: '/private/help', permission: null }
];

/** Color del indicador de cada estado de suscripción (Prueba, Activa, En gracia, Suspendida, Cancelada). */
const STATUS_COLOR: Record<number, string> = { 1: 'info', 2: 'success', 3: 'warning', 4: 'danger', 5: 'secondary' };

/**
 * Inicio de la consola: tablero (clientes por estado, cobrado del mes, vencimientos de la semana, instancias del ERP, bandejas con
 * fallos y resumen de la API SUNAT) y accesos directos según los permisos. El tablero solo se pide con `Dashboards.View`.
 */
@Component({
  selector: 'app-home',
  imports: [RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  private permissions = inject(PermissionService);
  private dashboardService = inject(DashboardService);

  readonly shortcuts = SHORTCUTS.filter((s) => !s.permission || this.permissions.hasPermission(s.permission));
  readonly canSeeDashboard = this.permissions.hasPermission('Permissions.Dashboards.View');

  readonly dashboard = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly ymd = ymdToDisplay;
  readonly money = money;
  readonly lima = utcToLima;
  readonly statusColor = STATUS_COLOR;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    if (!this.canSeeDashboard) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.get().subscribe({
      next: (resp) => {
        this.loading.set(false);
        if (resp.succeeded && resp.data) {
          this.dashboard.set(resp.data as Dashboard);
        } else {
          this.error.set('No se pudo cargar el tablero.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el tablero. Intente de nuevo en unos minutos.');
      }
    });
  }

  /** Días que faltan, dicho en palabras ("hoy", "mañana", "en 3 días"). */
  daysText(days: number): string {
    return days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;
  }
}
