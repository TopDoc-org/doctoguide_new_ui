import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OwnerApiService } from '../../services/owner-api.service';
import { OwnerClinicRow } from '../../models';
import { downloadBlob } from '../../../../core/platform/download';
import { ToastService } from '../../../../design-system/toast/toast.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../../../design-system/badge/badge.component';
import { EmptyStateComponent } from '../../../../design-system/empty-state/empty-state.component';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { PageHeaderComponent } from '../../../../design-system/page-header/page-header.component';
import { TableComponent } from '../../../../design-system/table/table.component';

@Component({
  selector: 'app-owner-clinics',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IconComponent, PageHeaderComponent, TableComponent, BadgeComponent, EmptyStateComponent,
  ],
  templateUrl: './owner-clinics.component.html',
})
export class OwnerClinicsComponent implements OnInit {
  from = '';
  to = '';
  rows: OwnerClinicRow[] = [];
  loading = false;
  exporting = false;
  error = '';

  /** Export outcomes are announced, not written into a paragraph the
   *  user has already scrolled past. A CSV export is the one console
   *  action with NO on-screen result: on success the only evidence is a
   *  file in the browser's download tray, and on failure the old inline
   *  `error` sat above a table the user was looking at the bottom of. */
  private readonly toast = inject(ToastService);

  constructor(private api: OwnerApiService, private router: Router) {}

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
    this.api.clinics({ from: this.from, to: this.to }).subscribe({
      next: (res) => {
        this.loading = false;
        this.rows = res.clinics || [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load clinics. Try again.';
      },
    });
  }

  convRate(r: { clicks: number; leads: number }): number {
    if (!r.clicks) return 0;
    return Math.round((r.leads / r.clicks) * 1000) / 10;
  }

  // Jump to the campaign explorer scoped to this clinic.
  viewCampaigns(c: OwnerClinicRow): void {
    this.router.navigate(['/owner/campaigns'], { queryParams: { clinicId: c.clinicId } });
  }

  exportCsv(): void {
    this.exporting = true;
    this.api.exportClinics({ from: this.from, to: this.to }).subscribe({
      next: (blob) => {
        this.exporting = false;
        downloadBlob(blob, `clinics-${this.from}-to-${this.to}.csv`);
        this.toast.success('Export ready — check your downloads.');
      },
      error: () => {
        this.exporting = false;
        this.toast.error('Export failed.', { action: { label: 'Retry', run: () => this.exportCsv() } });
      },
    });
  }

  private fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
