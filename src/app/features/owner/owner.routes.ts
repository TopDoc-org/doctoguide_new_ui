import { Routes } from '@angular/router';
import { ownerAuthGuard } from './guards/owner-auth.guard';

/** Creator (platform-owner) console. Mounted at /owner. */
export const OWNER_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/owner-login/owner-login.component').then((m) => m.OwnerLoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/owner-shell/owner-shell.component').then((m) => m.OwnerShellComponent),
    canActivate: [ownerAuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./pages/owner-home/owner-home.component').then((m) => m.OwnerHomeComponent),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./pages/owner-campaigns/owner-campaigns.component').then((m) => m.OwnerCampaignsComponent),
      },
      {
        path: 'clinics',
        loadComponent: () =>
          import('./pages/owner-clinics/owner-clinics.component').then((m) => m.OwnerClinicsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
