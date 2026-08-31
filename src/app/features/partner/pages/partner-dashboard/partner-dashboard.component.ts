import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PartnerApiService } from '../../services/partner-api.service';
import { PartnerAuthService } from '../../services/partner-auth.service';
import { PartnerMetrics, PartnerOfferRecord } from '../../models';
import { OFFER_TEMPLATES } from '../../data/offer-templates';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-partner-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent],
  templateUrl: './partner-dashboard.component.html',
})
export class PartnerDashboardComponent implements OnInit {
  from = '';
  to = '';
  loading = false;
  error = '';
  metrics: PartnerMetrics | null = null;

  // The tracked campaign link this clinic shares in its ads.
  campaignUrl = '';
  copied = false;

  // Link builder: optional campaign number/name (+ source/medium) appended as
  // utm params so each ad campaign is tracked separately.
  clinicId = '';
  campaignCode = '';
  campaignSource = '';
  campaignMedium = '';

  // Filter: scope metrics to one campaign. Options captured from the first
  // (unfiltered) load so the dropdown doesn't collapse when a filter is active.
  selectedCampaign = '';
  campaignOptions: string[] = [];

  // "Active offers" picker: the clinic's created offers + the ready-made
  // templates, multi-selected for the campaign typed into the link builder.
  offers: PartnerOfferRecord[] = [];
  readonly templates = OFFER_TEMPLATES;
  savingOfferKey = ''; // title currently being created/toggled
  offersExpanded = false; // collapsed = show first 2 (+ any checked)

  ngOnInit(): void {
    // Default to the last 30 days.
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);
    this.clinicId = this.auth.clinicId || '';
    this.buildLink();
    this.load();
    this.loadOffers();
  }

  // ---- Active offers for the campaign being built ----
  private loadOffers(): void {
    this.api.listOffers().subscribe({
      next: (res) => (this.offers = res.offers || []),
      error: () => {},
    });
  }

  // Created offers first (priority), then templates not yet created (by title).
  get activeOfferItems(): PartnerOfferRecord[] {
    const usedTitles = new Set(this.offers.map((o) => o.title));
    const templatesLeft = this.templates.filter((t) => !usedTitles.has(t.title));
    return [...this.offers, ...templatesLeft];
  }

  // Collapsed view: first 2 offers + any already-checked ones (so a selected
  // offer is never hidden). Expanded shows all.
  get visibleOfferItems(): PartnerOfferRecord[] {
    const items = this.activeOfferItems;
    if (this.offersExpanded || items.length <= 2) return items;
    const checkedExtra = items.slice(2).filter((o) => this.isOfferChecked(o));
    return [...items.slice(0, 2), ...checkedExtra];
  }

  get hiddenOfferCount(): number {
    return Math.max(0, this.activeOfferItems.length - this.visibleOfferItems.length);
  }

  get hasCampaignCode(): boolean {
    return !!this.campaignCode.trim();
  }

  isTemplate(o: PartnerOfferRecord): boolean {
    return !o.id;
  }

  isOfferChecked(o: PartnerOfferRecord): boolean {
    return this.hasCampaignCode && (o.campaigns || []).includes(this.campaignCode.trim());
  }

  // Attach/detach this offer to the campaign typed in the builder. Checking a
  // template creates it as a real offer first.
  toggleOffer(o: PartnerOfferRecord): void {
    const campaign = this.campaignCode.trim();
    if (!campaign || this.savingOfferKey) return;
    this.savingOfferKey = o.title;

    if (o.id) {
      const set = new Set(o.campaigns || []);
      set.has(campaign) ? set.delete(campaign) : set.add(campaign);
      this.api.updateOffer({ ...o, campaigns: Array.from(set) }).subscribe({
        next: () => this.afterOfferSave(),
        error: () => this.afterOfferError(),
      });
    } else {
      // Template → create + attach instantly.
      this.api.createOffer({ ...o, campaigns: [campaign], active: true }).subscribe({
        next: () => this.afterOfferSave(),
        error: () => this.afterOfferError(),
      });
    }
  }

  private afterOfferSave(): void {
    this.savingOfferKey = '';
    this.loadOffers();
  }

  private afterOfferError(): void {
    this.savingOfferKey = '';
    this.error = 'Could not update the offer. Try again.';
  }

  // Rebuild the shareable link from the clinic ref + builder inputs.
  buildLink(): void {
    if (!this.clinicId) {
      this.campaignUrl = '';
      return;
    }
    const params = new URLSearchParams({ ref: this.clinicId });
    if (this.campaignCode.trim()) params.set('utm_campaign', this.campaignCode.trim());
    if (this.campaignSource.trim()) params.set('utm_source', this.campaignSource.trim());
    if (this.campaignMedium.trim()) params.set('utm_medium', this.campaignMedium.trim());
    // Land on the branded home page (not straight into chat) for brand coherence.
    // AffiliateService.capture() runs on every navigation, so the ?ref= is still
    // captured here and persists into the chat the patient starts next.
    this.campaignUrl = `${window.location.origin}/?${params.toString()}`;
  }

  constructor(private api: PartnerApiService, private auth: PartnerAuthService, private router: Router) {}

  // Keyboard activation for the clickable campaign rows.
  goToCampaign(campaign: string): void {
    this.router.navigate(['/partner/campaigns'], { queryParams: { c: campaign } });
  }

  copyLink(): void {
    if (!this.campaignUrl) return;
    const done = () => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(this.campaignUrl).then(done, () => {});
    } else {
      done();
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.metrics(this.from, this.to, this.selectedCampaign || undefined).subscribe({
      next: (m) => {
        this.loading = false;
        this.metrics = m;
        // Capture the full campaign list from the unfiltered view only.
        if (!this.selectedCampaign) {
          this.campaignOptions = (m.byCampaign || []).map((c) => c.campaign).filter(Boolean);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load metrics. Try again.';
      },
    });
  }

  get conversionRate(): number {
    const m = this.metrics;
    if (!m || !m.clicks) return 0;
    return Math.round((m.leads / m.clicks) * 1000) / 10; // 1 decimal %
  }

  // Tallest bar value across clicks+leads so bars scale to the chart height.
  get seriesMax(): number {
    const s = this.metrics?.series || [];
    return s.reduce((mx, p) => Math.max(mx, p.clicks, p.leads), 0) || 1;
  }

  barPct(v: number): number {
    return Math.round((v / this.seriesMax) * 100);
  }

  // Tallest specialty count so bars scale to full width.
  get specialtyMax(): number {
    const s = this.metrics?.topSpecialties || [];
    return s.reduce((mx, x) => Math.max(mx, x.count), 0) || 1;
  }

  specialtyPct(v: number): number {
    return Math.round((v / this.specialtyMax) * 100);
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
