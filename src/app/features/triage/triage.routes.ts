import { Routes } from '@angular/router';

/**
 * Patient-facing symptom-check app. Mounted at /triage (see app.routes.ts),
 * whose parent carries the realm's noindex `data.seo`.
 *
 * NOTE: there is no route guard here, by design. Patient auth is a COMPONENT
 * gate (auth-gate) embedded in the shell, which lets an anonymous user run a
 * whole consult and only asks for a PIN at the point of a gated action.
 */
export const TRIAGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/triage-shell/triage-shell.component').then((m) => m.TriageShellComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'change-pin',
    loadComponent: () =>
      import('./components/change-pin-panel/change-pin-panel.component').then(
        (m) => m.ChangePinPanelComponent,
      ),
  },
];
