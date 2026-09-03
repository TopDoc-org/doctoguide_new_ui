import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ButtonComponent } from '../../../../design-system/button/button.component';
import { CardComponent } from '../../../../design-system/card/card.component';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { SpinnerComponent } from '../../../../design-system/spinner/spinner.component';
import { AuthGateComponent, AuthSuccess } from '../../components/auth-gate/auth-gate.component';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { FirebaseAnalyticsService } from '../../../../core/analytics/firebase-analytics.service';
import {
  ACCEPTED_TYPES,
  AnalysisResponse,
  MAX_FILES,
  MAX_FILE_BYTES,
  QuotaStatus,
  ReportAnalysisService,
} from '../../services/report-analysis.service';
import { ReportAnalysisCardComponent } from '../../components/report-analysis-card/report-analysis-card.component';

/**
 * "Explain My Report" — the patient uploads their own lab report, scan or
 * discharge summary and gets it back in plain words.
 *
 * Its own page rather than another section of triage-shell, which is already
 * ~2,700 lines across .ts + .html and owns a different job entirely.
 *
 * Signed out, the page shows what it does and nothing else: unlike the consult,
 * which runs anonymously and only gates its exits, every upload here spends AI
 * quota, so the account IS the allowance.
 */
@Component({
  selector: 'app-report-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    IconComponent,
    SpinnerComponent,
    AuthGateComponent,
    ReportAnalysisCardComponent,
  ],
  templateUrl: './report-reader.component.html',
})
export class ReportReaderComponent implements OnInit {
  private api = inject(ReportAnalysisService);
  private router = inject(Router);
  private analytics = inject(FirebaseAnalyticsService);
  protected state = inject(AiDoctorStateService);

  protected readonly maxFiles = MAX_FILES;
  protected readonly maxFileMb = MAX_FILE_BYTES / (1024 * 1024);
  protected readonly accept = 'application/pdf,image/*';

  protected status = signal<'idle' | 'analysing' | 'result' | 'limit'>('idle');
  protected files = signal<File[]>([]);
  protected result = signal<AnalysisResponse | null>(null);
  protected quota = signal<QuotaStatus | null>(null);
  protected errorMsg = signal('');
  protected interestSent = signal(false);

  // Asked once per device, then remembered. Uploading someone's blood work is
  // not something to slip past them in a tooltip.
  protected consent = signal(false);
  protected showAuth = signal(false);

  protected canAnalyse = computed(
    () => this.files().length > 0 && this.consent() && this.status() !== 'analysing',
  );

  ngOnInit(): void {
    this.consent.set(this.state.docConsent);
    if (this.state.isLoggedIn) this.loadQuota();

    // Arrived from the chat composer's attach button with a file already
    // chosen. If they have consented before, this should feel like the upload
    // they already started — so it runs itself. If they haven't, the consent
    // step still has to happen, so the file is just pre-loaded.
    const staged = this.api.takeStagedFiles();
    if (staged.length && this.acceptFiles(staged)) {
      if (this.consent() && this.state.isLoggedIn) queueMicrotask(() => this.analyse());
    }
  }

  private loadQuota(): void {
    this.api.getQuota().subscribe({
      next: (q) => this.quota.set(q),
      // A missing counter is not worth a visible error — the upload itself
      // still enforces the allowance server-side.
      error: () => {},
    });
  }

