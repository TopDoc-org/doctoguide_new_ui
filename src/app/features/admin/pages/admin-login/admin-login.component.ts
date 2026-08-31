import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './admin-login.component.html',
})
export class AdminLoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';
  // Set when redirected here by the session-expiry interceptor.
  sessionExpired = false;

  constructor(
    private api: AdminApiService,
    private auth: AdminAuthService,
    private router: Router,
    route: ActivatedRoute
  ) {
    this.sessionExpired = route.snapshot.queryParamMap.has('expired');
    if (!this.sessionExpired && this.auth.isLoggedIn) this.router.navigate(['/admin/overview']);
  }

  submit(): void {
    const username = this.username.trim();
    const password = this.password.trim();
    if (!username || !password) {
      this.error = 'Enter your username and password.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.login(username, password).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.token) {
          this.error = 'Invalid credentials.';
          return;
        }
        this.auth.setSession(res.token, res.name);
        this.router.navigate(['/admin/overview']);
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.message || 'Login failed. Check your details and try again.';
      },
    });
  }
}
