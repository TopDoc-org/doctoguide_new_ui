import { Component, OnDestroy, OnInit } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_URL } from '../../core/config/site';
import { RouterLink } from '@angular/router';
import { SeoPageLayoutComponent } from '../../layouts/seo-page-layout/seo-page-layout.component';

@Component({
  selector: 'app-find-doctors-page',
  standalone: true,
  imports: [RouterLink, SeoPageLayoutComponent],
  template: `
    <app-seo-page-layout
      heading="Find a doctor near you — matched to your symptoms"
      lede="DoctoGuide doesn't just point you to a specialist type — it helps you find real doctors near your location, so you know exactly who to book once you know what you need."
      ctaTitle="Find doctors near you"
      ctaLabel="Describe your symptoms to start"
    >
      <h2>How doctor search works on DoctoGuide</h2>
      <ol>
        <li><strong>Describe your symptoms</strong> — DoctoGuide works out what's likely going on and which specialist fits.</li>
        <li><strong>Share your location</strong> — with your permission, DoctoGuide uses your location to find doctors near you.</li>
        <li><strong>Get a shortlist</strong> — nearby doctors matched to the specialist type you actually need, not a generic directory listing.</li>
      </ol>

      <h2>Why "near me" isn't enough on its own</h2>
      <p>
        A plain doctor directory shows you every dermatologist, cardiologist, and general
        physician within a few kilometres and leaves the guessing to you. DoctoGuide works the
        other way round: it figures out which speciality actually matches your symptoms first —
        see <a routerLink="/which-specialist-to-see">which specialist to see</a> — then finds
        doctors near you who fit, so you skip the wrong appointment entirely.
      </p>

      <h2>Built for India</h2>
      <p>
        DoctoGuide is built for how healthcare actually works in India — describe your symptoms in
        English, Hindi, or Hinglish, and get pointed toward doctors and specialists near you,
        whether you're in a metro or a smaller city. No directory subscription, no listing fees,
        no sign-up.
      </p>

      <h2>When to skip the search and go straight to emergency care</h2>
      <p>
        Severe chest pain, difficulty breathing, sudden weakness, heavy bleeding, or any other
        emergency symptom — don't search for a doctor, call your local emergency number
        immediately. See <a routerLink="/emergency-numbers">emergency numbers by country</a>.
      </p>

      <h2>Frequently asked questions</h2>
      <details>
        <summary>Is finding a doctor through DoctoGuide free?</summary>
        <p>Yes — completely free, with no sign-up and no credit card.</p>
      </details>
      <details>
        <summary>Do I have to describe my symptoms first?</summary>
        <p>
          It's not required, but it's how DoctoGuide narrows a broad directory down to doctors who
          actually match what you need — start with the <a routerLink="/symptom-checker">symptom checker</a>
          for the best match.
        </p>
      </details>
      <details>
        <summary>Does DoctoGuide book the appointment for me?</summary>
        <p>DoctoGuide points you to the right doctor near you; booking happens directly with that doctor or clinic.</p>
      </details>
    </app-seo-page-layout>
  `,
})
export class FindDoctorsPageComponent implements OnInit, OnDestroy {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'MedicalWebPage',
      name: 'Find a Doctor Near You',
      url: `${SITE_URL}/find-doctors`,
      inLanguage: 'en',
      about: { '@type': 'MedicalAudience', audienceType: 'Patient' },
    });
    this.seo.setJsonLd('faq', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is finding a doctor through DoctoGuide free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — completely free, with no sign-up and no credit card.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I have to describe my symptoms first?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It is not required, but it is how DoctoGuide narrows a broad directory down to doctors who actually match what you need.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does DoctoGuide book the appointment for me?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'DoctoGuide points you to the right doctor near you; booking happens directly with that doctor or clinic.',
          },
        },
      ],
    });
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('page');
    this.seo.removeJsonLd('faq');
  }
}
