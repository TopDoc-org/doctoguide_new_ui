import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';

import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';
import {
  EMERGENCY_DISCLAIMER,
  HealthTopic,
  findTopic,
} from './health-topics.data';

/**
 * Renders one health topic from health-topics.data.ts.
 *
 * The slug arrives through route `data.topicSlug` rather than a URL parameter, so
 * each topic gets its own route entry with its own static `data.seo`. That keeps
 * SeoService as the single place metadata is applied (AppComponent applies route
 * data on NavigationEnd, which would otherwise overwrite anything set here), and
 * it gives the prerenderer a concrete route list to walk.
 *
 * Red flags render first, before causes. Someone arriving here mid-symptom should
 * hit the "go to hospital now" list before anything reassuring.
 */
@Component({
  selector: 'app-health-topic-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    @if (topic) {
      <app-seo-page-layout
        [heading]="topic.heading"
        [lede]="topic.lede"
        ctaTitle="Describe your symptoms and get specific guidance"
        ctaLabel="Check my symptoms free"
        >
        <nav aria-label="Breadcrumb" class="mb-6 text-sm">
          <a routerLink="/">Home</a>
          <span class="mx-1.5 text-teal-900/40">/</span>
          <a routerLink="/health-topics">Health topics</a>
          <span class="mx-1.5 text-teal-900/40">/</span>
          <span class="text-teal-900/60">{{ topic.label }}</span>
        </nav>
        <h2>Get medical help immediately if any of these apply</h2>
        <ul>
          @for (f of topic.redFlags; track $index) {
            <li>{{ f }}</li>
          }
        </ul>
        <p>
          <strong>{{ emergencyNote }}</strong> In India, call <strong>112</strong> for any emergency
          or <strong>108</strong> for an ambulance. Elsewhere, use your
          <a routerLink="/emergency-numbers">local emergency number</a>.
        </p>
        @for (s of topic.sections; track s) {
          <h2>{{ s.heading }}</h2>
          @for (p of s.paragraphs; track $index) {
            <p>{{ p }}</p>
          }
          @if (s.items && s.ordered) {
            <ol>
              @for (i of s.items; track $index) {
                <li>{{ i }}</li>
              }
            </ol>
          }
          @if (s.items && !s.ordered) {
            <ul>
              @for (i of s.items; track $index) {
                <li>{{ i }}</li>
              }
            </ul>
          }
        }
        <h2>Which doctor treats this</h2>
        <p>
          Picking the wrong speciality for a first consultation costs time and money. These are the
          specialities that commonly handle this, though your particular situation may point
          elsewhere — <a routerLink="/which-specialist-to-see">work out which specialist to see</a>.
        </p>
        <ul>
          @for (s of topic.specialists; track $index) {
            <li>{{ s }}</li>
          }
        </ul>
        <h2>Questions worth asking your doctor</h2>
        <ul>
          @for (q of topic.askYourDoctor; track $index) {
            <li>{{ q }}</li>
          }
        </ul>
        <h2>How DoctoGuide can help</h2>
        <p>
          This page is general information — it cannot know your age, history, medicines, or how your
          symptoms actually present. DoctoGuide asks those follow-up questions, then gives you
          guidance specific to what you described, a sense of urgency, the speciality to see, and a
          written summary to take into the consultation. It is free and needs no account.
        </p>
        <p>
          DoctoGuide does not diagnose, prescribe, or replace a doctor. What it can and cannot do is
          set out on the <a routerLink="/medical-safety">medical safety page</a>.
        </p>
        @if (relatedTopics.length) {
          <h2>Related topics</h2>
        }
        @if (relatedTopics.length) {
          <ul>
            @for (r of relatedTopics; track r) {
              <li>
                <a [routerLink]="['/health-topics', r.slug]">{{ r.heading }}</a>
              </li>
            }
          </ul>
        }
      </app-seo-page-layout>
    }
    `,
})
export class HealthTopicPageComponent implements OnInit, OnDestroy {
  topic?: HealthTopic;
  relatedTopics: HealthTopic[] = [];
  emergencyNote = EMERGENCY_DISCLAIMER;

  constructor(private route: ActivatedRoute, private seo: SeoService) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.data['topicSlug'] as string | undefined;
    this.topic = findTopic(slug ?? null);
    if (!this.topic) return;

    this.relatedTopics = this.topic.related
      .map((s) => findTopic(s))
      .filter((t): t is HealthTopic => !!t);

    this.seo.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Health topics', item: `${SITE_URL}/health-topics` },
        {
          '@type': 'ListItem',
          position: 3,
          name: this.topic.label,
          item: `${SITE_URL}/health-topics/${this.topic.slug}`,
        },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('breadcrumb');
  }
}
