import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
import { actionsCol, col, openModal, query, runAction } from '../../../billing/components/list-helpers';
import { IssuerResponse, SUSPENSION_OPTIONS } from '../../models/api-sunat.models';
import { ApiSunatIssuerService } from '../../services/api-sunat.services';
import { IssuerLinkComponent } from './issuer-link.component';

const P = 'Permissions.ApiSunatIssuers.';

/**
 * Empresas de la API SUNAT vinculadas a clientes. La emisión de una empresa se suspende sola (por falta de pago) cuando su
 * cliente no tiene ninguna suscripción vigente y se reactiva al regularizarse: aquí solo se ve el estado y se sincroniza.
 */
@Component({
  selector: 'app-issuer-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-file-text" title="EMISORES API SUNAT" subtitle="Empresas de la API SUNAT de cada cliente; las suspendidas aparecen primero"
            help="Una empresa queda con la emisión suspendida (consulta y descarga siguen) cuando su cliente no tiene ninguna suscripción vigente: prueba, activa o en gracia. Se reactiva sola al regularizar. Una suspensión manual hecha en el panel de la API no la toca la consola.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearCustomer()"></button>
            </span>
            }
            <app-filter-select headerFilters #stateFilter [items]="states" placeholder="Estado" [currentValue]="suspended" (filterChange)="suspended = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Link')) {
            <button headerActions type="button" class="btn btn-primary" (click)="link()"><em class="feather icon-link"></em>VINCULAR</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="issuers" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IssuerListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('stateFilter') stateFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly states = SUSPENSION_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Empresa / Cliente', value: 1, placeholder: 'Buscar por RUC o razón social', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<IssuerResponse>[] = [
    col('CLIENTE', 'customerText'), col('EMPRESA (API SUNAT)', 'issuerText'), col('AMBIENTE', 'environment'), col('PLAN API', 'apiPlan'),
    col('USO DEL MES', 'usageText'), col('SINCRONIZADO', 'syncedText'), col('ESTADO', 'stateName', 'badge'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'subscriptions', label: 'Ver suscripciones', icon: 'repeat', color: 'primary', tooltip: 'Suscripciones del cliente',
      visible: () => this.perms.hasPermission('Permissions.Subscriptions.View') },
    { id: 'sync', label: 'Sincronizar', icon: 'sync', color: 'primary', tooltip: 'Traer datos y uso de la API SUNAT',
      visible: () => this.can('Sync') },
    { id: 'actions', label: 'Ver acciones', icon: 'sync_alt', color: 'accent', tooltip: 'Acciones remotas de esta empresa',
      visible: () => this.perms.hasPermission('Permissions.RemoteActions.View') },
    { id: 'unlink', label: 'Desvincular', icon: 'link_off', color: 'warn', tooltip: 'Quitar la empresa del cliente (no se borra en la API)',
      visible: (r: IssuerResponse) => !r.suspendDesired && this.can('Unlink') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  suspended: boolean | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public issuers: ApiSunatIssuerService, private perms: PermissionService, private modal: NgbModal,
    private alerts: AlertModalService, private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Emisores API SUNAT');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('customerId'));
      this.customerId = id > 0 ? id : null;
      this.customerName.set(this.customerId ? params.get('customer') ?? `#${this.customerId}` : '');
      this.refresh();
    });
  }

  can(action: string): boolean {
    return this.perms.hasPermission(P + action);
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  clearCustomer(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reset(): void {
    this.suspended = null;
    this.text = '';
    this.stateFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.customerId) {
      this.clearCustomer();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({ customerId: this.customerId, suspended: this.suspended === null ? null : String(this.suspended), textFilter: this.text, refresh: Math.random() }));
  }

  link(): void {
    openModal<boolean>(this.modal, IssuerLinkComponent, (ref) => {
      if (this.customerId) {
        ref.componentInstance.presetCustomer = { id: this.customerId, ruc: '', businessName: this.customerName() };
      }
    }, () => this.refresh());
  }

  async onAction(event: { action: string; row: IssuerResponse }): Promise<void> {
    const row = event.row;
    switch (event.action) {
      case 'subscriptions':
        void this.router.navigate(['/private/billing/subscriptions'], { queryParams: { customerId: row.customerId, customer: row.customerName } });
        break;
      case 'actions':
        void this.router.navigate(['/private/api-sunat/remote-actions'], { queryParams: { issuerId: row.id, issuer: row.businessName } });
        break;
      case 'sync':
        runAction(this.alerts, this.issuers.sync(row.id), 'No se pudo sincronizar con la API SUNAT.', () => this.refresh());
        break;
      case 'unlink': {
        const ok = await this.alerts.show({
          title: 'Desvincular empresa', message: `¿Quitar ${row.businessName} (${row.ruc}) del cliente ${row.customerName}? La empresa sigue existiendo en la API SUNAT.`,
          type: 'warning', showCancel: true, confirmText: 'Desvincular'
        });
        if (ok) {
          runAction(this.alerts, this.issuers.unlink(row.id), 'No se pudo desvincular la empresa.', () => this.refresh());
        }
        break;
      }
    }
  }
}
