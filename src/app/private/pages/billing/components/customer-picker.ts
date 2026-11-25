import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { CustomerLookup } from '../models/billing.models';
import { CustomerService } from '../services/billing.services';

/**
 * Buscador de clientes para ng-select con [typeahead]: busca en el servidor (Customer/Lookup, máx. 30) mientras se escribe.
 * Se crea en el constructor del componente (usa inject).
 */
export class CustomerPicker {
  private customers = inject(CustomerService);
  readonly search$ = new Subject<string>();
  readonly items = signal<CustomerLookup[]>([]);
  readonly loading = signal(false);

  constructor() {
    this.search$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap(() => this.loading.set(true)),
      switchMap((text) => this.customers.lookup(text ?? '')),
      takeUntilDestroyed(inject(DestroyRef))
    ).subscribe((rows) => {
      this.items.set(rows);
      this.loading.set(false);
    });
  }

  /** Carga la primera página (sin texto) al abrir el formulario. */
  start(preset?: CustomerLookup | null): void {
    if (preset) {
      this.items.set([preset]);
      return;
    }
    this.search$.next('');
  }
}
