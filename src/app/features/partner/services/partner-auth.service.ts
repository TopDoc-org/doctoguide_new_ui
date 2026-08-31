import { Injectable } from '@angular/core';
import { storage } from '../../../core/platform/platform';

// Clinic-admin session. Kept in localStorage under partner-scoped keys so it
// never clashes with the patient (PIN) auth used by the AI health assistant app.
const LS_TOKEN = 'partnerToken';
const LS_CLINIC_ID = 'partnerClinicId';
const LS_CLINIC_NAME = 'partnerClinicName';

@Injectable({ providedIn: 'root' })
export class PartnerAuthService {
  get token(): string | null { return storage.get(LS_TOKEN); }
  get clinicId(): string | null { return storage.get(LS_CLINIC_ID); }
  get clinicName(): string | null { return storage.get(LS_CLINIC_NAME); }
  get isLoggedIn(): boolean { return !!this.token; }

  setSession(token: string, clinicId: string, clinicName: string): void {
    storage.set(LS_TOKEN, token);
    storage.set(LS_CLINIC_ID, clinicId);
    storage.set(LS_CLINIC_NAME, clinicName || '');
  }

  logout(): void {
    storage.remove(LS_TOKEN);
    storage.remove(LS_CLINIC_ID);
    storage.remove(LS_CLINIC_NAME);
  }
}
