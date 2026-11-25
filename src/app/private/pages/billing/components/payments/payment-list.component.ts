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
import { DateRangeYmd, FilterDateRangeYmdComponent } from '@shared/components/reusables/filter-date-range-ymd/filter-date-range-ymd.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { PermissionService } from '@shared/service/permission.service';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS, PaymentMethod, PaymentResponse, PaymentStatus } from '../../models/billing.models';
import { PaymentService } from '../../services/billing.services';
import { actionsCol, col, openModal, query, runAction } from '../list-helpers';
import { ReasonModalComponent, ReasonModalResult } from '../reason-modal/reason-modal.component';
import { PaymentRegisterComponent } from './payment-register.component';

/** Pagos de los clientes, del más reciente al más antiguo. Se registran y se anulan (solo el último de cada suscripción). */
@Component({
  selector: 'app-payment-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent,
    FilterDateRangeYmdComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-dollar-sign" title="PAGOS" subtitle="Cada pago extiende el pagado hasta de su suscripción; no se editan, se anulan con motivo">
            @if (subscriptionName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              {{ subscriptionName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de suscripción" (click)="clearSubscription()"></button>
            </span>
            }
            <app-filter-date-range-ymd headerFilters #dateFilter (rangeDate)="range($event)"></app-filter-date-range-ymd>
            <app-filter-select headerFilters #methodFilter [items]="methods" placeholder="Medio" [currentValue]="method" (filterChange)="method = $event; refresh()"></app-filter-select>
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (perms.hasPermission('Permissions.Payments.Create')) {
            <button headerActions type="button" class="btn btn-primary" (click)="register()"><em class="feather icon-plus"></em>REGISTRAR</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="payments" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('dateFilter') dateFilter?: FilterDateRangeYmdComponent;
  @ViewChild('methodFilter') methodFilter?: FilterSelectComponent;
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly methods = PAYMENT_METHOD_OPTIONS;
  readonly statuses = PAYMENT_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Cliente / Operación', value: 1, placeholder: 'Buscar por RUC, razón social o n.º de operación', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<PaymentResponse>[] = [
    col('FECHA', 'paidOnText'), col('CLIENTE', 'customerText'), col('PRODUCTO', 'productName'), col('PLAN', 'planName'),
    col('MONTO', 'amountText'), col('MEDIO', 'methodName'), col('OPERACIÓN', 'operationNumber'), col('CUBRE', 'periodText'),
    { ...col<PaymentResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'voidReason' }, actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'void', label: 'Anular', icon: 'block', color: 'warn', tooltip: 'Solo el último pago de la suscripción',
      visible: (r: PaymentResponse) => r.status === PaymentStatus.Registered && this.perms.hasPermission('Permissions.Payments.Void') }
  ];

  subscriptionId: number | null = null;
  readonly subscriptionName = signal('');
  method: PaymentMethod | null = null;
  status: PaymentStatus | null = null;
  startDate = '';
  endDate = '';
  text = '';
  readonly getInputs = signal('');

  constructor(public payments: PaymentService, public perms: PermissionService, private modal: NgbModal, private alerts: AlertModalService,
    private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Pagos');
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('subscriptionId'));
      this.subscriptionId = id > 0 ? id : null;
      this.subscriptionName.set(this.subscriptionId ? params.get('subscription') ?? `Suscripción #${this.subscriptionId}` : '');
      this.refresh();
    });
  }

  search(data: FiltersBox): void {
    this.text = data.searchData;
    this.refresh();
  }

  range(value: DateRangeYmd): void {
    this.startDate = value.startDate;
    this.endDate = value.endDate;
    this.refresh();
  }

  clearSubscription(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  reset(): void {
    this.method = null;
    this.status = null;
    this.startDate = '';
    this.endDate = '';
    this.text = '';
    this.dateFilter?.resetFilter();
    this.methodFilter?.resetFilter();
    this.statusFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.subscriptionId) {
      this.clearSubscription();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({
      subscriptionId: this.subscriptionId, method: this.method, status: this.status, startDate: this.startDate, endDate: this.endDate,
      textFilter: this.text, refresh: Math.random()
    }));
  }

  register(): void {
    openModal<boolean>(this.modal, PaymentRegisterComponent, () => undefined, () => this.refresh(), 'lg');
  }

  onAction(event: { action: string; row: PaymentResponse }): void {
    const p = event.row;
    if (event.action !== 'void') {
      return;
    }
    openModal<ReasonModalResult>(this.modal, ReasonModalComponent, (ref) => Object.assign(ref.componentInstance, {
      title: 'Anular pago', icon: 'icon-slash', confirmText: 'Anular pago', confirmClass: 'btn-danger',
      description: `${p.customerName} · ${p.amountText} del ${p.paidOnText}. El "pagado hasta" de la suscripción vuelve a la fecha anterior.`
    }), (r) => runAction(this.alerts, this.payments.void(p.id, r.reason), 'No se pudo anular el pago.', () => this.refresh()));
  }
}
