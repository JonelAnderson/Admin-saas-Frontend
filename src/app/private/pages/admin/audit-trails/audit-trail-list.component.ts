import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { ListTableComponent } from '@shared/components/reusables/list-table/list-table.component';
import { SearchBoxMultipleComponent } from '@shared/components/reusables/search-box-multiple/search-box-multiple.component';
import { ButtonResetFiltersComponent } from '@shared/components/reusables/button-reset-filters/button-reset-filters.component';
import { FilterSelectComponent } from '@shared/components/reusables/filter-select/filter-select.component';
import { DateRangeYmd, FilterDateRangeYmdComponent } from '@shared/components/reusables/filter-date-range-ymd/filter-date-range-ymd.component';
import { FiltersBox, SearchOptions } from '@shared/models/search-options.interface';
import { TableColumns } from '@shared/models/list-table.interface';
import { TableAction } from '@shared/models/table-action.interface';
import { CustomTitleService } from '@shared/service/custom-title.service';
import { AUDIT_TYPE_OPTIONS, AuditTrail } from './audit-trail.models';
import { AuditTrailService } from './audit-trail.service';
import { AuditTrailDetailComponent } from './audit-trail-detail.component';

/** Búsqueda: 1 = usuario, 2 = clave o valores del registro. */
const SEARCH_USER = 1;
const SEARCH_VALUES = 2;

function col(label: string, property: keyof AuditTrail | 'actions', type: TableColumns<AuditTrail>['type'] = 'text'): TableColumns<AuditTrail> {
  return {
    label,
    cssLabel: ['font-bold', 'text-sm'],
    property,
    cssProperty: ['text-sm'],
    type,
    sticky: false,
    visible: true,
    download: type !== 'actions'
  };
}

/**
 * /private/admin/audit-trails: quién creó, modificó o eliminó qué y cuándo, en todas las empresas. Solo SuperAdmin (la ruta lo
 * exige y la API lo vuelve a validar).
 */
@Component({
  selector: 'app-audit-trail-list',
  imports: [SharedModule, PageHeaderComponent, ListTableComponent, SearchBoxMultipleComponent, ButtonResetFiltersComponent,
    FilterSelectComponent, FilterDateRangeYmdComponent],
  templateUrl: './audit-trail-list.component.html'
})
export class AuditTrailListComponent implements OnInit {
  @ViewChild('searchBox') searchBox?: SearchBoxMultipleComponent;
  @ViewChild('tableFilter') tableFilter?: FilterSelectComponent;
  @ViewChild('typeFilter') typeFilter?: FilterSelectComponent;
  @ViewChild('dateFilter') dateFilter?: FilterDateRangeYmdComponent;

  readonly types = AUDIT_TYPE_OPTIONS;
  readonly searchOptions: SearchOptions[] = [
    { label: 'Usuario', value: SEARCH_USER, placeholder: 'Usuario, nombres o apellidos', validation: [], validation_desc: '', icon: 'user' },
    { label: 'Clave / valores', value: SEARCH_VALUES, placeholder: 'Id, nombre, código… del registro', validation: [], validation_desc: '', icon: 'hash' }
  ];
  readonly columns: TableColumns<AuditTrail>[] = [
    col('FECHA Y HORA', 'dateTime', 'datetime'),
    col('USUARIO', 'userLabel'),
    col('ACCIÓN', 'typeLabel', 'badge'),
    col('ENTIDAD', 'tableName'),
    col('CLAVE', 'keyLabel'),
    col('IP', 'ipAddress'),
    col('ACCIONES', 'actions', 'actions')
  ];
  readonly actions: TableAction[] = [{ id: 'detail', label: 'Ver detalle', icon: 'visibility', color: 'primary' }];

  tables = signal<{ id: string; name: string }[]>([]);
  getInputs = signal('');
  from = signal('');
  to = signal('');
  private filters = { tableName: '', type: '', user: '', textFilter: '' };

  constructor(
    public audits: AuditTrailService,
    private modal: NgbModal,
    title: CustomTitleService
  ) {
    title.set('Auditoría');
  }

  ngOnInit(): void {
    this.audits.tables().subscribe((list) => this.tables.set(list));
    this.apply();
  }

  apply(refresh = false): void {
    const params: Record<string, string> = {
      tableName: this.filters.tableName,
      type: this.filters.type,
      user: this.filters.user,
      textFilter: this.filters.textFilter,
      startDate: this.from(),
      endDate: this.to()
    };
    let query = '';
    for (const [k, v] of Object.entries(params)) {
      if (v) query += `&${k}=${encodeURIComponent(v)}`;
    }
    if (refresh) query += `&refresh=${Math.random()}`;
    this.getInputs.set(query);
  }

  onTable(table: string | null): void {
    this.filters.tableName = table ?? '';
    this.apply();
  }

  onType(type: string | null): void {
    this.filters.type = type ?? '';
    this.apply();
  }

  onDates(range: DateRangeYmd): void {
    this.from.set(range.startDate);
    this.to.set(range.endDate);
    if (this.from() && this.to() && this.from() > this.to()) return;
    this.apply();
  }

  search(data: FiltersBox): void {
    // Un solo cuadro con dos opciones: la otra búsqueda se limpia.
    const byUser = data.searchValue === SEARCH_USER;
    this.filters.user = byUser ? data.searchData : '';
    this.filters.textFilter = byUser ? '' : data.searchData;
    this.apply();
  }

  reset(): void {
    this.filters = { tableName: '', type: '', user: '', textFilter: '' };
    this.from.set('');
    this.to.set('');
    this.searchBox?.resetComplete();
    this.tableFilter?.resetFilter();
    this.typeFilter?.resetFilter();
    this.dateFilter?.resetFilter();
    this.apply();
  }

  refresh(): void {
    this.audits.tables().subscribe((list) => this.tables.set(list));
    this.apply(true);
  }

  onAction(event: { action: string; row: AuditTrail }): void {
    if (event.action !== 'detail') return;
    const ref = this.modal.open(AuditTrailDetailComponent, { size: 'lg', centered: true, scrollable: true });
    ref.componentInstance.row = event.row;
  }
}
