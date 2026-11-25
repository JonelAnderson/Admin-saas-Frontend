import { Component, ViewChild, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { FilterByStateComponent } from '@shared/components/reusables/filter-by-state/filter-by-state.component';
import { FilterSelectComponent } from '@shared/components/reusables/filter-select/filter-select.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { PermissionService } from '@shared/service/permission.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { PlanProduct, PlanResponse, PRODUCT_OPTIONS } from '../../models/billing.models';
import { PlanService } from '../../services/billing.services';
import { STATE_MENU, actionsCol, col, openModal, query, runAction } from '../list-helpers';
import { PlanFormComponent } from './plan-form.component';

const P = 'Permissions.Plans.';

@Component({
  selector: 'app-plan-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent,
    FilterByStateComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-layers" title="PLANES" subtitle="Planes comerciales del ERP y de la API SUNAT con sus precios y límites">
            <app-filter-select headerFilters [items]="products" placeholder="Producto" [currentValue]="product"
              (filterChange)="product = $event; refresh()"></app-filter-select>
            <app-filter-by-state headerFilters #stateFilter [currentMenu]="state!" [items]="stateMenu" (filterChange)="state = $event; refresh()"></app-filter-by-state>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Create')) {
            <button headerActions type="button" class="btn btn-primary" (click)="openForm(null)"><em class="feather icon-plus"></em>AGREGAR</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="plans" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PlanListComponent {
  @ViewChild('stateFilter') stateFilter?: FilterByStateComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly products = PRODUCT_OPTIONS;
  readonly stateMenu = STATE_MENU;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Código / Nombre', value: 1, placeholder: 'Buscar por código o nombre', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<PlanResponse>[] = [
    col('PRODUCTO', 'productName'), col('CÓDIGO', 'code'), col('NOMBRE', 'name'), col('PRECIO', 'priceText'),
    col('LÍMITES', 'limitsText'), col('PRUEBA (DÍAS)', 'trialDays'), col('ESTADO', 'isActive', 'badge'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'edit', label: 'Editar', icon: 'border_color', color: 'primary', tooltip: 'Editar plan', visible: () => this.can('Edit') },
    { id: 'state', label: (r: PlanResponse) => (r.isActive ? 'Desactivar' : 'Activar'), icon: (r: PlanResponse) => (r.isActive ? 'toggle_off' : 'toggle_on'),
      color: 'accent', tooltip: 'Activar / desactivar (uno inactivo no se ofrece en las suscripciones nuevas)', visible: () => this.can('ChangeState') },
    { id: 'delete', label: 'Eliminar', icon: 'delete', color: 'warn', tooltip: 'Eliminar (solo sin suscripciones abiertas)', visible: () => this.can('Delete') }
  ];

  product: PlanProduct | null = null;
  state: number | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public plans: PlanService, private perms: PermissionService, private modal: NgbModal, private alerts: AlertModalService,
    title: CustomTitleService) {
    title.set('Planes');
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
    this.product = null;
    this.state = null;
    this.text = '';
    this.stateFilter?.resetFilter();
    this.searchBox?.resetComplete();
    this.refresh();
  }

  refresh(): void {
    this.getInputs.set(query({ product: this.product, stateFilter: this.state, textFilter: this.text, refresh: Math.random() }));
  }

  openForm(planId: number | null): void {
    openModal<boolean>(this.modal, PlanFormComponent, (ref) => (ref.componentInstance.planId = planId), () => this.refresh(), 'lg');
  }

  async onAction(event: { action: string; row: PlanResponse }): Promise<void> {
    const row = event.row;
    if (event.action === 'edit') {
      this.openForm(row.id);
    } else if (event.action === 'state') {
      runAction(this.alerts, this.plans.changeState(row.id), 'No se pudo cambiar el estado.', () => this.refresh());
    } else if (event.action === 'delete') {
      const ok = await this.alerts.show({ title: 'Eliminar plan', message: `¿Eliminar el plan ${row.code}?`, type: 'warning', showCancel: true, confirmText: 'Eliminar' });
      if (ok) {
        runAction(this.alerts, this.plans.remove(row.id), 'No se pudo eliminar el plan.', () => this.refresh());
      }
    }
  }
}
