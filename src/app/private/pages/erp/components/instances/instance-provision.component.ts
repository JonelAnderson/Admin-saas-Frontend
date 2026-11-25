import { Component, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '@shared/shared.module';
import { AlertModalService } from '@shared/service/alert-modal.service';
import { serverMessages } from '../../../billing/models/billing.models';
import { InstanceResponse } from '../../models/erp.models';
import { ProvisionResponse, ProvisioningSettings, subdomainValidator, versionValidator } from '../../models/deployment.models';
import { DeploymentService } from '../../services/deployment.services';

/**
 * Monta en Coolify el stack de una instancia registrada. Pide subdominio y versión, encola el despliegue (corre en segundo plano) y
 * muestra UNA sola vez la contraseña inicial de los usuarios del ERP del cliente: el servidor no la guarda ni la vuelve a entregar.
 */
@Component({
  selector: 'app-instance-provision',
  imports: [SharedModule],
  template: `
    <div class="modal-header">
      <h5 class="modal-title color-modal-title"><em class="feather icon-upload-cloud"></em>{{ result() ? 'Instancia en camino' : 'Montar en Coolify' }}</h5>
      @if (!result()) {
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="activeModal.dismiss()"></button>
      }
    </div>
    @if (result(); as r) {
    <div class="modal-body">
      <p class="mb-2">El montaje de <strong>{{ instance?.name }}</strong> ya está en cola y corre en segundo plano. Sígalo en <em>Despliegues</em>. Quedará en <a [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.url }}</a>.</p>
      <p class="mb-1">Entrega al cliente: usuario <code>{{ r.initialAdminUser }}</code> (también existe <code>superadmin</code>) con esta contraseña inicial:</p>
      <div class="input-group mb-2">
        <input class="form-control font-monospace" readonly [value]="r.initialAdminPassword" aria-label="Contraseña inicial" #pwdBox (focus)="pwdBox.select()" />
        <button type="button" class="btn btn-outline-primary" (click)="copy(r.initialAdminPassword)"><em class="feather icon-copy"></em>{{ copied() ? 'Copiada' : 'Copiar' }}</button>
      </div>
      <div class="alert alert-warning mb-0 small">
        Esta contraseña <strong>no se vuelve a mostrar</strong>: la consola no la guarda. El ERP exige activar el segundo factor (MFA) al ingresar.
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" (click)="activeModal.close(true)">Ya la copié</button>
    </div>
    } @else {
    <div class="modal-body">
      @if (loading()) {
      <p class="text-muted mb-0">Cargando configuración…</p>
      } @else if (!settings()?.isConfigured) {
      <div class="alert alert-danger mb-0">
        El aprovisionamiento no está configurado en la consola: faltan <code>Provisioning:BaseDomain</code>, <code>Provisioning:ImageRepository</code>
        y <code>Provisioning:LicenseControlUrl</code> (https), y la conexión con Coolify (<code>Coolify:BaseUrl</code>, <code>Coolify:Token</code>,
        <code>Coolify:ProjectUuid</code>, <code>Coolify:ServerUuid</code>). Configúrelos en el servidor y reinicie la consola.
      </div>
      } @else {
      <p class="mb-3">Se creará el ERP de <strong>{{ instance?.customerName }}</strong> (instancia <strong>{{ instance?.name }}</strong>) con su propia base de datos.</p>
      <form [formGroup]="form" class="erp-form" novalidate>
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label" for="prov-sub">Subdominio <span class="erp-required">*</span></label>
            <div class="input-group">
              <input id="prov-sub" class="form-control" maxlength="30" formControlName="subdomain" placeholder="cliente" autocomplete="off"
                [class.is-invalid]="invalid('subdomain')" />
              <span class="input-group-text">.{{ settings()?.baseDomain }}</span>
            </div>
            @if (invalid('subdomain')) {
            <div class="invalid-feedback d-block">2 a 30 caracteres: minúsculas, números y guiones, sin guion al inicio ni al final.</div>
            }
            <div class="form-text">Dirección: <code>{{ preview() }}</code></div>
          </div>
          <div class="col-12">
            <label class="form-label" for="prov-ver">Versión de las imágenes <span class="erp-required">*</span></label>
            <input id="prov-ver" class="form-control" maxlength="40" formControlName="version" placeholder="1.0.0" autocomplete="off" [class.is-invalid]="invalid('version')" />
            @if (invalid('version')) {
            <div class="invalid-feedback d-block">Etiqueta de las imágenes (p. ej. 1.4.0): letras, números, punto, guion y guion bajo. No se acepta "latest".</div>
            }
          </div>
        </div>
      </form>
      <div class="alert alert-warning mt-3 mb-0 small">
        Se <strong>renueva la clave de licencia</strong> de esta instancia (la anterior deja de valer; solo se permite si aún no se conectó).
        El montaje corre en segundo plano (crea el servicio, carga sus variables y lo arranca, con reintentos): siga su avance en <em>Despliegues</em>.
      </div>
      }
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-light" (click)="activeModal.dismiss()">Cerrar</button>
      <button type="button" class="btn btn-primary" [disabled]="saving() || loading() || !settings()?.isConfigured" (click)="save()">Montar instancia</button>
    </div>
    }
  `
})
export class InstanceProvisionComponent implements OnInit {
  @Input() instance: InstanceResponse | null = null;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly settings = signal<ProvisioningSettings | null>(null);
  /** Solo vive mientras el modal está abierto: nunca se guarda ni se vuelve a pedir. */
  readonly result = signal<ProvisionResponse | null>(null);
  readonly copied = signal(false);
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private deployments: DeploymentService, private alerts: AlertModalService, public activeModal: NgbActiveModal) {
    this.form = this.fb.group({
      subdomain: ['', [Validators.required, Validators.maxLength(30), subdomainValidator]],
      version: ['', [Validators.required, Validators.maxLength(40), versionValidator]]
    });
  }

  ngOnInit(): void {
    this.deployments.settings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        if (settings.defaultVersion) {
          this.form.patchValue({ version: settings.defaultVersion });
        }
        this.loading.set(false);
      },
      error: () => {
        this.settings.set({ isConfigured: false });
        this.loading.set(false);
      }
    });
  }

  preview(): string {
    const sub = String(this.form.get('subdomain')?.value ?? '').trim().toLowerCase() || 'subdominio';
    return `https://${sub}.${this.settings()?.baseDomain ?? ''}`;
  }

  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || this.submitted);
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid || !this.instance) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.deployments.provision({
      instanceId: this.instance.id, subdomain: String(v.subdomain).trim().toLowerCase(), version: String(v.version).trim()
    }).subscribe({
      next: async (resp) => {
        this.saving.set(false);
        if (!resp.succeeded) {
          await this.alerts.showNotification('Atención', serverMessages(resp, 'No se pudo montar la instancia.'), 'warning');
          return;
        }
        this.result.set(resp.data as ProvisionResponse);
      },
      error: async (err) => {
        this.saving.set(false);
        await this.alerts.showNotification('Error', serverMessages(err?.error, 'No se pudo montar la instancia.'), 'danger');
      }
    });
  }

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
