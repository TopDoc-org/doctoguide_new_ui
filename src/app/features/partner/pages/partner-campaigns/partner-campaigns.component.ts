import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerApiService } from '../../services/partner-api.service';
import { CampaignCount, PartnerLead, PartnerMetrics, PartnerOfferRecord } from '../../models';
import { downloadBlob } from '../../../../core/platform/download';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

// Campaigns performance: a data-dense list of every digital campaign with its
// clicks / leads / conversions, click-to-drill into one campaign's scoped
// metrics + leads, and a per-campaign CSV export.
@Component({
  selector: 'app-partner-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './partner-campaigns.component.html',
})
export class PartnerCampaignsComponent implements OnInit {
  from = '';
  to = '';
  loading = false;
  error = '';

  campaigns: CampaignCount[] = [];

  // Drill-down state (null = list view).
  selected: CampaignCount | null = null;
  detailLoading = false;
  detail: PartnerMetrics | null = null;
  leads: PartnerLead[] = [];
  page = 1;
  pageSize = 20;
  total = 0;
  exportingKey = ''; // campaign currently exporting (row spinner)

  // Lead filters + sort for the open campaign's leads table.
  leadSpecialty = '';
  leadDistrict = '';
  leadSort = 'createdAt:desc';
  specialtyOptions: string[] = [];
  districtOptions: string[] = [];

  // Offers the clinic can enable/disable for the open campaign.
  offers: PartnerOfferRecord[] = [];
  offersOpen = false; // checkbox dropdown open state
  savingOfferId = ''; // offer id currently being toggled

  // Campaign to auto-open on load (from Overview "Performance by campaign" click).
  private autoOpen: string | null = null;

  constructor(private api: PartnerApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);
    this.autoOpen = this.route.snapshot.queryParamMap.get('c');
    this.load();
  }

  // Load the full campaign list (unfiltered metrics).
  load(): void {
    this.loading = true;
    this.error = '';
    this.selected = null;
    this.api.metrics(this.from, this.to).subscribe({
      next: (m) => {
        this.loading = false;
        this.campaigns = m.byCampaign || [];
        // Deep-link: open a specific campaign once (e.g. clicked from Overview).
        if (this.autoOpen) {
          const match = this.campaigns.find((c) => c.campaign === this.autoOpen);
          this.autoOpen = null;
          if (match) this.open(match);
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load campaigns. Try again.';
      },
    });
  }

  convRate(c: { clicks: number; leads: number }): number {
    if (!c.clicks) return 0;
    return Math.round((c.leads / c.clicks) * 1000) / 10;
  }

  // Open one campaign: scoped KPIs + first page of its leads + the clinic's offers.
  open(c: CampaignCount): void {
    this.selected = c;
    this.detail = null;
    this.leads = [];
    this.page = 1;
    this.offersOpen = false;
    // Reset filters/sort for the freshly opened campaign.
    this.leadSpecialty = '';
    this.leadDistrict = '';
    this.leadSort = 'createdAt:desc';
    this.specialtyOptions = [];
    this.districtOptions = [];
    this.detailLoading = true;
    this.error = '';
    this.api.metrics(this.from, this.to, c.campaign).subscribe({
      next: (m) => {
        this.detail = m;
        // Populate the filter dropdowns from this campaign's own data.
        this.specialtyOptions = (m.topSpecialties || []).map((s) => s.specialty).filter(Boolean);
        this.districtOptions = (m.byDistrict || []).map((d) => d.district).filter(Boolean);
      },
      error: () => (this.error = 'Could not load campaign metrics.'),
    });
    this.loadOffers();
    this.loadLeads(1);
  }

  // Re-run the leads query when a filter or sort changes (back to page 1).
  applyLeadFilters(): void {
    this.loadLeads(1);
  }

  // ---- Offers enabled for this campaign ----
  private loadOffers(): void {
    this.api.listOffers().subscribe({
      next: (res) => (this.offers = res.offers || []),
      error: () => {},
    });
  }

  // Is this offer enabled for the open campaign? (empty campaigns = all campaigns)
  offerEnabled(o: PartnerOfferRecord): boolean {
    return !!this.selected && (o.campaigns || []).includes(this.selected.campaign);
  }

  get enabledOffersCount(): number {
    return this.selected ? this.offers.filter((o) => this.offerEnabled(o)).length : 0;
  }

  // Toggle this offer's membership in the open campaign, then persist.
  toggleOffer(o: PartnerOfferRecord): void {
    if (!this.selected || !o.id) return;
    const campaign = this.selected.campaign;
    const set = new Set(o.campaigns || []);
    set.has(campaign) ? set.delete(campaign) : set.add(campaign);
    const updated: PartnerOfferRecord = { ...o, campaigns: Array.from(set) };
    this.savingOfferId = o.id;
    this.api.updateOffer(updated).subscribe({
      next: (saved) => {
        this.savingOfferId = '';
        const i = this.offers.findIndex((x) => x.id === saved.id);
        if (i >= 0) this.offers[i] = saved;
      },
      error: () => {
        this.savingOfferId = '';
        this.error = 'Could not update the offer. Try again.';
      },
    });
  }

  // Jump to the Offers tab to create a new offer.
  createOffer(): void {
    this.router.navigate(['/partner/offers']);
  }

  loadLeads(page: number): void {
    if (!this.selected) return;
    this.detailLoading = true;
    this.api
      .leads({
        from: this.from,
        to: this.to,
        page,
        campaign: this.selected.campaign,
        specialty: this.leadSpecialty || undefined,
        district: this.leadDistrict || undefined,
        sort: this.leadSort,
      })
      .subscribe({
      next: (res) => {
        this.detailLoading = false;
        this.page = page;
        this.leads = res.leads || [];
        this.total = res.total || 0;
        this.pageSize = res.pageSize || this.pageSize;
      },
      error: () => {
        this.detailLoading = false;
        this.error = 'Could not load campaign leads.';
      },
    });
  }

  back(): void {
    this.selected = null;
    this.detail = null;
    this.leads = [];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  prev(): void {
    if (this.page > 1) this.loadLeads(this.page - 1);
  }

  next(): void {
    if (this.page < this.totalPages) this.loadLeads(this.page + 1);
  }

  // Per-campaign CSV download. `campaign` empty = nothing (we always pass one).
  exportCampaign(campaign: string, ev?: Event): void {
    ev?.stopPropagation();
    this.exportingKey = campaign;
    // When exporting the open campaign, honor its active filters + sort.
    const scoped = this.selected?.campaign === campaign;
    this.api
      .exportLeads({
        from: this.from,
        to: this.to,
        campaign,
        specialty: scoped ? this.leadSpecialty || undefined : undefined,
        district: scoped ? this.leadDistrict || undefined : undefined,
        sort: scoped ? this.leadSort : undefined,
      })
      .subscribe({
      next: (blob) => {
        this.exportingKey = '';
        downloadBlob(blob, `leads-${campaign}-${this.from}-to-${this.to}.csv`);
      },
      error: () => {
        this.exportingKey = '';
        this.error = 'Export failed. Try again.';
      },
    });
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
