import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  appName: 'DoctoGuide', // single source for the user-facing product name
  serverUrl: 'https://backend.knocdoc.in',
  // Canonical public origin. Used for canonical/OG URLs and for building
  // partner campaign links. Never derive that from window.location.origin —
  // inside the Capacitor WebView the origin is https://localhost.
  siteUrl: 'https://doctoguide.knocdoc.in',
  aiBase: '/ai-doctor',
  userBase: '/user',
  partnerBase: '/partner', // clinic affiliate / sales-funnel endpoints
  adminBase: '/admin', // global super-admin console (cross-clinic)
  ownerBase: '/owner', // creator console (app-wide, owners only)
  emergencyNumbers: { all: '112', ambulance: '112' },
  // Social handle, shown in the landing footer and in the post-report follow ask.
  instagram: { handle: '@knocdoc_health', url: 'https://www.instagram.com/knocdoc_health' },
  // Support WhatsApp. Split into parts so the full number is not one searchable
  // literal, and never bound into a template: the pages render an icon-only button
  // and assemble the link at click time (see openWhatsApp() in the landing
  // components), so no phone number reaches the prerendered HTML.
  whatsapp: {
    cc: '91',
    subscriber: '9437975834',
    text: 'Hi, I would like to know more about DoctoGuide.',
  },
  firebaseConfig: {
    apiKey: 'AIzaSyAv9k9_NriTCecvSmDX5RirInV2aMvPmlY',
    authDomain: 'doctoguide-a36c9.firebaseapp.com',
    projectId: 'doctoguide-a36c9',
    storageBucket: 'doctoguide-a36c9.firebasestorage.app',
    messagingSenderId: '75571510567',
    appId: '1:75571510567:web:96182ea8905d3eac32bd02',
    measurementId: 'G-EK0REP2Q0P',
  },
};
