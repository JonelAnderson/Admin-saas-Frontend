import { Component, ViewChild, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { FilterByStateComponent } from '@shared/components/reusables/filter-by-state/filter-by-state.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { PermissionService } from '@shared/service/permission.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { CustomerResponse } from '../../models/billing.models';
import { CustomerService } from '../../services/billing.services';
import { STATE_MENU, actionsCol, col, openModal, query, runAction } from '../list-helpers';
import { CustomerFormComponent } from './customer-form.component';
import { SubscriptionFormComponent } from '../subscriptions/subscription-form.component';

const P = 'Permissions.Customers.';

@Component({
  selector: 'app-customer-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterByStateComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-briefcase" title="CLIENTES" subtitle="Empresas que contratan el ERP y / o la API SUNAT">
            <app-filter-by-state headerFilters #stateFilter [currentMenu]="state!" [items]="stateMenu" (filterChange)="state = $event; refresh()"></app-filter-by-state>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Create')) {
            <button headerActions type="button" class="btn btn-primary" (click)="openForm(null)"><em class="feather icon-plus"></em>AGREGAR</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="customers" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CustomerListComponent {
  @ViewChild('stateFilter') stateFilter?: FilterByStateComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly stateMenu = STATE_MENU;
  readonly searchOptions: SearchOptions[] = [
    { label: 'RUC / Nombre', value: 1, placeholder: 'Buscar por RUC, razón social o nombre comercial', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<CustomerResponse>[] = [
    col('RUC', 'ruc'), col('RAZÓN SOCIAL', 'businessName'), col('NOMBRE COMERCIAL', 'tradeName'), col('CONTACTO', 'contactText'),
    col('SUSCRIPCIONES', 'openSubscriptions', 'number'), col('ESTADO', 'isActive', 'badge'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'subscriptions', label: 'Ver suscripciones', icon: 'repeat', color: 'primary', tooltip: 'Sus suscripciones',
      visible: () => this.perms.hasPermission('Permissions.Subscriptions.View') },
    { id: 'subscribe', label: 'Nueva suscripción', icon: 'add_circle', color: 'primary', tooltip: 'Suscribir a un plan',
      visible: (r: CustomerResponse) => r.isActive && this.perms.hasPermission('Permissions.Subscriptions.Create') },
    { id: 'edit', label: 'Editar', icon: 'border_color', color: 'primary', tooltip: 'Editar cliente', visible: () => this.can('Edit') },
    { id: 'state', label: (r: CustomerResponse) => (r.isActive ? 'Desactivar' : 'Activar'), icon: (r: CustomerResponse) => (r.isActive ? 'toggle_off' : 'toggle_on'),
      color: 'accent', tooltip: 'Uno inactivo no recibe suscripciones nuevas', visible: () => this.can('ChangeState') },
    { id: 'delete', label: 'Eliminar', icon: 'delete', color: 'warn', tooltip: 'Solo sin suscripciones abiertas',
      visible: (r: CustomerResponse) => this.can('Delete') && r.openSubscriptions === 0 }
  ];

  state: number | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public customers: CustomerService, private perms: PermissionService, private modal: NgbModal, private alerts: AlertModalService,
    private router: Router, title: CustomTitleService) {
    title.set('Clientes');
    this.refresh();
  }

  can(action: string): boolean {
    return this.perms.hasPermission(P + action);
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  reset(): void {
    this.state = null;
    this.text = '';
    this.stateFilter?.resetFilter();
    this.searchBox?.resetComplete();
    this.refresh();
  }

  refresh(): void {
    this.getInputs.set(query({ stateFilter: this.state, textFilter: this.text, refresh: Math.random() }));
  }

  openForm(customerId: number | null): void {
    openModal<boolean>(this.modal, CustomerFormComponent, (ref) => (ref.componentInstance.customerId = customerId), () => this.refresh(), 'lg');
  }

  async onAction(event: { action: string; row: CustomerResponse }): Promise<void> {
    const row = event.row;
    switch (event.action) {
      case 'subscriptions':
        void this.router.navigate(['/private/billing/subscriptions'], { queryParams: { customerId: row.id, customer: row.businessName } });
        break;
      case 'subscribe':
        openModal<boolean>(this.modal, SubscriptionFormComponent, (ref) => {
          ref.componentInstance.presetCustomer = { id: row.id, ruc: row.ruc, businessName: row.businessName, label: `${row.ruc} · ${row.businessName}` };
        }, () => this.refresh(), 'lg');
        break;
      case 'edit':
        this.openForm(row.id);
        break;
      case 'state':
        runAction(this.alerts, this.customers.changeState(row.id), 'No se pudo cambiar el estado.', () => this.refresh());
        break;
      case 'delete': {
        const ok = await this.alerts.show({ title: 'Eliminar cliente', message: `¿Eliminar a ${row.businessName}?`, type: 'warning', showCancel: true, confirmText: 'Eliminar' });
        if (ok) {
          runAction(this.alerts, this.customers.remove(row.id), 'No se pudo eliminar el cliente.', () => this.refresh());
        }
        break;
      }
    }
  }
}
