import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CountryService } from '../../core/country/country.service';
import { LEGAL_CONFIG } from './legal-config';
import { LegalLayoutComponent } from '../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'app-disclaimer',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout title="Medical Disclaimer" [updated]="legal.lastUpdated" [appName]="appName">
      <p>
        <strong>{{ appName }} is not a doctor and does not practise medicine.</strong>
        {{ appName }} is an artificial-intelligence health-information and
        symptom-education tool. It is intended only to help you organise information
        about your symptoms and to prepare for a conversation with a qualified,
        registered medical practitioner.
      </p>

      <h2>No medical advice, diagnosis or treatment</h2>
      <p>
        The summaries, possibilities, suggested topics, and information {{ appName }}
        produces are <strong>for general educational purposes only</strong>. They are
        <strong>not</strong> a medical diagnosis, prescription, treatment plan, or
        professional medical advice, and must not be relied upon as such. Only a
        Registered Medical Practitioner (RMP) who examines you can diagnose a condition
        or prescribe treatment.
      </p>

      <h2>No doctor–patient relationship</h2>
      <p>
        Using {{ appName }} does not create a doctor–patient relationship between you
        and {{ appName }}, its operators, or any person involved in the service.
      </p>

      <h2>Always consult a qualified doctor</h2>
      <p>
        Never disregard professional medical advice or delay seeking it because of
        something you read here. Always seek the advice of a qualified physician with
        any questions about a medical condition or before making any health decision.
      </p>

      <h2>Emergencies</h2>
      <p>
        <strong>{{ appName }} is not for emergencies.</strong> If you think you may
        have a medical emergency{{ inCountry }}, call
        <strong>{{ emergencyNumbersText }}</strong> immediately, or go to the nearest
        emergency department.
      </p>

      <h2>Doctor listings</h2>
      <p>
        Any nearby-doctor listings shown are sourced from third-party map and directory
        data (e.g. Google/OpenStreetMap). {{ appName }} does not verify, credential,
        endorse, or recommend any listed practitioner, and is not responsible for the
        care they provide. Please verify a practitioner's registration and details
        independently before consulting them.
      </p>

      <h2>No warranty</h2>
      <p>
        Information is provided "as is" without warranties of any kind. AI systems can
        be inaccurate or incomplete. To the maximum extent permitted by law,
        {{ appName }} disclaims liability for any loss arising from use of the service.
      </p>

      <p class="mt-6 text-xs text-muted">
        This document is a draft pending review by a qualified Indian healthcare lawyer
        and does not constitute legal advice.
      </p>
    </app-legal-layout>
  `,
})
export class DisclaimerComponent implements OnInit {
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
