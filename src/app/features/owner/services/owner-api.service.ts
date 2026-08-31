import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { OwnerAuthService } from './owner-auth.service';
import {
  OwnerLoginResponse,
  OwnerProfile,
  OwnerFilters,
  OwnerSummary,
  OwnerQuery,
  OwnerCampaignRow,
  OwnerClinicRow,
  OwnerLeadsResponse,
} from '../models';

// HTTP layer for the creator console. App-wide, cross-clinic — Bearer token.
@Injectable({ providedIn: 'root' })
export class OwnerApiService {
  private base = `${environment.serverUrl}${environment.ownerBase}`;

  constructor(private http: HttpClient, private auth: OwnerAuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token || ''}` });
  }

  private toParams(q: OwnerQuery, includePage = false): HttpParams {
    let params = new HttpParams().set('from', q.from).set('to', q.to);
    if (q.clinicId) params = params.set('clinicId', q.clinicId);
    if (q.state) params = params.set('state', q.state);
    if (q.district) params = params.set('district', q.district);
    if (q.specialty) params = params.set('specialty', q.specialty);
    if (q.campaign) params = params.set('campaign', q.campaign);
    if (q.q) params = params.set('q', q.q);
    if (includePage) params = params.set('page', String(q.page || 1));
    return params;
  }

  login(username: string, password: string): Observable<OwnerLoginResponse> {
    return this.http.post<OwnerLoginResponse>(`${this.base}/login`, { username, password });
  }

  me(): Observable<OwnerProfile> {
    return this.http.get<OwnerProfile>(`${this.base}/me`, { headers: this.authHeaders() });
  }

  filters(): Observable<OwnerFilters> {
    return this.http.get<OwnerFilters>(`${this.base}/filters`, { headers: this.authHeaders() });
  }

  summary(q: OwnerQuery): Observable<OwnerSummary> {
    return this.http.get<OwnerSummary>(`${this.base}/summary`, { headers: this.authHeaders(), params: this.toParams(q) });
  }

  campaigns(q: OwnerQuery): Observable<{ campaigns: OwnerCampaignRow[] }> {
    return this.http.get<{ campaigns: OwnerCampaignRow[] }>(`${this.base}/campaigns`, { headers: this.authHeaders(), params: this.toParams(q) });
  }

  exportCampaigns(q: OwnerQuery): Observable<Blob> {
    return this.http.get(`${this.base}/campaigns/export`, { headers: this.authHeaders(), params: this.toParams(q), responseType: 'blob' });
  }

  clinics(q: OwnerQuery): Observable<{ clinics: OwnerClinicRow[] }> {
    return this.http.get<{ clinics: OwnerClinicRow[] }>(`${this.base}/clinics`, { headers: this.authHeaders(), params: this.toParams(q) });
  }

  exportClinics(q: OwnerQuery): Observable<Blob> {
    return this.http.get(`${this.base}/clinics/export`, { headers: this.authHeaders(), params: this.toParams(q), responseType: 'blob' });
  }

  leads(q: OwnerQuery): Observable<OwnerLeadsResponse> {
    return this.http.get<OwnerLeadsResponse>(`${this.base}/leads`, { headers: this.authHeaders(), params: this.toParams(q, true) });
  }

  exportLeads(q: OwnerQuery): Observable<Blob> {
    return this.http.get(`${this.base}/leads/export`, { headers: this.authHeaders(), params: this.toParams(q), responseType: 'blob' });
  }
}
