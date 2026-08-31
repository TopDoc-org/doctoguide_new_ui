import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LEGAL_CONFIG } from './legal-config';
import { LegalLayoutComponent } from '../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [LegalLayoutComponent],
  template: `
    <app-legal-layout title="Privacy Policy" [updated]="legal.lastUpdated" [appName]="appName">
      <p>
        This Privacy Policy explains how {{ appName }} ("we", "us") collects, uses,
        and protects your personal information when you use the Service. We process
        personal data in accordance with India's
        <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the
        <strong>Information Technology (Reasonable Security Practices and Procedures and
        Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules)</strong>.
      </p>

      <h2>1. Who we are (Data Fiduciary)</h2>
      <p>
        <strong>{{ legal.entityName }}</strong> (registered at
        <strong>{{ legal.entityAddress }}</strong>) is the data fiduciary
        responsible for your personal data.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, mobile number, and a 4-digit PIN (stored only in hashed form).</li>
        <li><strong>Health information you provide:</strong> age, biological sex, symptoms, and the messages you send during a consultation. This is <strong>sensitive personal data</strong>.</li>
        <li><strong>Generated content:</strong> the health summaries we create for you.</li>
        <li><strong>Location:</strong> a city/area you type, or device location (only if you grant permission) — used solely to find nearby doctors.</li>
        <li><strong>Technical data:</strong> a session identifier and basic device/usage data needed to run the Service.</li>
        <li><strong>Approximate location from your IP address:</strong> we detect your approximate country from your IP address using third-party geolocation services (geojs.io and ipwho.is) so we can show you the right local emergency numbers and localised content.</li>
      </ul>

      <h2>3. Why we use it (purposes)</h2>
      <ul>
        <li>To run the symptom interview and generate your health summary.</li>
        <li>To let you create an account and revisit your past consultations.</li>
        <li>To show you doctors near your chosen location.</li>
        <li>To maintain security and improve the Service.</li>
      </ul>
      <p>We use your data only for these purposes and do not sell it.</p>

      <h2>4. Consent</h2>
      <p>
        We process your health information on the basis of your consent, which you give
        before your first interaction and when you create an account. You may withdraw
        consent at any time (see "Your rights"); withdrawal does not affect processing
        done before withdrawal.
      </p>

      <h2>5. Sharing</h2>
      <p>
        We do not sell your personal data. We may share limited data with service
        providers who help us operate the Service (e.g. hosting, AI processing, map/
        directory providers for doctor search) under appropriate safeguards, and where
        required by law. Doctor listings are retrieved from third-party directories; we
        do not share your health information with them.
      </p>

      <h2>6. Storage &amp; security</h2>
      <p>
        Your data is stored on secured servers. PINs are stored using one-way hashing.
        We apply reasonable security practices to protect your information, though no
        system is completely secure.
        <strong>{{ legal.hostingLocation }}</strong>
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep your personal and health data only as long as needed for the purposes
        above or as required by law, after which it is deleted or anonymised.
        <strong>{{ legal.retentionPeriods }}</strong>
      </p>

      <h2>8. Your rights</h2>
      <ul>
        <li>Access and correct your personal data.</li>
        <li>Withdraw consent and request deletion of your data.</li>
        <li>Nominate another person to exercise your rights (as provided under the DPDP Act).</li>
        <li>Raise a grievance with us.</li>
      </ul>
      <p>
        To exercise any right, contact us at
        <strong>{{ legal.privacyEmail }}</strong>.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is for adults (18+). We do not knowingly process the data of
        children without lawful consent.
      </p>

      <h2>10. Grievance Officer</h2>
      <p>
        In accordance with the DPDP Act and IT Rules, you can contact our Grievance
        Officer: <strong>{{ legal.grievanceOfficerName }}</strong>
        (<strong>{{ legal.grievanceOfficerEmail }}</strong>), who will respond
        within <strong>{{ legal.grievanceResponseTime }}</strong>.
      </p>

      <h2>11. Changes</h2>
      <p>We may update this policy and will post the updated version here.</p>

      <p class="mt-6 text-xs text-teal-900/50">
        This document is a draft pending review by a qualified Indian healthcare/privacy
        lawyer and does not constitute legal advice. Bracketed items must be completed
        before launch.
      </p>
    </app-legal-layout>
  `,
})
export class PrivacyComponent {
  appName = environment.appName;
  legal = LEGAL_CONFIG;
}
