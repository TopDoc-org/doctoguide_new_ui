import { Routes } from '@angular/router';
import { HEALTH_TOPICS } from './features/seo-pages/health-topics.data';
import { SITE_URL } from './core/config/site';

/**
 * Public route table, ported verbatim from v1's app-routing.module.ts.
 *
 * Every `data.seo` block below is byte-identical to v1 — those strings are the
 * SEO contract and are diffed against the prerender baseline, so do not
 * "improve" the copy here.
 *
 * Two structural changes from v1:
 *   - `component:` became `loadComponent:`, so each page is its own chunk.
 *   - the four console realms (/triage, /partner, /admin, /owner) are NOT here
 *     yet; they arrive in Phases 6-7 as NESTED routes with a parent carrying
 *     `data.seo`, because AppComponent.collectSeo() walks route.firstChild for
 *     inheritance and flattening them would silently drop their `noindex`.
 */
const healthTopicRoutes: Routes = HEALTH_TOPICS.map((topic) => ({
  path: `health-topics/${topic.slug}`,
  loadComponent: () =>
      import('./features/seo-pages/health-topic-page.component').then((m) => m.HealthTopicPageComponent),
  data: {
    topicSlug: topic.slug,
    seo: { title: topic.title, description: topic.description },
  },
}));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
    data: {
      seo: {
        // Brand first: the primary objective is ranking for the term "DoctoGuide".
        // No %COUNTRY% token here — the title is already at the 60-character limit,
        // and a token that expands at runtime would push it past truncation.
        title: 'DoctoGuide — AI Health Assistant & Symptom Checker | KnocDoc',
        description:
          'DoctoGuide is a free AI health assistant and symptom checker by KnocDoc. Describe your symptoms, understand possible explanations and urgency, and learn which specialist to see in %COUNTRY%. Informational guidance only — not medical advice.',
      },
    },
  },
  {
    // Paid-traffic landing page (Google Ads final URL). Kept OUT of the search
    // index so it never competes with `/` for the same queries, and out of
    // sitemap.xml (scripts/postbuild-seo.js). See ADS_COMPLIANCE_PLAN.md for why
    // its copy deliberately carries no personal-health vocabulary.
    path: 'start',
    loadComponent: () =>
      import('./features/landing/ad-landing.component').then((m) => m.AdLandingComponent),
    data: {
      seo: {
        // These two strings ship in <title>, <meta name="description">,
        // og:title/description and twitter:title/description on the ad landing
        // page — the first text any crawler reads. They carry no health,
        // medical or doctor vocabulary for the same reason the body copy does
        // not. See ADS_COMPLIANCE_PLAN.md 3.3.
        title: 'DoctoGuide by KnocDoc — Know Who to Book',
        description:
          'Free tool from KnocDoc. Tell it what you are looking for in plain language, see which options could fit, and find listings near you. No sign-up, no card.',
        robots: 'noindex,nofollow',
        // The default social card (assets/og-image.png) names the product a
        // symptom checker, which is accurate for the organic site but is exactly
        // the vocabulary this page avoids — og:image is meta content on the page
        // AdsBot crawls. og-start.png carries the same brand treatment with no
        // health, symptom or condition wording. See ADS_COMPLIANCE_PLAN.md 3.3/3.6.
        image: `${SITE_URL}/assets/og-start.png`,
      },
    },
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy.component').then((m) => m.PrivacyComponent),
    data: {
      seo: {
        title: 'Privacy Policy | DoctoGuide by KnocDoc',
        description:
          'How DoctoGuide by KnocDoc collects, uses, and protects your health information. Privacy-first AI health assistant.',
      },
    },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/terms.component').then((m) => m.TermsComponent),
    data: {
      seo: {
        title: 'Terms of Use | DoctoGuide by KnocDoc',
        description:
          'Terms of use for DoctoGuide by KnocDoc, the free AI health-information assistant and symptom checker.',
      },
    },
  },
  {
    path: 'disclaimer',
    loadComponent: () =>
      import('./features/legal/disclaimer.component').then((m) => m.DisclaimerComponent),
    data: {
      seo: {
        title: 'Medical Disclaimer | DoctoGuide by KnocDoc',
        description:
          'DoctoGuide is an AI health-information assistant, not a licensed physician. Read the medical disclaimer. In an emergency, call your local emergency number.',
      },
    },
  },
  {
    path: 'ai-doctor',
    loadComponent: () =>
      import('./features/seo-pages/ai-doctor-page.component').then((m) => m.AiDoctorPageComponent),
    data: {
      seo: {
        title: 'Free AI Health Assistant Online | DoctoGuide by KnocDoc',
        description:
          'Ask a free AI health assistant online. Describe your symptoms, get instant informational guidance, and learn which specialist to see. Not a licensed physician and not medical advice. DoctoGuide by KnocDoc.',
      },
    },
  },
  {
    path: 'symptom-checker',
    loadComponent: () =>
      import('./features/seo-pages/symptom-checker-page.component').then((m) => m.SymptomCheckerPageComponent),
    data: {
      seo: {
        title: 'Free AI Symptom Checker — Instant Guidance | DoctoGuide',
        description:
          'Free AI symptom checker. Describe your symptoms in plain language and get instant guidance on what could be going on, how urgent it is, and which specialist to see.',
      },
    },
  },
  {
    path: 'which-specialist-to-see',
    loadComponent: () =>
      import('./features/seo-pages/which-specialist-page.component').then((m) => m.WhichSpecialistPageComponent),
    data: {
      seo: {
        title: 'Which Specialist Should I See? | DoctoGuide',
        description:
          'Not sure which doctor to see? Match your symptoms to the right specialist with our free guide and AI assistant — avoid wasted consultations. DoctoGuide by KnocDoc.',
      },
    },
  },
  {
    path: 'health-guide',
    loadComponent: () =>
      import('./features/seo-pages/health-guide-page.component').then((m) => m.HealthGuidePageComponent),
    data: {
      seo: {
        title: 'Free Online Health Guide — Symptoms & Reports | DoctoGuide',
        description:
          'Your free online health guide. Understand symptoms, decode lab reports, and make sense of medicines in plain language. Better than Googling. DoctoGuide by KnocDoc.',
      },
    },
  },
  {
    path: 'emergency-numbers',
    loadComponent: () =>
      import('./features/seo-pages/emergency-numbers-page.component').then((m) => m.EmergencyNumbersPageComponent),
    data: {
      seo: {
        title: 'Emergency Numbers by Country | DoctoGuide',
        description:
          'Official emergency and ambulance phone numbers for over 190 countries, on one free page. Bookmark before you travel. DoctoGuide by KnocDoc.',
      },
    },
  },
  {
    path: 'how-it-works',
    loadComponent: () =>
      import('./features/seo-pages/how-it-works-page.component').then((m) => m.HowItWorksPageComponent),
    data: {
      seo: {
        title: 'How DoctoGuide Works — Symptoms to Specialist | DoctoGuide',
        description:
          'See exactly how DoctoGuide works: describe your symptoms, answer a few follow-ups, and get guidance, urgency, and the right specialist — free, no sign-up.',
      },
    },
  },
  {
    path: 'find-doctors',
    loadComponent: () =>
      import('./features/seo-pages/find-doctors-page.component').then((m) => m.FindDoctorsPageComponent),
    data: {
      seo: {
        title: 'Find a Doctor Near You | DoctoGuide by KnocDoc',
        description:
          'Find doctors near you, matched to the specialist you actually need. Free doctor search from DoctoGuide, built for India. No sign-up, no listing fees.',
      },
    },
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/seo-pages/pricing-page.component').then((m) => m.PricingPageComponent),
    data: {
      seo: {
        title: 'DoctoGuide Pricing — Free, Always | DoctoGuide',
        description:
          'DoctoGuide is completely free: unlimited AI symptom checker, AI health assistant, specialist matching, and doctor search. No subscription, no card, no hidden tier.',
      },
    },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/seo-pages/about-page.component').then((m) => m.AboutPageComponent),
    data: {
      seo: {
        title: 'About DoctoGuide — AI Health Assistant by KnocDoc',
        description:
          'DoctoGuide is a free AI health assistant and symptom checker built and operated by KnocDoc. What it does, why it exists, and what it deliberately will not do.',
      },
    },
  },
  {
    path: 'medical-safety',
    loadComponent: () =>
      import('./features/seo-pages/medical-safety-page.component').then((m) => m.MedicalSafetyPageComponent),
    data: {
      seo: {
        title: 'Medical Safety & AI Limitations | DoctoGuide',
        description:
          'What DoctoGuide can and cannot do, how AI health guidance can be wrong, the warning signs that need emergency care, and how to use a symptom checker safely.',
      },
    },
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/seo-pages/contact-page.component').then((m) => m.ContactPageComponent),
    data: {
      seo: {
        title: 'Contact DoctoGuide by KnocDoc',
        description:
          'How to reach the team behind DoctoGuide, report a problem with the guidance, or ask about your data. Not a medical service — for emergencies call 112 or 108 in India.',
      },
    },
  },
  {
    path: 'health-topics',
    loadComponent: () =>
      import('./features/seo-pages/health-topics-index.component').then((m) => m.HealthTopicsIndexComponent),
    data: {
      seo: {
        title: 'Health Topics — Symptom Guides | DoctoGuide',
        description:
          'Plain-language guides to common symptoms: what causes them, the warning signs that need urgent care, and which specialist treats them. Free from DoctoGuide by KnocDoc.',
      },
    },
  },
  ...healthTopicRoutes,
  // --- Console realms -------------------------------------------------------
  // Mounted as NESTED routes (parent carries data.seo + loadChildren), not
  // flattened siblings. AppComponent.collectSeo() walks route.firstChild and
  // merges each level's data.seo, so the parent's noindex is what keeps
  // /partner/dashboard, /admin/leads etc. out of the index. Flattening these
  // would silently drop that.
  {
    path: 'triage',
    loadChildren: () => import('./features/triage/triage.routes').then((m) => m.TRIAGE_ROUTES),
    // Auth-gated app — keep out of the search index. The title is never read by
    // a crawler; it exists so analytics reports that group by page title do not
    // fold this route into the default title shared by every untitled route.
    data: { seo: { title: 'Symptom Check — DoctoGuide', robots: 'noindex,nofollow' } },
  },
  {
    path: 'partner',
    loadChildren: () => import('./features/partner/partner.routes').then((m) => m.PARTNER_ROUTES),
    // Clinic-admin dashboard — keep out of the search index.
    data: { seo: { title: 'Clinic Console — DoctoGuide', robots: 'noindex,nofollow' } },
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    // Global super-admin console — keep out of the search index.
    data: { seo: { title: 'Admin Console — DoctoGuide', robots: 'noindex,nofollow' } },
  },
  {
    path: 'owner',
    loadChildren: () => import('./features/owner/owner.routes').then((m) => m.OWNER_ROUTES),
    // Creator (platform-owner) console — keep out of the search index.
    data: { seo: { title: 'Owner Console — DoctoGuide', robots: 'noindex,nofollow' } },
  },
  // Real 404 instead of the previous `redirectTo: ''`. Redirecting every unknown
  // URL to the homepage returned HTTP 200 with duplicate homepage content for an
  // unlimited URL space — a soft 404. `/404` is prerendered and copied to
  // `404.html` at the output root so the host can serve it with a 404 status.
  {
    path: '404',
    loadComponent: () =>
      import('./features/seo-pages/not-found.component').then((m) => m.NotFoundComponent),
    data: {
      seo: {
        title: 'Page Not Found | DoctoGuide',
        description: 'This page does not exist. Browse DoctoGuide, the free AI health assistant and symptom checker by KnocDoc.',
        robots: 'noindex,follow',
      },
    },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/seo-pages/not-found.component').then((m) => m.NotFoundComponent),
    data: {
      seo: {
        title: 'Page Not Found | DoctoGuide',
        description: 'This page does not exist. Browse DoctoGuide, the free AI health assistant and symptom checker by KnocDoc.',
        robots: 'noindex,follow',
      },
    },
  },
];
