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
import {
  PORTAL_ENABLED_OPTIONS, PortalAccessResponse, PortalSettings, REMOTE_ACTION_STATUS_OPTIONS, RemoteActionStatus
} from '../../models/api-sunat.models';
import { PortalAccessService } from '../../services/api-sunat.services';
import { PortalInviteComponent } from './portal-invite.component';

const P = 'Permissions.PortalAccess.';

/**
 * Portal de clientes de la API SUNAT: quién de cada cliente puede entrar y a qué empresas. La consola invita (el enlace de
 * activación le llega a la persona por correo; la consola nunca lo muestra), reinvita, deshabilita y habilita. Las invitaciones y
 * los cambios se cumplen solos en la API cada minuto; los que fallan se reintentan y los abandonados se reintentan desde aquí.
 */
@Component({
  selector: 'app-portal-list',
  imports: [SharedModule, ListTableComponent, PageHeaderComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent, FilterSelectComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-users" title="PORTAL DE CLIENTES" subtitle="Personas de cada cliente con acceso a consultar sus comprobantes y credenciales"
            help="Invitar guarda la invitación y, en unos minutos, la persona recibe un correo con un enlace para elegir su contraseña (vale 72 horas y sirve una sola vez). Si venció o no le llegó, reinvítela. Deshabilitar cierra sus sesiones en el portal. Si algo falla queda Fallido y se reintenta solo; Abandonado: corrija la causa y use Reintentar.">
            @if (customerName()) {
            <span headerFilters class="badge bg-light-primary text-primary d-inline-flex align-items-center gap-2 px-3 py-2">
              Cliente: {{ customerName() }}
              <button type="button" class="btn-close btn-sm" aria-label="Quitar filtro de cliente" (click)="clearCustomer()"></button>
            </span>
            }
            <app-filter-select headerFilters #enabledFilter [items]="enabledOptions" placeholder="Acceso" [currentValue]="isEnabled" (filterChange)="isEnabled = $event; refresh()"></app-filter-select>
            <app-filter-select headerFilters #statusFilter [items]="statuses" placeholder="Estado" [currentValue]="status" (filterChange)="status = $event; refresh()"></app-filter-select>
            <app-search-box-multiple headerFilters #searchBox [searchOptions]="searchOptions" (search)="search($event)" [currentValue]="text"></app-search-box-multiple>
            <app-button-reset-filters headerActions (buttonClick)="reset()"></app-button-reset-filters>
            @if (can('Invite')) {
            <button headerActions type="button" class="btn btn-primary" (click)="invite()"><em class="feather icon-user-plus"></em>INVITAR</button>
            }
          </app-page-header>
          @if (settings() && !settings()!.isConfigured) {
          <div class="alert alert-warning m-3 mb-0 small">
            El portal no tiene dirección pública https configurada (<code>Portal:PublicUrl</code>): las invitaciones esperan hasta que se configure.
          </div>
          }
          <div class="card-body p-0">
            <app-list-table [service]="portal" [columns]="columns" [getInputs]="getInputs()" [actions]="actions" (actionTriggered)="onAction($event)"></app-list-table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PortalListComponent {
  private destroyRef = inject(DestroyRef);
  @ViewChild('enabledFilter') enabledFilter?: FilterSelectComponent;
  @ViewChild('statusFilter') statusFilter?: FilterSelectComponent;
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;

  readonly enabledOptions = PORTAL_ENABLED_OPTIONS;
  readonly statuses = REMOTE_ACTION_STATUS_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Persona / Cliente', value: 1, placeholder: 'Buscar por correo, nombre, RUC o razón social', validation: [], validation_desc: '', icon: 'search' }
  ];
  readonly columns: TableColumns<PortalAccessResponse>[] = [
    col('PERSONA', 'personText'), col('CLIENTE', 'customerText'), col('EMPRESAS', 'issuersText'), col('ACCESO', 'accessText'),
    col('INVITADA', 'invitedText'), col('PRÓXIMO INTENTO', 'nextText'),
    { ...col<PortalAccessResponse>('ESTADO', 'stateText', 'badge'), tooltip: 'lastError' }, col('ÚLTIMO ERROR', 'lastError'), actionsCol()
  ];
  readonly actions: TableAction[] = [
    { id: 'reinvite', label: 'Reinvitar', icon: 'forward_to_inbox', color: 'primary', tooltip: 'Enviarle otro enlace de activación (o darle otras empresas)',
      visible: () => this.can('Invite') },
    { id: 'disable', label: 'Deshabilitar', icon: 'block', color: 'warn', tooltip: 'Cerrar sus sesiones y no dejarla entrar',
      visible: (r: PortalAccessResponse) => r.isEnabled && this.can('Manage') },
    { id: 'enable', label: 'Habilitar', icon: 'check_circle', color: 'primary', tooltip: 'Volver a dejarla entrar con su contraseña',
      visible: (r: PortalAccessResponse) => !r.isEnabled && r.invited && this.can('Manage') },
    { id: 'retry', label: 'Reintentar', icon: 'replay', color: 'primary', tooltip: 'Volver a intentarlo ahora',
      visible: (r: PortalAccessResponse) => (r.status === RemoteActionStatus.Failed || r.status === RemoteActionStatus.Abandoned) && this.can('Manage') }
  ];

  customerId: number | null = null;
  readonly customerName = signal('');
  readonly settings = signal<PortalSettings | null>(null);
  isEnabled: boolean | null = null;
  status: RemoteActionStatus | null = null;
  text = '';
  readonly getInputs = signal('');

  constructor(public portal: PortalAccessService, private perms: PermissionService, private modal: NgbModal,
    private alerts: AlertModalService, private route: ActivatedRoute, private router: Router, title: CustomTitleService) {
    title.set('Portal de clientes');
    this.portal.settings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (s) => this.settings.set(s), error: () => undefined });
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
    this.isEnabled = null;
    this.status = null;
    this.text = '';
    this.enabledFilter?.resetFilter();
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
      customerId: this.customerId, status: this.status, isEnabled: this.isEnabled === null ? null : String(this.isEnabled),
      textFilter: this.text, refresh: Math.random()
    }));
  }

  invite(row?: PortalAccessResponse): void {
    openModal<boolean>(this.modal, PortalInviteComponent, (ref) => {
      if (row) {
        ref.componentInstance.reinvite = row;
      } else if (this.customerId) {
        ref.componentInstance.presetCustomer = { id: this.customerId, name: this.customerName() };
      }
    }, () => this.refresh(), 'lg');
  }

  async onAction(event: { action: string; row: PortalAccessResponse }): Promise<void> {
    const row = event.row;
    switch (event.action) {
      case 'reinvite':
        this.invite(row);
        break;
      case 'disable': {
        const ok = await this.alerts.show({
          title: 'Deshabilitar acceso', message: `¿Impedir que ${row.name} (${row.email}) entre al portal? Se cerrarán sus sesiones.`,
          type: 'warning', showCancel: true, confirmText: 'Deshabilitar'
        });
        if (ok) {
          runAction(this.alerts, this.portal.setEnabled(row.id, false), 'No se pudo deshabilitar el acceso.', () => this.refresh());
        }
        break;
      }
      case 'enable':
        runAction(this.alerts, this.portal.setEnabled(row.id, true), 'No se pudo habilitar el acceso.', () => this.refresh());
        break;
      case 'retry':
        runAction(this.alerts, this.portal.retry(row.id), 'No se pudo reintentar.', () => this.refresh());
        break;
    }
  }
}
