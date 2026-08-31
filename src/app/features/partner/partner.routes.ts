import { Routes } from '@angular/router';
import { partnerAuthGuard } from './guards/partner-auth.guard';

/** Clinic-admin console. Mounted at /partner. */
export const PARTNER_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/partner-login/partner-login.component').then((m) => m.PartnerLoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/partner-signup/partner-signup.component').then((m) => m.PartnerSignupComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./pages/partner-shell/partner-shell.component').then((m) => m.PartnerShellComponent),
    canActivate: [partnerAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/partner-dashboard/partner-dashboard.component').then((m) => m.PartnerDashboardComponent),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./pages/partner-campaigns/partner-campaigns.component').then((m) => m.PartnerCampaignsComponent),
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./pages/partner-leads/partner-leads.component').then((m) => m.PartnerLeadsComponent),
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./pages/partner-offers/partner-offers.component').then((m) => m.PartnerOffersComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
