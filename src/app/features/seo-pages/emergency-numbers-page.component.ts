import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
// Static import (not HTTP) so the full table is present in the prerendered HTML.
import countriesJson from '../../../assets/countries.json';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

interface EmergencyRow {
  code: string;
  name: string;
  all: string;
  ambulance: string;
  police?: string;
  fire?: string;
}

@Component({
  selector: 'app-emergency-numbers-page',
  standalone: true,
  imports: [RouterLink, CommonModule, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Emergency numbers by country"
      lede="The official emergency and ambulance phone numbers for over 190 countries — one page, always free. Bookmark it before you travel."
      ctaTitle="Worried about a symptom right now?"
      ctaLabel="Check symptoms free"
    >
      <p>
        <strong>If someone is in immediate danger, stop reading and call the number for your
        country below.</strong> When unsure, 112 works in many countries worldwide and on most
        mobile phones even without a SIM.
      </p>

      <h2>All countries A–Z</h2>
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>General emergency</th>
            <th>Ambulance</th>
            <th>Police</th>
            <th>Fire</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows">
            <td>{{ r.name }}</td>
            <td>{{ r.all }}</td>
            <td>{{ r.ambulance }}</td>
            <td>{{ r.police || '—' }}</td>
            <td>{{ r.fire || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <p>
        Numbers change occasionally; verify locally when you arrive in a new country. Spot an
        error? <a routerLink="/triage">Tell us via the app</a>. Not an emergency but unsure what
        your symptoms mean? Try the free
        <a routerLink="/symptom-checker">AI symptom checker</a> or read
        <a routerLink="/which-specialist-to-see">which specialist to see</a>.
      </p>
    </app-seo-page-layout>
  `,
})
export class EmergencyNumbersPageComponent implements OnInit, OnDestroy {
  rows: EmergencyRow[] = Object.entries(countriesJson as Record<string, any>)
    .filter(([code, entry]) => code !== 'default' && entry?.name)
    .map(([code, entry]) => ({
      code,
      name: entry.name as string,
      all: entry.emergency?.all ?? '—',
      ambulance: entry.emergency?.ambulance ?? entry.emergency?.all ?? '—',
      police: entry.emergency?.police,
      fire: entry.emergency?.fire,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Emergency Numbers by Country',
      url: `${SITE_URL}/emergency-numbers`,
      inLanguage: 'en',
      description:
        'Official emergency and ambulance phone numbers for over 190 countries, on one page.',
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('page');
  }
}
