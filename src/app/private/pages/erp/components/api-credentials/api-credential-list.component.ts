import { Component, DestroyRef, OnInit, ViewChild, inject, signal } from '@angular/core';
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
import {
  API_CREDENTIAL_STATUS_OPTIONS, ApiCredentialDeliveryResponse, ApiCredentialDeliveryStatus, ApiCredentialSettings
} from '../../models/api-credential.models';
import { ApiCredentialService } from '../../services/api-credential.services';
import { ApiCredentialCreateComponent } from './api-credential-create.component';

/**
 * Credenciales de la API SUNAT que la consola entrega al ERP de cada cliente (fase C6b). La consola las pide a la API, las guarda
 * cifradas hasta que el ERP las recoge y las borra al confirmarlas, al vencer (7 días) o al cancelar. Esta pantalla solo muestra el
 * estado: nunca una key ni un secret.
 */
@Component({
  selector: 'app-api-credential-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-key" title="CREDENCIALES AL ERP" subtitle="Credenciales de la API SUNAT que la consola entrega al ERP de cada cliente"
            help="Pedir una entrega regenera las credenciales de la empresa (las actuales dejan de funcionar), las guarda cifradas y el ERP del cliente las recoge solo en unos minutos. Lista = esperando al ERP (vence a los 7 días y se borra). Entregada = el ERP confirmó y la consola ya no las tiene. Fallida se reintenta sola; Abandonada espera que corrija la causa y use Reintentar. Cancelar borra lo guardado.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearScope()"></button>
            </span>
            }
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (perms.hasPermission('Permissions.ApiCredentialDeliveries.Create')) {
            <button headerActions type="button" class="btn btn-primary btn-sm" (click)="create()"><em class="feather icon-plus"></em> Entregar credenciales</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            @if (settings() && !settings()!.isConfigured) {
            <div class="alert alert-warning m-3 mb-0 small">
              La consola no tiene configurada la dirección pública de la API SUNAT (<code>ApiSunat:PublicUrl</code> / <code>API_SUNAT_PUBLIC_URL</code>, https):
              las entregas esperan y no se regenera nada hasta que se configure. Configúrela en el servidor y reinicie la consola.
            </div>
            }
            <app-list-table [service]="credentials" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ApiCredentialListComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly statuses = API_CREDENTIAL_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Cliente / Empresa', value: 1, placeholder: 'Buscar por cliente, instancia, RUC o razón social', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<ApiCredentialDeliveryResponse>[] = [
    col('FECHA', 'createdText'), col('INSTANCIA', 'instanceText'), col('EMPRESA API SUNAT', 'issuerText'),
    { ...col<ApiCredentialDeliveryResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'lastError' },
    col('DETALLE', 'detailText'), col('INTENTOS', 'attempts'), col('ÚLTIMO ERROR', 'lastError'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'retry', label: 'Reintentar', icon: 'replay', color: 'primary', tooltip: 'Volver a pedir las credenciales ahora',
      visible: (r: ApiCredentialDeliveryResponse) => (r.status === ApiCredentialDeliveryStatus.Failed || r.status === ApiCredentialDeliveryStatus.Abandoned)
        && this.perms.hasPermission('Permissions.ApiCredentialDeliveries.Retry') },
    { id: 'cancel', label: 'Cancelar', icon: 'cancel', color: 'warn', tooltip: 'Cancelar la entrega y borrar lo guardado',
      visible: (r: ApiCredentialDeliveryResponse) => [ApiCredentialDeliveryStatus.Pending, ApiCredentialDeliveryStatus.Failed,
        ApiCredentialDeliveryStatus.Abandoned, ApiCredentialDeliveryStatus.Ready].includes(r.status)
        && this.perms.hasPermission('Permissions.ApiCredentialDeliveries.Cancel') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  readonly settings = signal<ApiCredentialSettings | null>(null);
  status: ApiCredentialDeliveryStatus | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public credentials: ApiCredentialService, public perms: PermissionService, private alerts: AlertModalService,
    private modal: NgbModal, private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Credenciales al ERP');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const customer = Number(params.get('customerId'));
      this.customerId = customer > 0 ? customer : null;
      this.customerName.set(this.customerId ? params.get('customer') ?? `#${this.customerId}` : '');
      this.refresh();
    });
  }

  ngOnInit(): void {
    this.credentials.settings().subscribe({ next: (s) => this.settings.set(s), error: () => this.settings.set(null) });
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
    if (this.customerId) {
      this.clearScope();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({ customerId: this.customerId, status: this.status, textFilter: this.text, refresh: Math.random() }));
  }

  create(): void {
    openModal<boolean>(this.modal, ApiCredentialCreateComponent, () => undefined, () => this.refresh());
  }

  async onAction(event: { action: string; row: ApiCredentialDeliveryResponse }): Promise<void> {
    const row = event.row;
    if (event.action === 'retry') {
      runAction(this.alerts, this.credentials.retry(row.id), 'No se pudo reintentar la entrega.', () => this.refresh());
      return;
    }
    if (event.action === 'cancel') {
      const ready = row.status === ApiCredentialDeliveryStatus.Ready;
      const ok = await this.alerts.show({
        title: 'Cancelar entrega',
        message: `Se cancela la entrega de ${row.issuerName} (${row.issuerRuc}) al ERP de ${row.customerName} y se borran las credenciales guardadas. `
          + (ready ? 'La API SUNAT ya las había regenerado: las credenciales anteriores dejaron de funcionar y habrá que entregar de nuevo. ' : '')
          + '¿Cancelar?',
        type: 'warning', showCancel: true, confirmText: 'Cancelar entrega'
      });
      if (ok) {
        runAction(this.alerts, this.credentials.cancel(row.id), 'No se pudo cancelar la entrega.', () => this.refresh());
      }
    }
  }
}
