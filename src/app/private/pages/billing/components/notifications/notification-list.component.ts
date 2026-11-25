import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { FilterSelectComponent } from '@shared/components/reusables/filter-select/filter-select.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { PermissionService } from '@shared/service/permission.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { actionsCol, col, query, runAction } from '../list-helpers';
import {
  NOTIFICATION_STATUS_OPTIONS, NOTIFICATION_TYPE_OPTIONS, NotificationResponse, NotificationStatus, NotificationType
} from '../../models/notification.models';
import { NotificationService } from '../../services/notification.services';

/**
 * Avisos por correo a los clientes: por vencer, vence hoy, gracia, suspensión, constancia de pago y certificado por vencer. Se
 * envían solos cada 5 minutos; los fallidos se reintentan con espera creciente (5 intentos) y los abandonados se reintentan aquí.
 */
@Component({
  selector: 'app-notification-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-mail" title="AVISOS" subtitle="Correos a los clientes, del más reciente al más antiguo"
            help="Pendiente → Enviado. Si el servidor de correo falla queda Fallido y se reintenta (5 min, 30 min, 2 h, 6 h; 5 intentos); Abandonado ya no se reintenta sola, corrija la causa y use Reintentar. Omitido: el cliente no tiene correo de contacto o el aviso caducó (3 días sin poder enviarse). Cada aviso se envía una sola vez por periodo.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearCustomer()"></button>
            </span>
            }
            <app-filter-select headerFilters #typeFilter [items]="types" placeholder="Tipo" [currentValue]="type" (filterChange)="type = $event; refresh()"></app-filter-select>
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="notifications" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('typeFilter') typeFilter?: FilterSelectComponent;
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly types = NOTIFICATION_TYPE_OPTIONS;
  readonly statuses = NOTIFICATION_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Cliente / Asunto', value: 1, placeholder: 'Buscar por cliente, RUC, asunto o correo', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<NotificationResponse>[] = [
    col('FECHA', 'createdText'), col('TIPO', 'typeName'), col('CLIENTE', 'customerName'), col('CORREO', 'toEmail'),
    col('ASUNTO', 'subject'), col('INTENTOS', 'attemptsText'), col('ENVIADO', 'sentText'),
    { ...col<NotificationResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'lastError' }, col('ÚLTIMO ERROR', 'lastError'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'retry', label: 'Reintentar', icon: 'replay', color: 'primary', tooltip: 'Volver a enviarlo ahora',
      visible: (r: NotificationResponse) => (r.status === NotificationStatus.Failed || r.status === NotificationStatus.Abandoned)
        && this.perms.hasPermission('Permissions.Notifications.Retry') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  status: NotificationStatus | null = null;
  type: NotificationType | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public notifications: NotificationService, public perms: PermissionService, private alerts: AlertModalService,
    private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Avisos');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('customerId'));
      this.customerId = id > 0 ? id : null;
      this.customerName.set(this.customerId ? params.get('customer') ?? `#${this.customerId}` : '');
      this.refresh();
    });
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  clearCustomer(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reset(): void {
    this.status = null;
    this.type = null;
    this.text = '';
    this.statusFilter?.resetFilter();
    this.typeFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.customerId) {
      this.clearCustomer();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({ customerId: this.customerId, status: this.status, type: this.type, textFilter: this.text, refresh: Math.random() }));
  }

  onAction(event: { action: string; row: NotificationResponse }): void {
    if (event.action === 'retry') {
      runAction(this.alerts, this.notifications.retry(event.row.id), 'No se pudo reintentar el aviso.', () => this.refresh());
    }
  }
}
