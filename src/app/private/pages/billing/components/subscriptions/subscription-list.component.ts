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
import {
  PRODUCT_OPTIONS, PlanProduct, SUBSCRIPTION_STATUS_OPTIONS, SubscriptionResponse, SubscriptionStatus, limaTodayYmd
} from '../../models/billing.models';
import { SubscriptionService } from '../../services/billing.services';
import { actionsCol, col, openModal, query, runAction } from '../list-helpers';
import { ReasonModalComponent, ReasonModalResult } from '../reason-modal/reason-modal.component';
import { SubscriptionFormComponent } from './subscription-form.component';
import { PaymentRegisterComponent } from '../payments/payment-register.component';

const P = 'Permissions.Subscriptions.';
const open = (s: SubscriptionResponse) => s.status !== SubscriptionStatus.Cancelled;

/** Qué cliente tiene qué plan, con su estado. Las acciones que cambian el estado piden motivo. */
@Component({
  selector: 'app-subscription-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-repeat" title="SUSCRIPCIONES" subtitle="Qué cliente tiene qué plan; las que vencen antes aparecen primero"
            help="Estados: Prueba → Activa → En gracia (entra con aviso) → Suspendida. Se recalculan cada día a las 6:00 y con cada pago o acción.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearCustomer()"></button>
            </span>
            }
            <app-filter-select headerFilters #productFilter [items]="products" placeholder="Producto" [currentValue]="product" (filterChange)="product = $event; refresh()"></app-filter-select>
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Create')) {
            <button headerActions type="button" class="btn btn-primary" (click)="create()"><em class="feather icon-plus"></em>NUEVA</button>
            }
          </app-page-header>
          <div class="card-body p-0">
            <app-list-table [service]="subscriptions" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SubscriptionListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('productFilter') productFilter?: FilterSelectComponent;
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly products = PRODUCT_OPTIONS;
  readonly statuses = SUBSCRIPTION_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Cliente / Plan', value: 1, placeholder: 'Buscar por RUC, razón social o plan', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<SubscriptionResponse>[] = [
    col('CLIENTE', 'customerText'), col('PRODUCTO', 'productName'), col('PLAN', 'planName'), col('PRECIO', 'priceText'),
    col('CUBIERTO HASTA', 'coveredUntilText'), col('SE SUSPENDE', 'suspendOnText'),
    { ...col<SubscriptionResponse>('ESTADO', 'statusName', 'badge'), tooltip: 'statusReason' }, actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'pay', label: 'Registrar pago', icon: 'payments', color: 'primary', tooltip: 'Extiende el pagado hasta',
      visible: (r: SubscriptionResponse) => open(r) && this.perms.hasPermission('Permissions.Payments.Create') },
    { id: 'payments', label: 'Ver pagos', icon: 'receipt_long', color: 'primary', tooltip: 'Pagos de esta suscripción',
      visible: () => this.perms.hasPermission('Permissions.Payments.View') },
    { id: 'edit', label: 'Editar', icon: 'border_color', color: 'primary', tooltip: 'Plan, ciclo, precio, vencimiento y gracia',
      visible: (r: SubscriptionResponse) => open(r) && this.can('Edit') },
    { id: 'extend', label: 'Prorrogar', icon: 'event_available', color: 'accent', tooltip: 'Mover el pagado hasta (con motivo)',
      visible: (r: SubscriptionResponse) => open(r) && this.can('Extend') },
    { id: 'suspend', label: 'Suspender', icon: 'pause_circle', color: 'warn', tooltip: 'Suspensión manual (con motivo)',
      visible: (r: SubscriptionResponse) => open(r) && !r.suspendedManually && this.can('Suspend') },
    { id: 'reactivate', label: 'Reactivar', icon: 'play_circle', color: 'primary', tooltip: 'Levantar la suspensión manual',
      visible: (r: SubscriptionResponse) => open(r) && r.suspendedManually && this.can('Suspend') },
    { id: 'cancel', label: 'Cancelar', icon: 'cancel', color: 'warn', tooltip: 'Baja definitiva (con motivo)',
      visible: (r: SubscriptionResponse) => open(r) && this.can('Cancel') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  product: PlanProduct | null = null;
  status: SubscriptionStatus | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public subscriptions: SubscriptionService, private perms: PermissionService, private modal: NgbModal,
    private alerts: AlertModalService, private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Suscripciones');
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
    this.product = null;
    this.status = null;
    this.text = '';
    this.productFilter?.resetFilter();
    this.statusFilter?.resetFilter();
    this.searchBox?.resetComplete();
    if (this.customerId) {
      this.clearCustomer();
    } else {
      this.refresh();
    }
  }

  refresh(): void {
    this.getInputs.set(query({
      customerId: this.customerId, product: this.product, status: this.status, textFilter: this.text, refresh: Math.random()
    }));
  }

  create(): void {
    openModal<boolean>(this.modal, SubscriptionFormComponent, () => undefined, () => this.refresh(), 'lg');
  }

  private askReason(title: string, description: string, confirmText: string, confirmClass: string, onReason: (r: ReasonModalResult) => void,
    date?: { label: string; min: string; value: string }): void {
    openModal<ReasonModalResult>(this.modal, ReasonModalComponent, (ref) => {
      Object.assign(ref.componentInstance, { title, description, confirmText, confirmClass, icon: 'icon-repeat' });
      if (date) {
        Object.assign(ref.componentInstance, { askDate: true, dateLabel: date.label, minDate: date.min, defaultDate: date.value });
      }
    }, onReason);
  }

  onAction(event: { action: string; row: SubscriptionResponse }): void {
    const s = event.row;
    const who = `${s.customerName} · ${s.planName}`;
    switch (event.action) {
      case 'pay':
        openModal<boolean>(this.modal, PaymentRegisterComponent, (ref) => (ref.componentInstance.presetSubscription = s), () => this.refresh(), 'lg');
        break;
      case 'payments':
        void this.router.navigate(['/private/billing/payments'], { queryParams: { subscriptionId: s.id, subscription: who } });
        break;
      case 'edit':
        openModal<boolean>(this.modal, SubscriptionFormComponent, (ref) => (ref.componentInstance.subscriptionId = s.id), () => this.refresh(), 'lg');
        break;
      case 'extend':
        this.askReason('Prorrogar', `${who}. Cubierto hasta ${s.coveredUntilText}. No reemplaza a un pago: úsela para cortesías o acuerdos.`,
          'Prorrogar', 'btn-primary',
          (r) => runAction(this.alerts, this.subscriptions.extend(s.id, r.date!, r.reason), 'No se pudo prorrogar.', () => this.refresh()),
          { label: 'Pagado hasta (nueva fecha)', min: limaTodayYmd(), value: '' });
        break;
      case 'suspend':
        this.askReason('Suspender', `${who}. Queda suspendida aunque esté al día, hasta reactivarla.`, 'Suspender', 'btn-danger',
          (r) => runAction(this.alerts, this.subscriptions.reasonAction('suspend', s.id, r.reason), 'No se pudo suspender.', () => this.refresh()));
        break;
      case 'reactivate':
        this.askReason('Reactivar', `${who}. Si además está vencida, seguirá suspendida por falta de pago.`, 'Reactivar', 'btn-primary',
          (r) => runAction(this.alerts, this.subscriptions.reasonAction('reactivate', s.id, r.reason), 'No se pudo reactivar.', () => this.refresh()));
        break;
      case 'cancel':
        this.askReason('Cancelar suscripción', `${who}. Es definitivo: no recibe más pagos ni acciones.`, 'Cancelar suscripción', 'btn-danger',
          (r) => runAction(this.alerts, this.subscriptions.reasonAction('cancel', s.id, r.reason), 'No se pudo cancelar.', () => this.refresh()));
        break;
    }
  }
}
