import { Component, OnDestroy, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { LEGAL_CONFIG } from '../legal/legal-config';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

/**
 * Contact page. Trust signal for YMYL: a real health site must show how to reach
 * the people behind it.
 *
 * Only channels that are actually documented in this repository are rendered.
 * The legal/grievance contacts in legal-config.ts ship as "[... — to be confirmed]"
 * placeholders; those blocks stay hidden until a real value is filled in, rather
 * than publishing a placeholder or inventing an address.
 */
@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [RouterLink, CommonModule, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Contact DoctoGuide"
      lede="DoctoGuide is built by KnocDoc. Here's how to reach us — and what to do instead if you need medical help right now."
      ctaTitle="Just want to try DoctoGuide?"
      ctaLabel="Start free"
    >
      <h2>If you need medical help</h2>
      <p>
        This page is not a medical service and no one here can respond to a medical emergency. In
        India, call <strong>112</strong> for any emergency or <strong>108</strong> for an ambulance.
        Elsewhere, use your <a routerLink="/emergency-numbers">local emergency number</a>. For
        non-urgent health concerns, see a qualified clinician —
        <a routerLink="/find-doctors">find doctors near you</a>.
      </p>

      <h2>Reach the team</h2>
      <ul>
        <li>
          <strong>Instagram —</strong>
          <a [href]="instagram.url" rel="noopener" target="_blank">{{ instagram.handle }}</a>.
          The fastest way to reach us about DoctoGuide.
        </li>
        <li>
          <strong>KnocDoc —</strong>
          <a href="https://knocdoc.in/" rel="noopener">knocdoc.in</a>, the company that builds and
          operates DoctoGuide.
        </li>
      </ul>

      <h2 *ngIf="privacyEmailKnown">Privacy and data requests</h2>
      <p *ngIf="privacyEmailKnown">
        For questions about your data, or to exercise your rights under the DPDP Act, write to
        <a [href]="'mailto:' + legal.privacyEmail">{{ legal.privacyEmail }}</a>. Details of what we
        collect and why are in the <a routerLink="/privacy">privacy policy</a>.
      </p>
      <p *ngIf="!privacyEmailKnown">
        For questions about your data and the rights you have over it, see the
        <a routerLink="/privacy">privacy policy</a>, which sets out what is collected, how it is
        used, and how long it is kept.
      </p>

      <h2 *ngIf="grievanceKnown">Grievance Officer</h2>
      <p *ngIf="grievanceKnown">
        In accordance with the DPDP Act and IT Rules, complaints can be directed to
        {{ legal.grievanceOfficerName }} at
        <a [href]="'mailto:' + legal.grievanceOfficerEmail">{{ legal.grievanceOfficerEmail }}</a>.
      </p>

      <h2>Reporting a problem with the guidance</h2>
      <p>
        If DoctoGuide gave you guidance that seemed wrong, unsafe, or confusing, tell us. Reports
        like that are the most useful feedback we get. Include what you described and what came
        back — and please don't include anything you'd rather not share. What DoctoGuide can and
        cannot do is set out on the <a routerLink="/medical-safety">medical safety page</a>.
      </p>

      <h2>For clinics and doctors</h2>
      <p>
        KnocDoc also builds <a href="https://doctribe.knocdoc.in/" rel="noopener">DocTribe</a>, a
        professional network for doctors, and queue-management tools for clinics. Reach us through
        the channels above.
      </p>
    </app-seo-page-layout>
  `,
})
export class ContactPageComponent implements OnInit, OnDestroy {
  instagram = environment.instagram;
  legal = LEGAL_CONFIG;

  get privacyEmailKnown(): boolean {
    return !this.legal.privacyEmail.startsWith('[');
  }

  get grievanceKnown(): boolean {
    return !this.legal.grievanceOfficerEmail.startsWith('[');
  }

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: `${SITE_URL}/contact` },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('breadcrumb');
  }
}
