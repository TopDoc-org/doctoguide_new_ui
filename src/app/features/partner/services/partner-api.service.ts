import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PartnerAuthService } from './partner-auth.service';
import {
  PartnerLoginResponse,
  PartnerSignupPayload,
  PartnerProfile,
  PartnerMetrics,
  PartnerLeadsResponse,
  PartnerLeadQuery,
  PartnerOfferRecord,
} from '../models';

// One entry in a staff user's mappedTo list (clinic/org or other).
export interface StaffMapping {
  id: string;
  name: string;
  type: string; // 'organisation' = a clinic the staff is mapped to
  doctors?: any[];
}

// Response shape of /user/staff/pwdLogin (KnocDoc Pro staff login).
export interface StaffLoginResponse {
  statuscode?: number;
  message?: string;
  token: string;
  staffDetails?: {
    mobile?: string;
    staffId?: string;
    email?: string;
    designation?: string; // 'admin' = clinic admin
    first_name?: string;
    last_name?: string;
    mappedTo?: StaffMapping[];
  };
}

// HTTP layer for the clinic partner dashboard. Mirrors the Bearer-token
// pattern used by AiDoctorApiService.
@Injectable({ providedIn: 'root' })
export class PartnerApiService {
  private base = `${environment.serverUrl}${environment.partnerBase}`;
  private userBase = `${environment.serverUrl}${environment.userBase}`;

  constructor(private http: HttpClient, private auth: PartnerAuthService) {}

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token || ''}` });
  }

  login(mobile: string, pin: string): Observable<PartnerLoginResponse> {
    return this.http.post<PartnerLoginResponse>(`${this.base}/login`, { mobile, pin });
  }

  // Password login for KnocDoc Pro admins (staff credentials). The clinic the
  // admin manages comes back inside staffDetails.mappedTo (the organisation entry).
  pwdLogin(mobile: string, password: string): Observable<StaffLoginResponse> {
    return this.http.post<StaffLoginResponse>(`${this.userBase}/staff/pwdLogin`, {
      mobile,
      password,
    });
  }

  // Self-serve onboarding: creates the admin account + the clinic in one step
  // and returns a logged-in session. Works for independent clinics that are not
  // existing KnocDoc partners.
  signup(payload: PartnerSignupPayload): Observable<PartnerLoginResponse> {
    return this.http.post<PartnerLoginResponse>(`${this.base}/signup`, payload);
  }

  me(): Observable<PartnerProfile> {
    return this.http.get<PartnerProfile>(`${this.base}/me`, { headers: this.authHeaders() });
  }

  metrics(from: string, to: string, campaign?: string): Observable<PartnerMetrics> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (campaign) params = params.set('campaign', campaign);
    return this.http.get<PartnerMetrics>(`${this.base}/metrics`, {
      headers: this.authHeaders(),
      params,
    });
  }

  // Build query params from a lead query, dropping empty values.
  private leadParams(q: PartnerLeadQuery, includePage: boolean): HttpParams {
    let params = new HttpParams().set('from', q.from).set('to', q.to);
    if (includePage) params = params.set('page', String(q.page || 1));
    if (q.campaign) params = params.set('campaign', q.campaign);
    if (q.specialty) params = params.set('specialty', q.specialty);
    if (q.district) params = params.set('district', q.district);
    if (q.sort) params = params.set('sort', q.sort);
    return params;
  }

  leads(q: PartnerLeadQuery): Observable<PartnerLeadsResponse> {
    return this.http.get<PartnerLeadsResponse>(`${this.base}/leads`, {
      headers: this.authHeaders(),
      params: this.leadParams(q, true),
    });
  }

  // CSV download (gated server-side). Returns a Blob like downloadReportPdf.
  exportLeads(q: PartnerLeadQuery): Observable<Blob> {
    return this.http.get(`${this.base}/leads/export`, {
      headers: this.authHeaders(),
      params: this.leadParams(q, false),
      responseType: 'blob',
    });
  }

  listOffers(): Observable<{ offers: PartnerOfferRecord[] }> {
    return this.http.get<{ offers: PartnerOfferRecord[] }>(`${this.base}/offers`, {
      headers: this.authHeaders(),
    });
  }

  createOffer(offer: PartnerOfferRecord): Observable<PartnerOfferRecord> {
    return this.http.post<PartnerOfferRecord>(`${this.base}/offers`, offer, {
      headers: this.authHeaders(),
    });
  }

  updateOffer(offer: PartnerOfferRecord): Observable<PartnerOfferRecord> {
    return this.http.put<PartnerOfferRecord>(
      `${this.base}/offers/${offer.id}`,
      offer,
      { headers: this.authHeaders() }
    );
  }
}
