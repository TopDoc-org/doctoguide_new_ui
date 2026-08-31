import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminLoginResponse,
  AdminProfile,
  AdminFilters,
  AdminLeadQuery,
  AdminLeadsResponse,
  AdminOverview,
} from '../models';

// HTTP layer for the global super-admin console. Bearer-token pattern mirrors
// PartnerApiService, but every read here is cross-clinic.
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private base = `${environment.serverUrl}${environment.adminBase}`;

  constructor(private http: HttpClient, private auth: AdminAuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token || ''}` });
  }

  // Turn a filter query into HttpParams, dropping empty values.
  private toParams(q: AdminLeadQuery, includePage = false): HttpParams {
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

  login(username: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.base}/login`, {
      username,
      password,
    });
  }

  me(): Observable<AdminProfile> {
    return this.http.get<AdminProfile>(`${this.base}/me`, {
      headers: this.authHeaders(),
    });
  }

  // Distinct clinics/states/districts/specialties for the filter dropdowns.
  filters(): Observable<AdminFilters> {
    return this.http.get<AdminFilters>(`${this.base}/filters`, {
      headers: this.authHeaders(),
    });
  }

  overview(q: AdminLeadQuery): Observable<AdminOverview> {
    return this.http.get<AdminOverview>(`${this.base}/overview`, {
      headers: this.authHeaders(),
      params: this.toParams(q),
    });
  }

  leads(q: AdminLeadQuery): Observable<AdminLeadsResponse> {
    return this.http.get<AdminLeadsResponse>(`${this.base}/leads`, {
      headers: this.authHeaders(),
      params: this.toParams(q, true),
    });
  }

  // CSV download (gated server-side). Returns a Blob like downloadReportPdf.
  exportLeads(q: AdminLeadQuery): Observable<Blob> {
    return this.http.get(`${this.base}/leads/export`, {
      headers: this.authHeaders(),
      params: this.toParams(q),
      responseType: 'blob',
    });
  }
}
