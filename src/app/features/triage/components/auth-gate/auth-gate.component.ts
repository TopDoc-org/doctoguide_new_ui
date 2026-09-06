import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AiDoctorApiService } from '../../services/ai-doctor-api.service';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { GeolocationService } from '../../services/geolocation.service';
import { FirebaseAnalyticsService } from '../../../../core/analytics/firebase-analytics.service';
import { RouterLink } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { PinInputComponent } from '../pin-input/pin-input.component';
import { PinResetComponent } from '../pin-reset/pin-reset.component';

export interface AuthSuccess {
  name: string;
  mobile: string;
  userId: string;
  district?: string;
  city?: string;
  state?: string;
  lat?: number | null;
  lng?: number | null;
}

// PIN-based account gate. Mirrors PremiumDocSite's auth flow (no OTP):
// collect mobile -> numCheck -> login (existing) or register (new / upgrade).

// Tag accounts created (or PIN-upgraded) through this app, so the login PIN
// prompt can tell "your PIN" (set here) apart from "your KnocDoc PIN" (account
// created in the KnocDoc apps, which share the same user backend).
const SIGNUP_SOURCE = 'aiDoctor';
@Component({
  selector: 'app-auth-gate',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent, PinInputComponent, PinResetComponent],
  templateUrl: './auth-gate.component.html',
})
export class AuthGateComponent implements OnInit {
  // 'pdf' | 'soap' | 'doctors' | 'home' | 'report' gates run a pending action on
  // success; null = pure login. 'report' differs from the rest in that the whole
  // feature is behind it — the report reader has nothing to show a signed-out
  // visitor, where the consult runs anonymously and only gates its exits.
  @Input() pendingAction: 'pdf' | 'soap' | 'doctors' | 'home' | 'report' | null = null;
  @Input() sessionId: string | null = null;

  // Age/sex captured during the anonymous triage chat. On a brand-new account
  // these seed the patient profile (sex -> gender, age -> approx DOB).
  @Input() triageAge: number | null = null;
  @Input() triageSex: string = '';

  @Output() authSuccess = new EventEmitter<AuthSuccess>();
  @Output() cancel = new EventEmitter<void>();

  authStep: 'phone' | 'login' | 'details' | 'register' = 'phone';
  registerPinStep: 'create' | 'confirm' = 'create';

  name = '';
  mobile = '';
  district = '';
  city = '';
  stateName = '';
  lat: number | null = null;
  lng: number | null = null;
  locating = false;
  private pinValue = '';
  private confirmPinValue = '';

  private existingUser: any = null;
  private isUnregisteredUpgrade = false;
  // True once this gate creates/upgrades an account (so we seed the profile
  // with triage age/sex on the follow-up login, but never on a plain login).
  private justRegistered = false;

  authError = '';
  busy = false;

  // forgot-PIN (WhatsApp-OTP reset) shown in place of the login PIN entry
  showReset = false;

  // bumping these clears the corresponding pin-input
  pinReset = 0;
  confirmReset = 0;

  get title(): string {
    if (this.authStep === 'login') return 'Welcome back!';
    if (this.authStep === 'details') return 'A few details';
    if (this.authStep === 'register')
      return this.registerPinStep === 'create' ? 'Create your PIN' : 'Confirm your PIN';
    return 'Just One Step';
  }

  get displayName(): string {
    return this.existingUser?.name || this.name;
  }

  // Existing account that wasn't created through this app -> a KnocDoc account.
  get isKnocDocAccount(): boolean {
    return !!this.existingUser && this.existingUser.signupSource !== SIGNUP_SOURCE;
  }

  close(): void {
    this.cancel.emit();
  }

  // --- Step 1: phone only -> numCheck -> branch (login vs details) ---
  submitPhone(): void {
    this.authError = '';
    const mobile = (this.mobile || '').trim();
    if (!/^\d{10}$/.test(mobile)) {
      this.authError = 'Enter a valid 10-digit WhatsApp number.';
      return;
    }
    this.busy = true;
    this.api.numCheck(mobile).subscribe({
      next: (res) => {
        this.busy = false;
        this.rendered();
        const hit = res?.hits && res.hits > 0 ? res.results?.[0] : null;
        if (hit && hit.userType !== 'unRegistered') {
          // Existing registered user -> straight to PIN login (no district here).
          this.existingUser = hit;
          this.authStep = 'login';
        } else {
          // New or unregistered -> collect name + district before PIN.
          this.existingUser = hit || null;
          this.isUnregisteredUpgrade = !!hit; // hit here means userType 'unRegistered'
          if (hit?.name) this.name = hit.name;
          this.authStep = 'details';
        }
      },
      error: () => {
        // On failure, let the user proceed as a new account.
        this.busy = false;
        this.isUnregisteredUpgrade = false;
        this.existingUser = null;
        this.authStep = 'details';
        this.rendered();
      },
    });
  }

  // --- Step 2 (new user): name + district -> create PIN ---
  submitDetails(): void {
    this.authError = '';
    if (!this.name || !this.name.trim()) {
      this.authError = 'Please enter your name.';
      return;
    }
    if (!this.district || !this.district.trim()) {
      this.authError = 'Please add your district (tap “Use my location” or type it).';
      return;
    }
    this.goRegister();
  }

