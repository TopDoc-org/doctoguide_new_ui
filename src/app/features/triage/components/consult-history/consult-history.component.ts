import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AiDoctorApiService, ConsultSummary } from '../../services/ai-doctor-api.service';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../design-system/icon/icon.component';

// Lists the logged-in user's past consultations. Opening one resumes it.
@Component({
  selector: 'app-consult-history',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './consult-history.component.html',
})
export class ConsultHistoryComponent implements OnInit {
  @Output() openSession = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() loggedOut = new EventEmitter<void>();

  sessions: ConsultSummary[] = [];
  loading = true;
  error = '';

  constructor(
    private api: AiDoctorApiService,
    public state: AiDoctorStateService
  ) {}

  ngOnInit(): void {
    this.api.listSessions().subscribe({
      next: (res) => {
        this.loading = false;
        // Hide the currently-open session from the list (it's already on screen).
        this.sessions = (res.sessions || []).filter(
          (s) => s.sessionId !== this.state.sessionId
        );
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 401
            ? 'Your session expired. Please log in again.'
            : 'Could not load your consultations.';
      },
    });
  }

  // Specialty chips for a session: full ranked list when present (capped at 2,
  // rest shown as "+N"), else the legacy single specialty.
  specialtyChips(s: ConsultSummary): string[] {
    const all = s.suggestedSpecialties?.length
      ? s.suggestedSpecialties.map((x) => x.specialty)
      : s.suggestedSpecialty
        ? [s.suggestedSpecialty]
        : [];
    if (all.length <= 2) return all;
    return [...all.slice(0, 2), `+${all.length - 2}`];
  }

  logout(): void {
    this.state.logout();
    this.loggedOut.emit();
  }
}
