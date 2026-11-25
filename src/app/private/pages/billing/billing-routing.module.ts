import { Routes } from '@angular/router';
import { RoleGuard } from '@shared/guards/role.guard.service';
import { PlanListComponent } from './components/plans/plan-list.component';
import { CustomerListComponent } from './components/customers/customer-list.component';
import { SubscriptionListComponent } from './components/subscriptions/subscription-list.component';
import { PaymentListComponent } from './components/payments/payment-list.component';
import { NotificationListComponent } from './components/notifications/notification-list.component';

/** Comercial: las Urls coinciden con deploy/sql/menus-platform.sql del backend. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customers' },
  { path: 'customers', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Customers.Menu'] }, component: CustomerListComponent },
  { path: 'subscriptions', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Subscriptions.Menu'] }, component: SubscriptionListComponent },
  { path: 'payments', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Payments.Menu'] }, component: PaymentListComponent },
  { path: 'plans', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Plans.Menu'] }, component: PlanListComponent },
  { path: 'notifications', canActivate: [RoleGuard], data: { requiredPermission: ['Permissions.Notifications.Menu'] }, component: NotificationListComponent }
];
