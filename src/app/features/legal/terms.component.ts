import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CountryService } from '../../core/country/country.service';
import { LEGAL_CONFIG } from './legal-config';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink, LegalLayoutComponent],
  template: `
    <app-legal-layout title="Terms of Use" [updated]="legal.lastUpdated" [appName]="appName">
      <p>
        These Terms of Use ("Terms") govern your use of {{ appName }} (the "Service").
        By using the Service you agree to these Terms. If you do not agree, do not use
        the Service.
      </p>

      <h2>1. What the Service is</h2>
      <p>
        {{ appName }} is an AI health-<strong>information</strong> and
        symptom-education tool. It helps you organise information about your symptoms
        and prepare to speak with a qualified, registered medical practitioner. It is
        <strong>not</strong> a medical provider and does <strong>not</strong> provide
        medical advice, diagnosis, treatment, or prescriptions. See our
        <a routerLink="/disclaimer">Medical Disclaimer</a>.
      </p>

      <h2>2. No doctor–patient relationship</h2>
      <p>
        Use of the Service does not create a doctor–patient relationship. Outputs are
        informational possibilities only and are not a substitute for consultation with
        a Registered Medical Practitioner (RMP).
      </p>

      <h2>3. Eligibility</h2>
      <p>
        The Service is intended for adults (18 years or older){{ inCountry }}. By using it you
        confirm you are eligible.
      </p>

      <h2>4. Not for emergencies</h2>
      <p>
        Do not use the Service for medical emergencies. Call
        {{ emergencyNumbersText }} immediately in an emergency.
      </p>

      <h2>5. Doctor listings are third-party data</h2>
      <p>
        Nearby-doctor listings come from third-party directories and maps. We do not
        verify, endorse, or recommend any practitioner and are not responsible for the
        care they provide. Verify a practitioner's registration and details before
        consulting them.
      </p>

      <h2>6. Your responsibilities</h2>
      <ul>
        <li>Provide accurate information; do not misuse the Service.</li>
        <li>Always confirm any health decision with a qualified doctor.</li>
        <li>Keep your account PIN confidential.</li>
      </ul>

      <h2>7. Privacy</h2>
      <p>
        Your use is also governed by our
        <a routerLink="/privacy">Privacy Policy</a>, which explains how we handle your
        personal and health information.
      </p>

      <h2>8. Disclaimer of warranties &amp; limitation of liability</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. AI outputs may
        be inaccurate or incomplete. To the maximum extent permitted by law, we
        disclaim all liability for any loss or harm arising from use of, or reliance on,
        the Service.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms. Continued use after changes means you accept the
        updated Terms.
      </p>

      <h2>10. Governing law &amp; grievances</h2>
      <p>
        These Terms are governed by the laws of India, subject to the jurisdiction of
        the courts at <strong>{{ legal.jurisdictionCity }}</strong>. For grievances,
        contact our Grievance Officer
        <strong>{{ legal.grievanceOfficerName }}</strong> at
        <strong>{{ legal.grievanceOfficerEmail }}</strong>.
      </p>

      <p class="mt-6 text-xs text-muted">
        This document is a draft pending review by a qualified Indian healthcare lawyer
        and does not constitute legal advice. Bracketed items must be completed before
        launch.
      </p>
    </app-legal-layout>
  `,
})
export class TermsComponent implements OnInit {
  appName = environment.appName;
  legal = LEGAL_CONFIG;
  countryName: string | null = null;

  constructor(private country: CountryService) {}

  // Delegated so the definite-article handling ("in the United States") and the
  // deduplicated / country-neutral emergency wording live in exactly one place.
  get inCountry(): string {
    return this.country.inCountry;
  }
  get emergencyNumbersText(): string {
    return this.country.emergencyNumbersText;
  }

  ngOnInit(): void {
    this.country.init().then(() => {
      this.countryName = this.country.countryName;
    });
  }
}
