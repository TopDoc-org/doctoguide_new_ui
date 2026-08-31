import { Component, OnInit } from '@angular/core';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminOverview } from '../../models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent implements OnInit {
  from = '';
  to = '';
  loading = false;
  error = '';
  data: AdminOverview | null = null;

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    // Default to the last 30 days.
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.to = this.fmt(today);
    this.from = this.fmt(past);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.overview({ from: this.from, to: this.to }).subscribe({
      next: (d) => {
        this.loading = false;
        this.data = d;
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load analytics. Try again.';
      },
    });
  }

  get conversionRate(): number {
    const d = this.data;
    if (!d || !d.clicks) return 0;
    return Math.round((d.leads / d.clicks) * 1000) / 10; // 1 decimal %
  }

  // Tallest lead count among clinics so bars scale to full width.
  get clinicMax(): number {
    const c = this.data?.byClinic || [];
    return c.reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }

  get stateMax(): number {
    const s = this.data?.byState || [];
    return s.reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }

  clinicPct(v: number): number {
    return Math.round((v / this.clinicMax) * 100);
  }

  statePct(v: number): number {
    return Math.round((v / this.stateMax) * 100);
  }

  get campaignMax(): number {
    const c = this.data?.byCampaign || [];
    return c.reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }

  campaignPct(v: number): number {
    return Math.round((v / this.campaignMax) * 100);
  }

  // Tallest specialty count, so bars scale to full width.
  get specialtyMax(): number {
    const s = this.data?.topSpecialties || [];
    return s.reduce((mx, x) => Math.max(mx, x.count), 0) || 1;
  }

  // Sum of all specialty counts, for share-of-total percentages.
  get specialtyTotal(): number {
    const s = this.data?.topSpecialties || [];
    return s.reduce((sum, x) => sum + x.count, 0) || 0;
  }

  // Bar width relative to the busiest specialty.
  specialtyPct(v: number): number {
    return Math.round((v / this.specialtyMax) * 100);
  }

  // Share of total demand (1 decimal %).
  specialtyShare(v: number): number {
    if (!this.specialtyTotal) return 0;
    return Math.round((v / this.specialtyTotal) * 1000) / 10;
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
