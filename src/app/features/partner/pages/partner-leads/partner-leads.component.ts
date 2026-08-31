import { Component, OnInit } from '@angular/core';
import { PartnerApiService } from '../../services/partner-api.service';
import { PartnerLead } from '../../models';
import { downloadBlob } from '../../../../core/platform/download';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-partner-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './partner-leads.component.html',
})
export class PartnerLeadsComponent implements OnInit {
  from = '';
  to = '';
  page = 1;
  pageSize = 20;
  total = 0;
  leads: PartnerLead[] = [];
  loading = false;
  exporting = false;
  error = '';

  // Filters + sort. Options pulled from the metrics breakdown so they cover the
  // whole clinic, not just the current leads page.
  campaign = '';
  specialty = '';
  district = '';
  sort = 'createdAt:desc';
  campaignOptions: string[] = [];
  specialtyOptions: string[] = [];
  districtOptions: string[] = [];

  constructor(private api: PartnerApiService) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);
    this.load();
  }

  // Populate the campaign / specialty / district dropdowns from the clinic-wide
  // metrics breakdown for the current range. Only refreshed on the unfiltered
  // view so selecting a value doesn't collapse the option lists.
  private loadFilterOptions(): void {
    this.api.metrics(this.from, this.to).subscribe({
      next: (m) => {
        this.campaignOptions = (m.byCampaign || []).map((c) => c.campaign).filter(Boolean);
        this.specialtyOptions = (m.topSpecialties || []).map((s) => s.specialty).filter(Boolean);
        this.districtOptions = (m.byDistrict || []).map((d) => d.district).filter(Boolean);
      },
      error: () => {},
    });
  }

  load(page = 1): void {
    this.page = page;
    this.loading = true;
    this.error = '';
    if (!this.campaign && !this.specialty && !this.district) this.loadFilterOptions();
    this.api
      .leads({
        from: this.from,
        to: this.to,
        page,
        campaign: this.campaign || undefined,
        specialty: this.specialty || undefined,
        district: this.district || undefined,
        sort: this.sort,
      })
      .subscribe({
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
    this.api
      .exportLeads({
        from: this.from,
        to: this.to,
        campaign: this.campaign || undefined,
        specialty: this.specialty || undefined,
        district: this.district || undefined,
        sort: this.sort,
      })
      .subscribe({
      next: (blob) => {
        this.exporting = false;
        downloadBlob(blob, `leads-${this.from}-to-${this.to}.csv`);
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
