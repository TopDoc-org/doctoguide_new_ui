import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';

/** Global super-admin console. Mounted at /admin (see app.routes.ts), which
 *  carries the realm's `data.seo` noindex — these children inherit it via
 *  AppComponent.collectSeo()'s route.firstChild walk. */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/admin-login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-shell/admin-shell.component').then((m) => m.AdminShellComponent),
    canActivate: [adminAuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/admin-overview/admin-overview.component').then((m) => m.AdminOverviewComponent),
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./pages/admin-leads/admin-leads.component').then((m) => m.AdminLeadsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