  // ── picking files ────────────────────────────────────────────────────────

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files || []);
    input.value = ''; // so re-picking the same file still fires a change
    if (picked.length) this.acceptFiles(picked);
  }

  /**
   * Mirror the server's caps here so a doomed upload never leaves the phone.
   * Shared by the on-page picker and by files handed over from the chat
   * composer, so both refuse the same things with the same words.
   */
  private acceptFiles(picked: File[]): boolean {
    if (picked.length > this.maxFiles) {
      this.errorMsg.set(`Please choose up to ${this.maxFiles} files.`);
      return false;
    }
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      this.errorMsg.set(`${tooBig.name} is larger than ${this.maxFileMb}MB.`);
      return false;
    }
    const wrongType = picked.find((f) => f.type && !ACCEPTED_TYPES.includes(f.type));
    if (wrongType) {
      this.errorMsg.set(`${wrongType.name} isn't a PDF or a photo.`);
      return false;
    }

    this.errorMsg.set('');
    this.result.set(null);
    this.status.set('idle');
    this.files.set(picked);
    return true;
  }

  protected removeFile(index: number): void {
    this.files.update((list) => list.filter((_, i) => i !== index));
  }

  protected toggleConsent(): void {
    const next = !this.consent();
    this.consent.set(next);
    this.state.docConsent = next;
  }

  // ── analysing ────────────────────────────────────────────────────────────

  protected analyse(): void {
    if (!this.canAnalyse()) return;
    if (!this.state.isLoggedIn) {
      this.analytics.logAnalyticsEvent('signup_started', { trigger: 'report' });
      this.showAuth.set(true);
      return;
    }

    this.errorMsg.set('');
    this.status.set('analysing');
    this.api.analyze(this.files(), this.consent()).subscribe({
      next: (res) => {
        this.result.set(res);
        this.status.set('result');
        if (res.usage) this.quota.set(res.usage);
        else this.loadQuota();
        this.analytics.logAnalyticsEvent('report_analysed', {
          documentType: res.documentType,
          urgency: res.urgency,
          cached: !!res.cached,
        });
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  private handleError(err: HttpErrorResponse): void {
    // The token lives an hour and there is no refresh, so an upload started on
    // a stale session lands here. Keep the picked files: after re-login the
    // patient presses Explain again, they don't hunt for the file twice.
    if (err.status === 401) {
      this.state.logout();
      this.status.set('idle');
      this.showAuth.set(true);
      return;
    }
    if (err.status === 429) {
      const body = err.error || {};
      this.quota.set({
        tier: body.tier || 'free',
        limit: body.limit ?? 2,
        used: body.used ?? body.limit ?? 2,
        remaining: 0,
        resetAt: body.resetAt || '',
      });
      this.status.set('limit');
      this.analytics.logAnalyticsEvent('report_limit_reached', { tier: body.tier || 'free' });
      return;
    }
    this.status.set('idle');
    this.errorMsg.set(
      err.error?.message ||
        "We couldn't read that report just now. Please try again in a moment.",
    );
  }

  // ── the daily wall ───────────────────────────────────────────────────────

  protected tellUsYouWantMore(): void {
    this.api.registerUpgradeInterest().subscribe({
      next: () => this.interestSent.set(true),
      // Nothing the patient can do about a failed write, and nothing they lose.
      error: () => this.interestSent.set(true),
    });
  }

  protected resetToPicker(): void {
    this.files.set([]);
    this.result.set(null);
    this.errorMsg.set('');
    this.status.set('idle');
  }

  // ── auth gate ────────────────────────────────────────────────────────────

  protected onAuthSuccess(_ev: AuthSuccess): void {
    this.showAuth.set(false);
    this.loadQuota();
    // Straight into the upload they were already trying to make.
    if (this.files().length) this.analyse();
  }

  protected onAuthCancel(): void {
    this.showAuth.set(false);
  }

  protected startAuth(): void {
    this.analytics.logAnalyticsEvent('signup_started', { trigger: 'report' });
    this.showAuth.set(true);
  }

  // ── view helpers ─────────────────────────────────────────────────────────

  protected resetTimeLabel(): string {
    const iso = this.quota()?.resetAt;
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    if (d.getHours() === 0 && d.getMinutes() === 0) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  protected fileSizeLabel(file: File): string {
    const mb = file.size / (1024 * 1024);
    return mb < 1 ? `${Math.round(file.size / 1024)} KB` : `${mb.toFixed(1)} MB`;
  }

  protected goToConsult(): void {
    this.router.navigate(['/triage']);
  }
}
