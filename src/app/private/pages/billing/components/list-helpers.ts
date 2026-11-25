import { TableColumns } from '@shared/models/list-table.interface';
import { MenuItems } from '@shared/models/menu-items.interface';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { BaseResponse } from '@shared/models/base-api-response.interface';
import { Observable } from 'rxjs';
import { serverMessages } from '../models/billing.models';

/** Columna de app-list-table con los estilos de siempre. */
export function col<T>(label: string, property: keyof T | string, type: TableColumns<T>['type'] = 'text'): TableColumns<T> {
  return { label, cssLabel: ['font-bold', 'text-sm'], property, cssProperty: ['text-sm'], type, sticky: false, visible: true };
}

export function actionsCol<T>(): TableColumns<T> {
  return {
    label: 'ACCIONES', cssLabel: ['font-bold', 'text-sm', 'text-center'], property: 'actions', cssProperty: ['text-sm', 'text-center'],
    type: 'actions', sticky: false, visible: true, download: false
  };
}

export const STATE_MENU: MenuItems[] = [
  { type: 'link', id: 'all', icon: 'layers', label: 'Todos' },
  { type: 'link', id: 'Activo', value: 1, icon: 'check-circle', label: 'Activo', class: { icon: 'text-success' } },
  { type: 'link', id: 'Inactivo', value: 0, icon: 'x-circle', label: 'Inactivo', class: { icon: 'text-danger' } }
];

/** Arma la parte de filtros de la URL (&clave=valor) con los valores no vacíos. */
export function query(values: Record<string, string | number | null | undefined>): string {
  return Object.entries(values)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`)
    .join('');
}

export const MODAL_OPTIONS = { backdrop: 'static' as const, keyboard: false, centered: true, scrollable: true };

/** Abre un modal y ejecuta `onClose` si se cerró con un resultado (no con Cancelar). */
export function openModal<T>(modal: NgbModal, component: unknown, setup: (ref: NgbModalRef) => void, onClose: (result: T) => void,
  size?: 'lg' | 'xl'): void {
  const ref = modal.open(component, { ...MODAL_OPTIONS, size });
  setup(ref);
  ref.result.then((result: T) => {
    if (result) {
      onClose(result);
    }
  }).catch(() => undefined);
}

/** Ejecuta una acción del servidor y avisa el resultado; `done` se llama solo si salió bien. */
export function runAction(alerts: AlertModalService, call: Observable<BaseResponse>, failText: string, done: () => void): void {
  call.subscribe({
    next: async (resp) => {
      if (resp.succeeded) {
        done();
        await alerts.showNotification('Listo', serverMessages(resp, 'Operación realizada.'), 'success');
      } else {
        await alerts.showNotification('Atención', serverMessages(resp, failText), 'warning');
      }
    },
    error: async (err) => {
      await alerts.showNotification('Error', serverMessages(err?.error, failText), 'danger');
    }
  });
}
