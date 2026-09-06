import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OwnerApiService } from '../../services/owner-api.service';
import { OwnerCampaignRow, OwnerFilters, OwnerLead, OwnerQuery } from '../../models';
import { downloadBlob } from '../../../../core/platform/download';
import { ToastService } from '../../../../design-system/toast/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '../../../../design-system/empty-state/empty-state.component';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { PageHeaderComponent } from '../../../../design-system/page-header/page-header.component';
import { TableComponent } from '../../../../design-system/table/table.component';

@Component({
  selector: 'app-owner-campaigns',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IconComponent, PageHeaderComponent, TableComponent, EmptyStateComponent,
  ],
  templateUrl: './owner-campaigns.component.html',
})
export class OwnerCampaignsComponent implements OnInit {
  from = '';
  to = '';
  clinicId = '';
  state = '';
  district = '';
  specialty = '';
  q = '';

  filters: OwnerFilters = { clinics: [], states: [], districts: [], specialties: [], campaigns: [] };
  rows: OwnerCampaignRow[] = [];
  loading = false;
  exporting = false;
  error = '';

  // Drill-down into one (campaign, clinic) row.
  selected: OwnerCampaignRow | null = null;
  detailLoading = false;
  leads: OwnerLead[] = [];
  page = 1;
  pageSize = 20;
  total = 0;

  /** Export outcomes are announced, not written into a paragraph the
   *  user has already scrolled past. A CSV export is the one console
   *  action with NO on-screen result: on success the only evidence is a
   *  file in the browser's download tray, and on failure the old inline
   *  `error` sat above a table the user was looking at the bottom of. */
  private readonly toast = inject(ToastService);

  constructor(private api: OwnerApiService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);
    this.clinicId = this.route.snapshot.queryParamMap.get('clinicId') || '';

    this.api.filters().subscribe({
      next: (f) => (this.filters = { clinics: f.clinics || [], states: f.states || [], districts: f.districts || [], specialties: f.specialties || [], campaigns: f.campaigns || [] }),
      error: () => {},
    });
    this.load();
  }

  private query(): OwnerQuery {
    return {
      from: this.from,
      to: this.to,
      clinicId: this.clinicId || undefined,
      state: this.state || undefined,
      district: this.district || undefined,
      specialty: this.specialty || undefined,
      q: this.q.trim() || undefined,
    };
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.selected = null;
    this.api.campaigns(this.query()).subscribe({
      next: (res) => {
        this.loading = false;
        this.rows = res.campaigns || [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load campaigns. Try again.';
      },
    });
  }

  reset(): void {
    this.clinicId = '';
    this.state = '';
    this.district = '';
    this.specialty = '';
    this.q = '';
    this.load();
  }

  convRate(r: { clicks: number; leads: number }): number {
    if (!r.clicks) return 0;
    return Math.round((r.leads / r.clicks) * 1000) / 10;
  }

  open(r: OwnerCampaignRow): void {
    this.selected = r;
    this.leads = [];
    this.page = 1;
    this.loadLeads(1);
  }

  loadLeads(page: number): void {
    if (!this.selected) return;
    this.detailLoading = true;
    this.api.leads({ from: this.from, to: this.to, campaign: this.selected.campaign, clinicId: this.selected.clinicId, page }).subscribe({
      next: (res) => {
        this.detailLoading = false;
        this.page = page;
        this.leads = res.leads || [];
        this.total = res.total || 0;
        this.pageSize = res.pageSize || this.pageSize;
      },
      error: () => {
        this.detailLoading = false;
        this.error = 'Could not load leads.';
      },
    });
  }

  back(): void {
    this.selected = null;
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

  exportCsv(): void {
    this.exporting = true;
    this.api.exportCampaigns(this.query()).subscribe({
      next: (blob) => {
        this.exporting = false;
        this.download(blob, `campaigns-${this.from}-to-${this.to}.csv`);
        this.toast.success('Export ready — check your downloads.');
      },
      error: () => {
        this.exporting = false;
        this.toast.error('Export failed.', { action: { label: 'Retry', run: () => this.exportCsv() } });
      },
    });
  }

  exportSelectedLeads(): void {
    if (!this.selected) return;
    this.api.exportLeads({ from: this.from, to: this.to, campaign: this.selected.campaign, clinicId: this.selected.clinicId }).subscribe({
      next: (blob) => {
        this.download(blob, `leads-${this.selected!.campaign}-${this.selected!.clinicId}.csv`);
        this.toast.success('Export ready — check your downloads.');
      },
      error: () =>
        this.toast.error('Export failed.', {
          action: { label: 'Retry', run: () => this.exportSelectedLeads() },
        }),
    });
  }

  private download(blob: Blob, filename: string): void {
    downloadBlob(blob, filename);
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
