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
import { DEPLOYMENT_STATUS_OPTIONS, DeploymentResponse, DeploymentStatus } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.services';

/**
 * Despliegues de instancias del ERP en Coolify (fase C5): montar un stack nuevo y llevarlo a otra versión. Los ejecuta solo el
 * despachador (cada minuto, con reintentos); aquí se ve el avance, se reintenta lo abandonado y se cancela lo que no debe seguir.
 */
@Component({
  selector: 'app-deployment-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-upload-cloud" title="DESPLIEGUES" subtitle="Instancias del ERP que la consola monta o actualiza en Coolify, del más reciente al más antiguo"
            help="Pendiente → En curso → Hecho. Montar crea el servicio en Coolify, carga sus variables y lo arranca (cada paso se guarda: un reintento sigue donde quedó). Actualizar cambia la versión de las imágenes y reinicia. Fallido se reintenta solo (1 min hasta 6 h, 10 intentos); Abandonado espera que corrija la causa y use Reintentar. Cancelar no borra nada en Coolify.">
            @if (instanceName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Instancia: {{ instanceName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de instancia" (click)="clearScope()"></button>
            </span>
            }
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearScope()"></button>
            </span>
            }
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="deployments" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DeploymentListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly statuses = DEPLOYMENT_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Instancia / Cliente', value: 1, placeholder: 'Buscar por instancia, RUC, razón social o versión', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<DeploymentResponse>[] = [
    col('FECHA', 'createdText'), col('INSTANCIA', 'instanceText'), col('TIPO', 'typeName'), col('VERSIÓN', 'version'), col('PASO', 'stepText'),
    col('SOLICITÓ', 'actor'), col('INTENTOS', 'attempts'), col('PRÓXIMO INTENTO', 'nextText'),
    { ...col<DeploymentResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'lastError' }, col('ÚLTIMO ERROR', 'lastError'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'retry', label: 'Reintentar', icon: 'replay', color: 'primary', tooltip: 'Volver a ejecutarlo ahora',
      visible: (r: DeploymentResponse) => (r.status === DeploymentStatus.Failed || r.status === DeploymentStatus.Abandoned)
        && this.perms.hasPermission('Permissions.Deployments.Retry') },
    { id: 'cancel', label: 'Cancelar', icon: 'cancel', color: 'warn', tooltip: 'Cancelar el despliegue (no borra nada en Coolify)',
      visible: (r: DeploymentResponse) => (r.status === DeploymentStatus.Pending || r.status === DeploymentStatus.Failed || r.status === DeploymentStatus.Abandoned)
        && this.perms.hasPermission('Permissions.Deployments.Retry') }
  ];

  instanceId: number | null = null;
  customerId: number | null = null;
  readonly instanceName = signal('');
  readonly customerName = signal('');
  status: DeploymentStatus | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public deployments: DeploymentService, public perms: PermissionService, private alerts: AlertModalService,
    private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Despliegues');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const instance = Number(params.get('instanceId'));
      this.instanceId = instance > 0 ? instance : null;
      this.instanceName.set(this.instanceId ? params.get('instance') ?? `#${this.instanceId}` : '');
      const customer = Number(params.get('customerId'));
      this.customerId = customer > 0 ? customer : null;
      this.customerName.set(this.customerId ? params.get('customer') ?? `#${this.customerId}` : '');
      this.refresh();
    });
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  clearScope(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reset(): void {
    this.status = null;
    this.text = '';
    this.statusFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.instanceId || this.customerId) {
      this.clearScope();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({
      instanceId: this.instanceId, customerId: this.customerId, status: this.status, textFilter: this.text, refresh: Math.random()
    }));
  }

  async onAction(event: { action: string; row: DeploymentResponse }): Promise<void> {
    const row = event.row;
    if (event.action === 'retry') {
      runAction(this.alerts, this.deployments.retry(row.id), 'No se pudo reintentar el despliegue.', () => this.refresh());
      return;
    }
    if (event.action === 'cancel') {
      const ok = await this.alerts.show({
        title: 'Cancelar despliegue',
        message: `Se cancela el despliegue de ${row.instanceName} (${row.customerName}) y se borran los secretos guardados para él. `
          + 'Lo que ya se creó en Coolify NO se borra: si el servicio ya existía, elimínelo allí a mano (la consola nunca borra stacks ni bases de clientes). ¿Cancelar?',
        type: 'warning', showCancel: true, confirmText: 'Cancelar despliegue'
      });
      if (ok) {
        runAction(this.alerts, this.deployments.cancel(row.id), 'No se pudo cancelar el despliegue.', () => this.refresh());
      }
    }
  }
}
