import { RoleGuard } from '@shared/guards/role.guard.service';
import { FeaturePageShellComponent } from './feature-page-shell/feature-page-shell.component';

export const featureRouteShell = (
  pageTitle: string,
  permission: string | null,
  description?: string,
  apiHint?: string
) => ({
  component: FeaturePageShellComponent,
  canActivate: permission ? [RoleGuard] : [],
  data: {
    pageTitle,
    description: description ?? 'Pantalla en implementación. Ver Docs/web-menus-registry.md',
    apiHint,
    requiredPermission: permission ? [permission] : []
  }
});
