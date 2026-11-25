import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { PageHeaderComponent } from '@shared/components/reusables/page-header/page-header.component';
import { CustomTitleService } from '@shared/service/custom-title.service';

@Component({
  selector: 'app-feature-page-shell',
  imports: [SharedModule, PageHeaderComponent],
  template: `
    <div class="row btn-page">
      <div class="col-sm-12">
        <div class="card">
          <app-page-header icon="icon-tool" [title]="title()"></app-page-header>
          <div class="card-body">
            <div class="erp-empty">
              <span class="erp-empty__icon" aria-hidden="true"><em class="feather icon-tool"></em></span>
              <p class="erp-empty__text">{{ description() }}</p>
              @if (apiHint()) {
                <p class="erp-empty__text small mt-1"><code>API: {{ apiHint() }}</code></p>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FeaturePageShellComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private customTitle = inject(CustomTitleService);

  title = signal('');
  description = signal('Pantalla en implementación.');
  apiHint = signal('');

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    const pageTitle = (data['pageTitle'] as string) ?? '';
    this.title.set(pageTitle);
    this.customTitle.set(pageTitle);
    this.description.set((data['description'] as string) ?? 'Pantalla en implementación.');
    this.apiHint.set((data['apiHint'] as string) ?? '');
  }
}
