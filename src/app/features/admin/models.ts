// Shapes for the global super-admin console. These mirror the `/admin/*`
// backend contract documented in BACKEND-AFFILIATE-SPEC.md. Unlike `/partner/*`
// (scoped to one clinic), admin reads span ALL clinics.

export interface AdminLoginResponse {
  token: string;
  name: string;
}

export interface AdminProfile {
  name: string;
}

// A clinic reference used to populate the leads filter dropdown.
export interface ClinicRef {
  clinicId: string;
  name: string;
  city?: string;
  state?: string;
  status?: string;
}

// Distinct values for the leads filter dropdowns.
export interface AdminFilters {
  clinics: ClinicRef[];
  states: string[];
  districts: string[];
  specialties: string[];
  campaigns: string[];
}

// Query for both /admin/leads and /admin/overview (paging ignored by overview).
export interface AdminLeadQuery {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  clinicId?: string;
  state?: string;
  district?: string;
  specialty?: string;
  campaign?: string;
  q?: string; // free-text match on name/mobile
  page?: number;
}

export interface AdminLead {
  name: string;
  mobile: string;
  clinicId?: string;
  clinicName?: string;
  city?: string;
  district?: string;
  state?: string;
  specialty?: string;
  campaign?: string;
  sessionId?: string;
  createdAt: string;
}

export interface AdminLeadsResponse {
  leads: AdminLead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ClinicLeadCount {
  clinicId: string;
  clinicName: string;
  leads: number;
  clicks: number;
}

export interface StateLeadCount {
  state: string;
  leads: number;
}

export interface SpecialtyCount {
  specialty: string;
  count: number;
}

export interface CampaignLeadCount {
  campaign: string;
  leads: number;
}

export interface AdminOverview {
  clicks: number;
  leads: number;
  conversions: number;
  // Optional: API-response shape, and every reader guards with `|| []`.
  byClinic?: ClinicLeadCount[];
  byState?: StateLeadCount[];
  topSpecialties?: SpecialtyCount[];
  byCampaign?: CampaignLeadCount[];
}
