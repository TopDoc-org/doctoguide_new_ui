import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { AiDoctorApiService } from '../../services/ai-doctor-api.service';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { ResetSuccess } from '../pin-reset/pin-reset.component';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { PinInputComponent } from '../pin-input/pin-input.component';
import { PinResetComponent } from '../pin-reset/pin-reset.component';

// "Change PIN" page (routed at /triage/change-pin).
// Flow: verify current PIN -> WhatsApp-OTP reset (app-pin-reset).
@Component({
  selector: 'app-change-pin-panel',
  standalone: true,
  imports: [CommonModule, IconComponent, PinInputComponent, PinResetComponent],
  templateUrl: './change-pin-panel.component.html',
})
export class ChangePinPanelComponent {
  stage: 'verify' | 'reset' = 'verify';

  oldPinReset = 0;
  verifyError = '';
  verifying = false;
  done = false;

  constructor(
    public state: AiDoctorStateService,
    private api: AiDoctorApiService,
    private location: Location
  ) {}

  goBack(): void {
    this.location.back();
  }

  // --- Stage 1: verify current PIN ---
  onOldPinComplete(pin: string): void {
    const mobile = (this.state.userMobile || '').trim();
    if (!mobile) {
      this.verifyError = 'Could not find your number. Please log in again.';
      return;
    }
    this.verifyError = '';
    this.verifying = true;
    this.api.login(mobile, pin).subscribe({
      next: () => {
        this.verifying = false;
        this.stage = 'reset';
      },
      error: (err) => {
        this.verifying = false;
        this.verifyError =
          err?.status === 401
            ? 'Current PIN incorrect.'
            : err?.error?.message || 'Could not verify PIN. Please try again.';
        this.oldPinReset++;
      },
    });
  }

  // --- Stage 2: reset complete -> refresh token, then return ---
  onDone(ev: ResetSuccess): void {
    this.api.login(ev.mobile, ev.newPin).subscribe({
      next: (res) => {
        if (res?.token) this.state.authToken = res.token;
        this.finish();
      },
      error: () => this.finish(),
    });
  }

  private finish(): void {
    this.done = true;
    setTimeout(() => this.location.back(), 1600);
  }
}
