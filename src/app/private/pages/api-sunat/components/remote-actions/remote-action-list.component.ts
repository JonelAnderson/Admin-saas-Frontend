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
import { actionsCol, col, query, runAction } from '../../../billing/components/list-helpers';
import { REMOTE_ACTION_STATUS_OPTIONS, RemoteActionResponse, RemoteActionStatus } from '../../models/api-sunat.models';
import { RemoteActionService } from '../../services/api-sunat.services';

/**
 * Bandeja de acciones remotas: lo que la consola pidió a la API SUNAT (suspender o reactivar la emisión de una empresa) y su
 * resultado. Se envían solas cada minuto; las fallidas se reintentan con espera creciente y las abandonadas se reintentan aquí.
 */
@Component({
  selector: 'app-remote-action-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-activity" title="ACCIONES REMOTAS" subtitle="Cambios que la consola envió a la API SUNAT, del más reciente al más antiguo"
            help="Pendiente → Enviando → Hecha. Si la API no responde queda Fallida y se reintenta (1 min, 5 min… hasta 6 h, 10 intentos). Abandonada: ya no se reintenta sola; corrija la causa (clave, IP, empresa) y use Reintentar. Cancelada: otro cambio posterior la dejó sin efecto.">
            @if (issuerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Empresa: {{ issuerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de empresa" (click)="clearIssuer()"></button>
            </span>
            }
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="remoteActions" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RemoteActionListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly statuses = REMOTE_ACTION_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Empresa / Motivo', value: 1, placeholder: 'Buscar por RUC, razón social o motivo', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<RemoteActionResponse>[] = [
    col('FECHA', 'createdText'), col('ACCIÓN', 'typeName'), col('EMPRESA', 'issuerText'), col('CLIENTE', 'customerName'),
    col('MOTIVO', 'reason'), col('SOLICITÓ', 'actor'), col('INTENTOS', 'attemptsText'), col('PRÓXIMO INTENTO', 'nextText'),
    { ...col<RemoteActionResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'lastError' }, col('ÚLTIMO ERROR', 'lastError'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'retry', label: 'Reintentar', icon: 'replay', color: 'primary', tooltip: 'Volver a enviarla ahora',
      visible: (r: RemoteActionResponse) => (r.status === RemoteActionStatus.Failed || r.status === RemoteActionStatus.Abandoned)
        && this.perms.hasPermission('Permissions.RemoteActions.Retry') }
  ];

  issuerId: number | null = null;
  readonly issuerName = signal('');
  status: RemoteActionStatus | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public remoteActions: RemoteActionService, public perms: PermissionService, private alerts: AlertModalService,
    private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Acciones remotas');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('issuerId'));
      this.issuerId = id > 0 ? id : null;
      this.issuerName.set(this.issuerId ? params.get('issuer') ?? `#${this.issuerId}` : '');
      this.refresh();
    });
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  clearIssuer(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reset(): void {
    this.status = null;
    this.text = '';
    this.statusFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.issuerId) {
      this.clearIssuer();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({ issuerId: this.issuerId, status: this.status, textFilter: this.text, refresh: Math.random() }));
  }

  onAction(event: { action: string; row: RemoteActionResponse }): void {
    if (event.action === 'retry') {
      runAction(this.alerts, this.remoteActions.retry(event.row.id), 'No se pudo reintentar la acción.', () => this.refresh());
    }
  }
}
