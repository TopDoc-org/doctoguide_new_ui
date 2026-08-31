import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SeoData, SeoService } from './core/seo/seo.service';
import { FirebaseAnalyticsService } from './core/analytics/firebase-analytics.service';
import { AffiliateService } from './core/affiliate/affiliate.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  private firebaseAnalytics = inject(FirebaseAnalyticsService);
  private affiliate = inject(AffiliateService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Capture campaign attribution (?ref=clinicId) on the first load before
    // any internal navigation strips the query string.
    this.affiliate.capture();
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