  private goRegister(): void {
    this.authStep = 'register';
    this.registerPinStep = 'create';
    this.pinValue = '';
    this.confirmPinValue = '';
    this.pinReset++;
  }

  useDifferentNumber(): void {
    this.authError = '';
    this.showReset = false;
    this.existingUser = null;
    this.isUnregisteredUpgrade = false;
    this.authStep = 'phone';
  }

  // --- Forgot PIN: WhatsApp-OTP reset succeeded -> log in with the new PIN ---
  onResetSuccess(ev: { mobile: string; newPin: string }): void {
    this.authError = '';
    this.busy = true;
    this.api.login(ev.mobile, ev.newPin).subscribe({
      next: (res) => {
        this.showReset = false;
        this.finishLogin(res);
      },
      error: (err) => {
        this.busy = false;
        this.showReset = false;
        this.authError = err?.error?.message || 'PIN updated — please log in.';
        this.pinReset++;
        this.rendered();
      },
    });
  }

  // --- Login (existing user with a PIN) ---
  onLoginPinComplete(pin: string): void {
    this.pinValue = pin;
    this.submitLogin();
  }

  private submitLogin(): void {
    this.authError = '';
    this.busy = true;
    this.api.login(this.mobile.trim(), this.pinValue).subscribe({
      next: (res) => {
        // Returning user — not a conversion, kept separate from sign_up so the
        // key-event count stays a count of new accounts only.
        this.analytics.logAnalyticsEvent('login', {
          method: this.isKnocDocAccount ? 'knocdoc_account' : 'pin',
        });
        this.completeExistingLogin(res);
      },
      error: (err) => {
        this.busy = false;
        const code = err?.status;
        if (code === 401) this.authError = 'Incorrect PIN. Please try again.';
        else if (code === 423)
          this.authError =
            err?.error?.message || 'Account locked from too many attempts. Try again later.';
        else this.authError = err?.error?.message || 'Login failed. Please try again.';
        this.pinReset++;
        this.rendered();
      },
    });
  }

  // Existing user logged in: pull district/city/state from their profile so the
  // lead has location without showing a district field on the login screen.
  private completeExistingLogin(res: any): void {
    const uid = res?.userDetails?.userId;
    if (!uid) {
      this.finishLogin(res);
      return;
    }
    // Set the token first so the profile fetch is authenticated.
    this.state.authToken = res?.token || null;
    this.api.getUserDetails(uid, ['city', 'state', 'district', 'Zipcode', 'address']).subscribe({
      next: (pres) => {
        const d = pres?.results?.[0] || {};
        if (d.city) this.city = d.city;
        if (d.state) this.stateName = d.state;
        // Accounts created before district was persisted at signup have none —
        // fall back to GPS, then city.
        this.district = (this.district || d.district || d.city || '').trim();
        this.finishLogin(res);
      },
      error: () => this.finishLogin(res),
    });
  }

  // --- Register (create -> confirm -> submit) ---
  onCreatePinComplete(pin: string): void {
    this.pinValue = pin;
    this.registerPinStep = 'confirm';
    this.confirmPinValue = '';
    this.confirmReset++;
  }

  onConfirmPinComplete(pin: string): void {
    this.confirmPinValue = pin;
    this.submitRegister();
  }

  backToCreate(): void {
    this.authError = '';
    this.registerPinStep = 'create';
    this.pinValue = '';
    this.confirmPinValue = '';
    this.pinReset++;
  }

  private submitRegister(): void {
    this.authError = '';
    if (this.confirmPinValue !== this.pinValue) {
      this.authError = 'PINs do not match. Please try again.';
      this.backToCreate();
      return;
    }
    const mobile = this.mobile.trim();
    const { firstName, lastName } = this.splitName(this.name);
    this.busy = true;
    this.justRegistered = true;

    if (this.isUnregisteredUpgrade) {
      const payload = {
        mobile,
        pin: this.pinValue,
        name: this.name.trim(),
        first_name: firstName,
        last_name: lastName,
        acceptTerms: true,
        signupSource: SIGNUP_SOURCE,
        // The details step makes district mandatory; persist it on the account
        // instead of letting it die with the form. Without this the only
        // geography we ever keep is on the lead record.
        district: this.district.trim() || undefined,
      };
      this.api.setPin(payload).subscribe({
        next: () => {
          // Conversion: an existing unregistered record became a real account.
          this.analytics.logAnalyticsEvent('sign_up', { method: 'pin_upgrade' });
          this.submitLoginAfterRegister();
        },
        error: (err) => {
          this.busy = false;
          if (err?.status === 409) {
            // Already fully registered elsewhere -> log in instead.
            this.authStep = 'login';
            this.authError = 'You already have an account. Please enter your PIN.';
          } else {
            this.authError = err?.error?.message || 'Could not set PIN. Try again.';
            this.backToCreate();
          }
          this.rendered();
        },
      });
    } else {
      const payload = {
        firstName,
        lastName,
        name: this.name.trim(),
        mobileNumber: mobile,
        password: this.pinValue,
        confirmPassword: this.confirmPinValue,
        role: 'user',
        userType: 'registered',
        acceptTerms: true,
        signupSource: SIGNUP_SOURCE,
        // Same as the upgrade branch above — the district is already collected
        // and validated on the details step, so store it on the account.
        district: this.district.trim() || undefined,
      };
      this.api.signup(payload).subscribe({
        next: () => {
          // Conversion: brand-new account. Logged on this branch rather than in
          // finishLogin(), which returning logins and PIN resets also pass through.
          this.analytics.logAnalyticsEvent('sign_up', { method: 'pin' });
          this.submitLoginAfterRegister();
        },
        error: (err) => {
          this.busy = false;
          if (err?.status === 409) {
            this.authStep = 'login';
            this.authError = 'You already have an account. Please enter your PIN.';
          } else {
            this.authError = err?.error?.message || 'Could not create account. Try again.';
            this.backToCreate();
          }
          this.rendered();
        },
      });
    }
  }

