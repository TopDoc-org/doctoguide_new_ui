import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { sessionExpiryInterceptor } from './core/http/session-expiry.interceptor';
import { ThemeService } from './core/theme/theme.service';
import { BackButtonService } from './core/native/back-button.service';
import { DeepLinkService } from './core/native/deep-link.service';
import { provideIcons } from './core/icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // v1's `initialNavigation: 'enabledBlocking'`. Required for prerender:
      // the first navigation must complete before the server serializes.
      withEnabledBlockingInitialNavigation(),
      // Lets HealthTopicPageComponent receive `topicSlug` from route data as a
      // signal input instead of reading the ActivatedRoute snapshot.
      withComponentInputBinding(),

      // DELIBERATELY OMITTED, both present in DocTribe's app.config.ts:
      //   withViewTransitions()      — animates every route change; v1 has no
      //                                such animation, so it is a behaviour change.
      //   withInMemoryScrolling(...) — changes scroll restoration on back-nav;
      //                                v1 uses the router defaults.
      // Copying DocTribe's config wholesale is the obvious mistake here.
    ),
    // withFetch(): Angular's recommended backend for SSR builds (NG02801).
    provideHttpClient(withFetch(), withInterceptors([sessionExpiryInterceptor])),
    // Tree-shaken lucide registry. An icon not pick()ed here renders as nothing.
    provideIcons(),
    provideAppInitializer(() => {
      // Theme only. SeoService is NOT booted here on purpose: it is driven by
      // AppComponent's NavigationEnd subscription because it needs the merged
      // route-tree data.seo walk, which an initializer cannot do.
      inject(ThemeService).init();
      // Android hardware back. Inert in a browser (no Capacitor global).
      inject(BackButtonService).start();
      // Android App Links (https://doctoguide.knocdoc.in/...). Inert in a browser.
      inject(DeepLinkService).start();
    }),

    // provideClientHydration() is DELIBERATELY ABSENT.
    // v1 prerenders and then re-bootstraps destructively. With hydration on,
    // landing.component's isBrowser-gated getters render null on the server and
    // a real username on the client -> NG0500 mismatches and silently wrong DOM.
    // Enabling it is a separate project with per-component ngSkipHydration audits.
  ],
};
