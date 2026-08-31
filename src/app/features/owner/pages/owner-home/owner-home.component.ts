import { Component, OnInit } from '@angular/core';
import { OwnerApiService } from '../../services/owner-api.service';
import { OwnerSummary } from '../../models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-owner-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-home.component.html',
})
export class OwnerHomeComponent implements OnInit {
  from = '';
  to = '';
  loading = false;
  error = '';
  data: OwnerSummary | null = null;

  constructor(private api: OwnerApiService) {}

  ngOnInit(): void {
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
    this.api.summary({ from: this.from, to: this.to }).subscribe({
      next: (d) => {
        this.loading = false;
        this.data = d;
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load platform summary. Try again.';
      },
    });
  }

  get conversionRate(): number {
    const d = this.data;
    if (!d || !d.clicks) return 0;
    return Math.round((d.leads / d.clicks) * 1000) / 10;
  }

  get clinicMax(): number {
    return (this.data?.topClinics || []).reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }
  get campaignMax(): number {
    return (this.data?.topCampaigns || []).reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }
  get stateMax(): number {
    return (this.data?.byState || []).reduce((mx, x) => Math.max(mx, x.leads), 0) || 1;
  }

  pct(v: number, max: number): number {
    return Math.round((v / max) * 100);
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