  private submitLoginAfterRegister(): void {
    this.api.login(this.mobile.trim(), this.pinValue).subscribe({
      next: (res) => this.finishLogin(res),
      error: (err) => {
        this.busy = false;
        this.authError = err?.error?.message || 'Account created — please log in.';
        this.authStep = 'login';
        this.pinReset++;
        this.rendered();
      },
    });
  }

  private finishLogin(res: any): void {
    this.busy = false;
    this.rendered();
    const ud = res?.userDetails || {};
    this.state.authToken = res?.token || null;
    this.state.userId = ud.userId || null;
    this.state.userName = ud.name || this.name.trim() || null;
    this.state.userMobile = this.mobile.trim() || null;
    this.seedTriageProfile(ud.userId || null);
    this.authSuccess.emit({
      name: this.displayName.trim(),
      mobile: this.mobile.trim(),
      userId: ud.userId || '',
      district: this.district.trim() || undefined,
      city: this.city.trim() || undefined,
      state: this.stateName.trim() || undefined,
      lat: this.lat,
      lng: this.lng,
    });
  }

  // New account only: persist the triage age/sex into the patient profile.
  // sex -> gender as-is; age -> approx DOB (Jan 1 of the birth year — profile
  // has no age field). Fire-and-forget; token is already set by finishLogin.
  private seedTriageProfile(userId: string | null): void {
    if (!this.justRegistered || !userId) return;
    if (this.triageAge == null && !this.triageSex) return;
    const payload: any = { id: [userId], role: 'user' };
    if (this.triageSex) payload.gender = this.triageSex;
    if (this.triageAge != null && this.triageAge > 0) {
      const year = new Date().getFullYear() - this.triageAge;
      payload.DOB = `${year}-01-01`;
    }
    this.api.updateUserDetails(payload).subscribe({ next: () => {}, error: () => {} });
  }

  private splitName(full: string): { firstName: string; lastName: string } {
    const parts = (full || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;
    return { firstName, lastName };
  }

  constructor(
    private api: AiDoctorApiService,
    private state: AiDoctorStateService,
    private geo: GeolocationService,
    private analytics: FirebaseAnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Marks THIS view dirty after an async boundary.
   *
   * This component holds its state in plain fields and mutates them from HTTP
   * callbacks, so it only renders when something checks its view. That is free
   * under a Default-strategy host (`triage-shell`) and NEVER HAPPENS under an
   * OnPush one (`report-reader`): the parent view is not dirty, so change
   * detection stops above this component and the DOM keeps whatever it had.
   *
   * The symptom is not an error. The request succeeds, the fields are correct
   * in memory, and the button sits on "Please wait…" forever.
   *
   * Every callback below that runs after an await or a subscribe calls this.
   * Add one to any new one — the alternative is that the gate silently only
   * works on some of the pages that host it.
   */
  private rendered(): void {
    this.cdr.markForCheck();
  }

  // Auto-prefill district from GPS on open (silent — no error noise if denied).
  ngOnInit(): void {
    if (!this.district.trim()) {
      this.useMyLocation(true);
    }
  }

  // Prefill the mandatory district via GPS reverse-geocoding (user can edit).
  // `silent` (auto-prefill) suppresses error messages so denial isn't noisy.
  async useMyLocation(silent = false): Promise<void> {
    if (!silent) this.authError = '';
    this.locating = true;
    try {
      const pos = await this.geo.getCurrentPosition();
      this.lat = pos.lat;
      this.lng = pos.lng;
      if (pos.lat == null || pos.lng == null) {
        if (!silent) this.authError = "Couldn't get your location — please type your district.";
        return;
      }
      const place = await this.geo.reverseGeocode(pos.lat, pos.lng);
      if (place.district) this.district = place.district;
      if (place.city) this.city = place.city;
      if (place.state) this.stateName = place.state;
      if (!silent && !place.district && !place.city) {
        this.authError = "Couldn't read your district — please type it.";
      }
    } finally {
      this.locating = false;
      this.rendered();
    }
  }
}
