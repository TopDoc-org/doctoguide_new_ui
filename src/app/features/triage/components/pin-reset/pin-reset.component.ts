import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { AiDoctorApiService } from '../../services/ai-doctor-api.service';

import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { PinInputComponent } from '../pin-input/pin-input.component';

export interface ResetSuccess {
  mobile: string;
  newPin: string;
}

// Self-contained WhatsApp-OTP PIN reset: phone -> OTP -> new PIN -> confirm.
// Ported from PremiumDocSite's reset flow. Reused by the forgot-PIN (auth-gate)
// and change-PIN (collapsible) entry points.
@Component({
  selector: 'app-pin-reset',
  standalone: true,
  imports: [FormsModule, IconComponent, PinInputComponent],
  templateUrl: './pin-reset.component.html',
})
export class PinResetComponent implements OnInit, OnDestroy {
  // When the caller already knows the number we skip the phone step and send
  // the OTP straight away.
  @Input() prefillMobile = '';

  @Output() resetSuccess = new EventEmitter<ResetSuccess>();
  @Output() back = new EventEmitter<void>();

  resetStep: 'phone' | 'otp' | 'pin' | 'success' = 'phone';
  resetPinSubStep: 'create' | 'confirm' = 'create';

  resetPhone = '';
  resetOtpId = '';
  resetOtp = '';
  private newPin = '';
  private confirmPin = '';

  resetResendTimer = 0;
  resetLoading = false;
  resetError = '';

  // bump to clear the corresponding pin-input
  otpReset = 0;
  pinReset = 0;
  confirmReset = 0;

  private timerRef: any = null;

  constructor(private api: AiDoctorApiService, private cdr: ChangeDetectorRef) {}

  /** See `auth-gate`'s copy of this: plain fields mutated after an async
   *  boundary do not render under an OnPush host (`report-reader`), only under
   *  a Default one (`triage-shell`). The resend countdown needs it too — a
   *  `setInterval` tick is an async boundary like any other, and without this
   *  the timer counts down in memory while the screen shows a frozen 60. */
  private rendered(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    const m = (this.prefillMobile || '').trim();
    if (/^\d{10}$/.test(m)) {
      this.resetPhone = m;
      this.sendOtp();
    }
  }

  ngOnDestroy(): void {
    this.destroyTimer();
  }

  get maskedPhone(): string {
    const p = this.resetPhone || '';
    return p.length === 10 ? '••••••' + p.slice(6) : p;
  }

  // --- Step 1: phone -> send OTP ---
  sendOtp(): void {
    const phone = (this.resetPhone || '').trim();
    if (!/^\d{10}$/.test(phone)) {
      this.resetError = 'Please enter a valid 10-digit mobile number.';
      return;
    }
    this.resetError = '';
    this.resetLoading = true;
    this.api.sendWhatsappOtp(phone).subscribe({
      next: (res) => {
        this.resetLoading = false;
        this.rendered();
        this.resetOtpId = res?.otpId || '';
        this.resetStep = 'otp';
        this.otpReset++;
        this.startResendTimer();
      },
      error: (err) => {
        this.resetLoading = false;
        this.resetError =
          err?.error?.message || 'Could not send the code. Please try again.';
        this.rendered();
      },
    });
  }

  resendOtp(): void {
    if (this.resetResendTimer > 0 || this.resetLoading) return;
    this.resetOtp = '';
    this.otpReset++;
    this.sendOtp();
  }

  // --- Step 2: OTP -> verify ---
  onOtpComplete(otp: string): void {
    this.resetOtp = otp;
    this.verifyOtp();
  }

  onOtpChange(otp: string): void {
    this.resetOtp = otp;
    if (this.resetError) this.resetError = '';
  }

  verifyOtp(): void {
    const otp = (this.resetOtp || '').trim();
    if (otp.length !== 6) {
      this.resetError = 'Please enter the complete 6-digit code.';
      return;
    }
    this.resetError = '';
    this.resetLoading = true;
    this.api
      .verifyWhatsappOtp({
        phoneNumber: this.resetPhone,
        otp,
        otpId: this.resetOtpId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.resetLoading = false;
          if (res?.verified === false) {
            this.resetError = 'Invalid code. Please try again.';
            this.resetOtp = '';
            this.otpReset++;
            return;
          }
          this.destroyTimer();
          this.resetStep = 'pin';
          this.resetPinSubStep = 'create';
          this.newPin = '';
          this.confirmPin = '';
          this.pinReset++;
          this.rendered();
        },
        error: (err) => {
          this.resetLoading = false;
          const msg = err?.error?.message || '';
          if (msg.includes('expired')) {
            this.resetError = 'Code expired. Please request a new one.';
          } else if (msg.includes('already used')) {
            this.resetError = 'Code already used. Please request a new one.';
          } else if (msg.toLowerCase().includes('invalid')) {
            this.resetError = 'Invalid code. Please try again.';
          } else {
            this.resetError = msg || 'Verification failed. Please try again.';
          }
          this.resetOtp = '';
          this.otpReset++;
          this.rendered();
        },
      });
  }

  // --- Step 3: create -> confirm new PIN ---
  onNewPinComplete(pin: string): void {
    this.newPin = pin;
    this.resetPinSubStep = 'confirm';
    this.confirmPin = '';
    this.confirmReset++;
  }

  onConfirmPinComplete(pin: string): void {
    this.confirmPin = pin;
    if (this.confirmPin !== this.newPin) {
      this.resetError = "PINs don't match. Please try again.";
      this.backToCreatePin();
      return;
    }
    this.submitReset();
  }

  backToCreatePin(): void {
    this.resetPinSubStep = 'create';
    this.newPin = '';
    this.confirmPin = '';
    this.pinReset++;
  }

  private submitReset(): void {
    this.resetError = '';
    this.resetLoading = true;
    this.api.resetPinAfterOtp(this.resetPhone, this.newPin).subscribe({
      next: () => {
        this.resetLoading = false;
        this.rendered();
        this.resetStep = 'success';
        this.resetSuccess.emit({ mobile: this.resetPhone, newPin: this.newPin });
      },
      error: (err) => {
        this.resetLoading = false;
        if (err?.status === 403) {
          this.resetError = 'Verification expired. Please start over.';
        } else if (err?.status === 404) {
          this.resetError = 'No account found for this number.';
        } else {
          this.resetError = err?.error?.message || 'Failed to set new PIN.';
        }
        this.backToCreatePin();
        this.rendered();
      },
    });
  }

  // --- navigation ---
  changeNumber(): void {
    this.destroyTimer();
    this.resetError = '';
    this.resetOtp = '';
    this.resetStep = 'phone';
  }

  goBack(): void {
    this.back.emit();
  }

  // --- 60s resend cooldown ---
  private startResendTimer(): void {
    this.destroyTimer();
    this.resetResendTimer = 60;
    this.timerRef = setInterval(() => {
      this.resetResendTimer--;
      if (this.resetResendTimer <= 0) this.destroyTimer();
      this.rendered();
    }, 1000);
  }

  private destroyTimer(): void {
    if (this.timerRef) {
      clearInterval(this.timerRef);
      this.timerRef = null;
    }
    this.resetResendTimer = 0;
  }
}
