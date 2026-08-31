import { Injectable } from '@angular/core';
import { storage } from '../../../core/platform/platform';

// Super-admin session. Kept in localStorage under admin-scoped keys so it never
// clashes with patient (PIN) auth or the clinic-admin (partner) auth.
const LS_TOKEN = 'adminToken';
const LS_NAME = 'adminName';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  get token(): string | null { return storage.get(LS_TOKEN); }
  get name(): string | null { return storage.get(LS_NAME); }
  get isLoggedIn(): boolean { return !!this.token; }

  setSession(token: string, name: string): void {
    storage.set(LS_TOKEN, token);
    storage.set(LS_NAME, name || '');
  }

  logout(): void {
    storage.remove(LS_TOKEN);
    storage.remove(LS_NAME);
  }
}
