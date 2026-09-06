import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SeoData, SeoService } from './core/seo/seo.service';
import { FirebaseAnalyticsService } from './core/analytics/firebase-analytics.service';
import { AffiliateService } from './core/affiliate/affiliate.service';
import { VisitService } from './core/visit/visit.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // NOT OnPush — deliberately, and this is load-bearing.
  //
  // ApplicationRef.tick() walks the view tree from the root and STOPS at a
  // clean OnPush view, skipping its entire subtree. Every feature component
  // renders under this one's <router-outlet>, and they are Default-strategy
  // ports from v1 that update plain fields (`this.loading = false`,
  // `state.messages.push(...)`) without ever calling markForCheck().
  //
  // With OnPush here, only a DOM event could repaint them, because Angular's
  // event handling marks the tree dirty on the way up. Anything driven by an
  // async callback instead — every HTTP response handler in the app — mutated
  // state that never reached the screen.
  //
  // How it presented: with the backend down, sending a message in /triage left
  // the user looking at their own bubble forever. `state.messages` DID contain
  // "Sorry, something went wrong. Please try again." and `loading` WAS false;
  // the view just never repainted. Typing one more character made it appear,
  // because that DOM event dirtied the tree.
  //
  // v1's AppComponent was Default (it had no changeDetection at all), which is
  // why v1 never showed this. Re-adding OnPush here means auditing all ~58
  // async handlers across 21 files for markForCheck, or moving the app to
  // signals. This template is a bare <router-outlet /> — OnPush saves nothing
  // here and costs the whole app its async rendering.
  // The skip link. `.skip-link` has been styled in styles.scss since the
  // migration but NOTHING ever rendered it, so keyboard users had to tab
  // through the whole app bar — five controls on a console, seven on /triage —
  // on every single route to reach the content.
  //
  // It preventDefaults and focuses rather than letting the browser follow
  // `#main`: a bare fragment href in a routed app is a navigation, and the
  // router would strip it. `tabindex="-1"` is set at click time, not in every
  // template, so the target is focusable exactly once and no <main> carries a
  // stray tab stop for pointer users.
  template: `
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Skip to main content</a>
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private firebaseAnalytics = inject(FirebaseAnalyticsService);
  private affiliate = inject(AffiliateService);
  private visit = inject(VisitService);
  private destroyRef = inject(DestroyRef);

  /** Runs only from a real click, so it never touches `document` in a prerender. */
  skipToMain(event: Event): void {
    event.preventDefault();
    const el = document.getElementById('main');
    if (!el) return;
    el.setAttribute('tabindex', '-1');
    el.focus();
    el.scrollIntoView();
  }

  ngOnInit(): void {
    // Capture campaign attribution (?ref=clinicId) on the first load before
    // any internal navigation strips the query string.
    this.affiliate.capture();
    // Landing beacon: record where this visitor came from before any session
    // exists, so bounces are counted too. Runs once per app load, after
    // affiliate.capture() so the ref/utm tags are already stored.
    void this.visit.record();
    void this.firebaseAnalytics.init();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        // Re-check in case the app booted on a route that resolves the query
        // string after init (deep-linked /triage?ref=…).
        this.affiliate.capture();
        const data = this.collectSeo();
        const urlPath = this.router.url.split('?')[0].split('#')[0] || '/';
        this.seo.update(data, urlPath);
      });
  }

  /**
   * Walk the activated route tree and merge each level's `data.seo`, so a
   * child route overrides its parent while inheriting anything it omits
   * (e.g. triage children inherit the parent's noindex directive).
   *
   * This is why the four console realms stay NESTED (a parent route carrying
   * data.seo + loadChildren) rather than being flattened to sibling
   * loadComponent routes — flattening would break the inheritance chain and
   * silently drop `noindex` from /triage/profile and friends.
   */
  private collectSeo(): SeoData | undefined {
    let route: ActivatedRoute | null = this.route;
    let merged: SeoData | undefined;
    while (route) {
      const seo = route.snapshot.data['seo'] as SeoData | undefined;
      if (seo) merged = { ...merged, ...seo };
      route = route.firstChild;
    }
    return merged;
  }
}
