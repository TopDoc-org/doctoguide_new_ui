import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartnerApiService } from '../../services/partner-api.service';
import { PartnerAuthService } from '../../services/partner-auth.service';
import { PartnerSignupPayload } from '../../models';
import { RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-partner-signup',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent],
  templateUrl: './partner-signup.component.html',
})
export class PartnerSignupComponent {
  form: PartnerSignupPayload = {
    clinicName: '',
    city: '',
    state: '',
    contactName: '',
    mobile: '',
    pin: '',
  };
  confirmPin = '';
  loading = false;
  error = '';

  constructor(
    private api: PartnerApiService,
    private auth: PartnerAuthService,
    private router: Router
  ) {
    if (this.auth.isLoggedIn) this.router.navigate(['/partner/dashboard']);
  }

  submit(): void {
    const f = this.form;
    if (!f.clinicName.trim() || !f.city.trim() || !f.contactName.trim() || !f.mobile.trim() || !f.pin.trim()) {
      this.error = 'Fill in all required fields.';
      return;
    }
    if (f.pin.length < 4) {
      this.error = 'Password must be at least 4 characters.';
      return;
    }
    if (f.pin !== this.confirmPin) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api
      .signup({
        clinicName: f.clinicName.trim(),
        city: f.city.trim(),
        state: (f.state || '').trim() || undefined,
        contactName: f.contactName.trim(),
        mobile: f.mobile.trim(),
        pin: f.pin.trim(),
      })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (!res?.token) {
            this.error = 'Could not create your account. Try again.';
            return;
          }
          this.auth.setSession(res.token, res.clinicId, res.clinicName);
          this.router.navigate(['/partner/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err?.error?.message ||
            'Could not create your account. This mobile may already be registered.';
        },
      });
  }
}
