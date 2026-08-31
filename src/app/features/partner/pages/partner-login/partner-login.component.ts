import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PartnerApiService } from '../../services/partner-api.service';
import { PartnerAuthService } from '../../services/partner-auth.service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

type LoginMode = 'password' | 'pin';

@Component({
  selector: 'app-partner-login',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, IconComponent],
  templateUrl: './partner-login.component.html',
})
export class PartnerLoginComponent {
  // 'password' = KnocDoc Pro admins (staff pwdLogin); 'pin' = self-serve clinic accounts.
  mode: LoginMode = 'password';
  mobile = '';
  password = '';
  pin = '';
  loading = false;
  error = '';
  // Set when redirected here by the session-expiry interceptor.
  sessionExpired = false;

  private readonly adminDeniedMsg =
    "This account doesn't have clinic-admin access. Ask your clinic's KnocDoc Pro admin to enable it, or create a new clinic account.";

  constructor(
    private api: PartnerApiService,
    private auth: PartnerAuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.sessionExpired = route.snapshot.queryParamMap.has('expired');
    if (!this.sessionExpired && this.auth.isLoggedIn) this.router.navigate(['/partner/dashboard']);
  }

  setMode(m: LoginMode): void {
    this.mode = m;
    this.error = '';
  }

  submit(): void {
    if (this.mode === 'pin') this.submitPin();
    else this.submitPassword();
  }

  // KnocDoc Pro admin login (mobile + password) via /user/staff/pwdLogin.
  private submitPassword(): void {
    const mobile = this.mobile.trim();
    const password = this.password.trim();
    if (!mobile || !password) {
      this.error = 'Enter your mobile number and password.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.pwdLogin(mobile, password).subscribe({
      next: (res) => {
        this.loading = false;
        const token = res?.token;
        if (!token) {
          this.error = res?.message || 'Invalid credentials.';
          return;
        }
        const staff = res.staffDetails;
        // Clinic-admin gate: must be an admin mapped to an organisation (clinic).
        const org = (staff?.mappedTo || []).find((m) => m.type === 'organisation');
        if (staff?.designation !== 'admin' || !org) {
          this.error = this.adminDeniedMsg;
          return;
        }
        // The mapped organisation IS the partner clinic (id + name).
        this.auth.setSession(token, org.id, org.name);
        this.router.navigate(['/partner/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 403
            ? this.adminDeniedMsg
            : err?.error?.message || 'Login failed. Check your details and try again.';
      },
    });
  }

  // Self-serve clinic account login (mobile + PIN) via /partner/login.
  private submitPin(): void {
    const mobile = this.mobile.trim();
    const pin = this.pin.trim();
    if (!mobile || !pin) {
      this.error = 'Enter your mobile number and PIN.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.login(mobile, pin).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.token) {
          this.error = 'Invalid credentials.';
          return;
        }
        this.auth.setSession(res.token, res.clinicId, res.clinicName);
        this.router.navigate(['/partner/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 403) {
          this.error = err?.error?.message || this.adminDeniedMsg;
          return;
        }
        this.error = err?.error?.message || 'Login failed. Check your details and try again.';
      },
    });
  }
}
