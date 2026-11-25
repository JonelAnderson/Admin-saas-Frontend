import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { PermissionService } from '@shared/service/permission.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { serverMessages } from '../../../billing/models/billing.models';
import { actionsCol, col, openModal, query, runAction } from '../../../billing/components/list-helpers';
import { InstanceKeyResponse, InstanceResponse } from '../../models/erp.models';
import { InstanceService } from '../../services/erp.services';
import { InstanceFormComponent } from './instance-form.component';
import { InstanceProvisionComponent } from './instance-provision.component';
import { InstanceUpgradeComponent } from './instance-upgrade.component';

const P = 'Permissions.Instances.';

/**
 * Instancias del ERP de los clientes. La licencia que recibe cada una sale de la suscripción del ERP de su cliente; sin pago,
 * la instancia pasa a solo lectura. Aquí se ve su estado, su último contacto y su uso, y se administra su clave.
 */
@Component({
  selector: 'app-instance-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-hard-drive" title="INSTANCIAS DEL ERP" subtitle="Cada ERP de un cliente, su licencia y su último contacto; las que no se conectan salen primero"
            help="La instancia consulta su licencia cada 10 minutos con su clave. Si el cliente no tiene una suscripción vigente del ERP queda en solo lectura (consulta, no registra). Sin contacto por más de un día revise la conexión o la clave.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearCustomer()"></button>
            </span>
            }
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Create')) {
            <button headerActions type="button" class="btn btn-primary" (click)="create()"><em class="feather icon-plus"></em>NUEVA</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="instances" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InstanceListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly searchOptions: SearchOptions[] = [
    { label: 'Instancia / Cliente', value: 1, placeholder: 'Buscar por nombre, dirección, RUC o razón social', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<InstanceResponse>[] = [
    col('CLIENTE', 'customerText'), col('INSTANCIA', 'name'), col('DIRECCIÓN', 'url'), col('LICENCIA', 'licenseText', 'badge'),
    col('ÚLTIMO CONTACTO', 'contactText'), col('VERSIÓN', 'version'), col('STACK', 'stackText'), col('USO INFORMADO', 'usageText'), col('CLAVE', 'keyText'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'subscriptions', label: 'Ver suscripciones', icon: 'repeat', color: 'primary', tooltip: 'Suscripciones del cliente',
      visible: () => this.perms.hasPermission('Permissions.Subscriptions.View') },
    { id: 'provision', label: 'Montar en Coolify', icon: 'cloud_upload', color: 'accent', tooltip: 'Crear el stack de esta instancia en Coolify',
      visible: (r: InstanceResponse) => !r.isProvisioned && r.contactLevel === 'never' && this.perms.hasPermission('Permissions.Deployments.Provision') },
    { id: 'upgrade', label: 'Actualizar versión', icon: 'upgrade', color: 'accent', tooltip: 'Llevar el stack a otra versión de las imágenes',
      visible: (r: InstanceResponse) => r.isProvisioned && !!r.deployedVersion && this.perms.hasPermission('Permissions.Deployments.Upgrade') },
    { id: 'deployments', label: 'Ver despliegues', icon: 'history', color: 'primary', tooltip: 'Despliegues de esta instancia',
      visible: (r: InstanceResponse) => r.isProvisioned && this.perms.hasPermission('Permissions.Deployments.View') },
    { id: 'edit', label: 'Editar', icon: 'edit', color: 'primary', tooltip: 'Editar nombre, dirección y notas', visible: () => this.can('Edit') },
    { id: 'rotate', label: 'Nueva clave', icon: 'vpn_key', color: 'accent', tooltip: 'Generar una clave nueva (la anterior deja de valer)',
      visible: () => this.can('RotateKey') },
    { id: 'delete', label: 'Eliminar', icon: 'delete', color: 'warn', tooltip: 'Eliminar la instancia', visible: () => this.can('Delete') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  text = '';
  readonly getInputs = signal('');

  constructor(public instances: InstanceService, private perms: PermissionService, private modal: NgbModal,
    private alerts: AlertModalService, private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Instancias del ERP');
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
    this.text = '';
    this.searchBox?.resetComplete();
    if (this.customerId) {
      this.clearCustomer();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({ customerId: this.customerId, textFilter: this.text, refresh: Math.random() }));
  }

  create(): void {
    openModal<boolean>(this.modal, InstanceFormComponent, (ref) => {
      if (this.customerId) {
        ref.componentInstance.presetCustomer = { id: this.customerId, ruc: '', businessName: this.customerName() };
      }
    }, () => this.refresh());
  }

  async onAction(event: { action: string; row: InstanceResponse }): Promise<void> {
    const row = event.row;
    switch (event.action) {
      case 'subscriptions':
        void this.router.navigate(['/private/billing/subscriptions'], { queryParams: { customerId: row.customerId, customer: row.customerName } });
        break;
      case 'provision':
        openModal<boolean>(this.modal, InstanceProvisionComponent, (ref) => { ref.componentInstance.instance = row; }, () => this.refresh());
        break;
      case 'upgrade':
        openModal<boolean>(this.modal, InstanceUpgradeComponent, (ref) => { ref.componentInstance.instance = row; }, () => this.refresh());
        break;
      case 'deployments':
        void this.router.navigate(['/private/erp/deployments'], { queryParams: { instanceId: row.id, instance: `${row.customerName} · ${row.name}` } });
        break;
      case 'edit':
        openModal<boolean>(this.modal, InstanceFormComponent, (ref) => { ref.componentInstance.instance = row; }, () => this.refresh());
        break;
      case 'rotate': {
        const ok = await this.alerts.show({
          title: 'Generar clave nueva',
          message: `La clave actual de ${row.name} (${row.customerName}) dejará de valer al instante: la instancia quedará sin contacto hasta que se actualice su License__Key. ¿Continuar?`,
          type: 'warning', showCancel: true, confirmText: 'Generar'
        });
        if (ok) {
          this.instances.rotateKey(row.id).subscribe({
            next: async (resp) => {
              if (resp.succeeded) {
                this.refresh();
                InstanceFormComponent.showKey(this.modal, resp.data as InstanceKeyResponse, row.name);
              } else {
                await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo generar la clave.'), 'warning');
              }
            },
            error: async (err) => {
              await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo generar la clave.'), 'danger');
            }
          });
        }
        break;
      }
      case 'delete': {
        const ok = await this.alerts.show({
          title: 'Eliminar instancia', message: `¿Eliminar ${row.name} de ${row.customerName}? Su clave dejará de valer y ya no recibirá licencia.`,
          type: 'warning', showCancel: true, confirmText: 'Eliminar'
        });
        if (ok) {
          runAction(this.alerts, this.instances.delete(row.id), 'No se pudo eliminar la instancia.', () => this.refresh());
        }
        break;
      }
    }
  }
}
