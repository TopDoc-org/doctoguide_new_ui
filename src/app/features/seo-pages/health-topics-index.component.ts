import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { HEALTH_TOPICS, HealthTopic } from './health-topics.data';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * Hub page for /health-topics. Gives the topic pages a crawlable parent and a
 * real internal-linking structure rather than leaving them as sitemap-only URLs.
 *
 * The list is short on purpose. Expanding it means writing content of the same
 * depth per topic, not generating pages from a keyword list.
 */
@Component({
  selector: 'app-health-topics-index',
  standalone: true,
  imports: [RouterLink, CommonModule, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Health topics"
      lede="Plain-language guides to common symptoms: what usually causes them, the warning signs that need urgent care, and which kind of doctor treats them."
      ctaTitle="Not sure which of these fits?"
      ctaLabel="Describe your symptoms free"
    >
      <nav aria-label="Breadcrumb" class="mb-6 text-sm">
        <a routerLink="/">Home</a>
        <span class="mx-1.5 text-teal-900/40">/</span>
        <span class="text-teal-900/60">Health topics</span>
      </nav>

      <p>
        Each guide answers the same practical questions: what commonly causes this, what would make
        it urgent, when to see someone, and which speciality handles it. They are general health
        information — they do not diagnose, and they cannot account for your age, history, or
        medicines. For that, describe your symptoms to
        <a routerLink="/symptom-checker">the symptom checker</a>.
      </p>

      <h2>Browse topics</h2>
      <ul>
        <li *ngFor="let t of topics">
          <a [routerLink]="['/health-topics', t.slug]">{{ t.heading }}</a>
        </li>
      </ul>

      <h2>If this is an emergency</h2>
      <p>
        Do not use a website to decide whether an emergency is an emergency. In India, call
        <strong>112</strong> for any emergency or <strong>108</strong> for an ambulance. Elsewhere,
        see <a routerLink="/emergency-numbers">emergency numbers by country</a>.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a routerLink="/which-specialist-to-see">Which specialist should I see?</a></li>
        <li><a routerLink="/health-guide">The full online health guide</a></li>
        <li><a routerLink="/medical-safety">Medical safety and AI limitations</a></li>
        <li><a routerLink="/find-doctors">Find doctors near you</a></li>
      </ul>
    </app-seo-page-layout>
  `,
})
export class HealthTopicsIndexComponent implements OnInit, OnDestroy {
  topics: HealthTopic[] = HEALTH_TOPICS;

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Health topics', item: `${SITE_URL}/health-topics` },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('breadcrumb');
  }
}
