import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * 404 page. Replaces the previous `{ path: '**', redirectTo: '' }` wildcard, which
 * served the homepage with an HTTP 200 for every unknown URL — a soft 404 that let
 * an unlimited URL space resolve to duplicate homepage content.
 *
 * The route carries `robots: 'noindex,nofollow'`. This component is also prerendered
 * to `/404/index.html` and copied to `404.html` at the output root by
 * scripts/postbuild-seo.js, so the host can serve it with a real 404 status.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Page not found"
      lede="The page you're looking for doesn't exist, or has moved. Here's everything on DoctoGuide — or start by describing how you feel."
      ctaTitle="Describe your symptoms instead"
      ctaLabel="Start with DoctoGuide"
    >
      <h2>Popular pages</h2>
      <ul>
        <li><a routerLink="/">DoctoGuide home</a> — the free AI health assistant and symptom checker.</li>
        <li><a routerLink="/symptom-checker">AI symptom checker</a> — describe symptoms in plain language.</li>
        <li><a routerLink="/which-specialist-to-see">Which specialist to see</a> — match symptoms to a speciality.</li>
        <li><a routerLink="/how-it-works">How DoctoGuide works</a> — the five steps, start to finish.</li>
        <li><a routerLink="/health-topics">Health topics</a> — plain-language guides to common symptoms.</li>
        <li><a routerLink="/medical-safety">Medical safety</a> — what the AI can and cannot do.</li>
        <li><a routerLink="/emergency-numbers">Emergency numbers</a> — by country.</li>
      </ul>

      <h2>If this is an emergency</h2>
      <p>
        Do not wait for a website. In India, call <strong>112</strong> (all emergencies) or
        <strong>108</strong> (ambulance). Elsewhere, call your local emergency number — the
        <a routerLink="/emergency-numbers">emergency numbers page</a> lists them by country.
      </p>
    </app-seo-page-layout>
  `,
})
export class NotFoundComponent {}
