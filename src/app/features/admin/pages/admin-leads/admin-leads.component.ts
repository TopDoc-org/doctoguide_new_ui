import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminFilters, AdminLead, AdminLeadQuery } from '../../models';
import { downloadBlob } from '../../../../core/platform/download';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-admin-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-leads.component.html',
})
export class AdminLeadsComponent implements OnInit {
  // Filter state.
  from = '';
  to = '';
  clinicId = '';
  state = '';
  district = '';
  specialty = '';
  campaign = '';
  q = '';

  // Dropdown options.
  filters: AdminFilters = { clinics: [], states: [], districts: [], specialties: [], campaigns: [] };

  // Results.
  page = 1;
  pageSize = 20;
  total = 0;
  leads: AdminLead[] = [];
  loading = false;
  exporting = false;
  error = '';

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);

    // Load dropdown options (best-effort; failure doesn't block the table).
    this.api.filters().subscribe({
      next: (f) =>
        (this.filters = {
          clinics: f.clinics || [],
          states: f.states || [],
          districts: f.districts || [],
          specialties: f.specialties || [],
          campaigns: f.campaigns || [],
        }),
      error: () => {},
    });

    this.load();
  }

  // Build the current query from the filter inputs.
  private query(page = this.page): AdminLeadQuery {
    return {
      from: this.from,
      to: this.to,
      clinicId: this.clinicId || undefined,
      state: this.state || undefined,
      district: this.district || undefined,
      specialty: this.specialty || undefined,
      campaign: this.campaign || undefined,
      q: this.q.trim() || undefined,
      page,
    };
  }

  load(page = 1): void {
    this.page = page;
    this.loading = true;
    this.error = '';
    this.api.leads(this.query(page)).subscribe({
      next: (res) => {
        this.loading = false;
        this.leads = res.leads || [];
        this.total = res.total || 0;
        this.pageSize = res.pageSize || this.pageSize;
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load leads. Try again.';
      },
    });
  }

  reset(): void {
    this.clinicId = '';
    this.state = '';
    this.district = '';
    this.specialty = '';
    this.campaign = '';
    this.q = '';
    this.load(1);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  prev(): void {
    if (this.page > 1) this.load(this.page - 1);
  }

  next(): void {
    if (this.page < this.totalPages) this.load(this.page + 1);
  }

  exportCsv(): void {
    this.exporting = true;
    this.error = '';
    this.api.exportLeads(this.query()).subscribe({
      next: (blob) => {
        this.exporting = false;
        downloadBlob(blob, `leads-all-${this.from}-to-${this.to}.csv`);
      },
      error: () => {
        this.exporting = false;
        this.error = 'Export failed. Try again.';
      },
    });
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
