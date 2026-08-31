import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { GeoLocation } from '../models';

// Tries Capacitor Geolocation (works on web + native); falls back to the
// browser navigator API; on failure returns nulls so the caller asks for a city.
@Injectable({ providedIn: 'root' })
export class GeolocationService {
  constructor(private http: HttpClient) {}

  async getCurrentPosition(): Promise<GeoLocation> {
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, city: null };
    } catch (_) {
      return this.navigatorFallback();
    }
  }

  // Reverse-geocode lat/lng -> district/city/state (OpenStreetMap Nominatim;
  // CORS-enabled, no key). Used to prefill the mandatory district field.
  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<{ district: string | null; city: string | null; state: string | null }> {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    try {
      const res: any = await firstValueFrom(this.http.get(url));
      const a = res?.address || {};
      return {
        district: a.state_district || a.county || a.district || a.city_district || null,
        city: a.city || a.town || a.village || a.suburb || null,
        state: a.state || null,
      };
    } catch (_) {
      return { district: null, city: null, state: null };
    }
  }

  private navigatorFallback(): Promise<GeoLocation> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null, city: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({ lat: p.coords.latitude, lng: p.coords.longitude, city: null }),
        () => resolve({ lat: null, lng: null, city: null }),
        { timeout: 10000 }
      );
    });
  }
}
