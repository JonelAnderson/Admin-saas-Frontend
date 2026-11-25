import { Component, Input, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';

/**
 * Muestra la clave de licencia de una instancia. Es la única vez: el servidor solo guarda su hash, así que si se pierde hay
 * que generar otra (y la anterior deja de valer).
 */
@Component({
  selector: 'app-instance-key',
  imports: [SharedModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-key"></em>Clave de licencia</h5>
    </div>
    <div class="modal-body">
      <p class="mb-2">Copie la clave de <strong>{{ instanceName }}</strong> y póngala en la instancia como <code>License__Key</code>.</p>
      <div class="input-group mb-2">
        <input class="form-control font-monospace" readonly [value]="licenseKey" aria-label="Clave de licencia" #keyBox (focus)="keyBox.select()" />
        <button type="button" class="btn btn-outline-primary" (click)="copy()"><em class="feather icon-copy"></em>{{ copied() ? 'Copiada' : 'Copiar' }}</button>
      </div>
      <div class="alert alert-warning mb-0 small">
        Esta clave <strong>no se vuelve a mostrar</strong>: en la consola solo queda su huella. Si se pierde, genere una nueva.
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" (click)="activeModal.close(true)">Ya la copié</button>
    </div>
  `
})
export class InstanceKeyComponent {
  @Input() licenseKey = '';
  @Input() instanceName = '';
  readonly copied = signal(false);

  constructor(public activeModal: NgbActiveModal) {}

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.licenseKey);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
