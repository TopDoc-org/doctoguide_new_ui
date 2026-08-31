import { Injectable } from '@angular/core';
import { storage } from '../../../core/platform/platform';

// Creator session — localStorage under owner-scoped keys so it never clashes
// with patient, partner, or admin auth.
const LS_TOKEN = 'ownerToken';
const LS_NAME = 'ownerName';

@Injectable({ providedIn: 'root' })
export class OwnerAuthService {
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
