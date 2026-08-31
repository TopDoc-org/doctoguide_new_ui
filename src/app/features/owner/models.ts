// Shapes for the creator (/owner) console — app-wide, across every clinic.

export interface OwnerLoginResponse {
  token: string;
  name: string;
}

export interface OwnerProfile {
  name: string;
}

export interface ClinicRef {
  clinicId: string;
  name: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface OwnerFilters {
  clinics: ClinicRef[];
  states: string[];
  districts: string[];
  specialties: string[];
  campaigns: string[];
}

export interface ClinicLeadCount {
  clinicId: string;
  clinicName: string;
  leads: number;
  clicks: number;
}

export interface CampaignLeadCount {
  campaign: string;
  leads: number;
}

export interface StateLeadCount {
  state: string;
  leads: number;
}

export interface SpecialtyCount {
  specialty: string;
  count: number;
}

export interface OwnerSummary {
  clicks: number;
  leads: number;
  conversions: number;
  clinicsCount: number;
  campaignsCount: number;
  topClinics: ClinicLeadCount[];
  topCampaigns: CampaignLeadCount[];
  byState: StateLeadCount[];
  topSpecialties: SpecialtyCount[];
}

// One row of the cross-clinic campaign explorer.
export interface OwnerCampaignRow {
  campaign: string;
  clinicId: string;
  clinicName: string;
  clicks: number;
  leads: number;
  conversions: number;
}

// One row of the clinics/facilities directory.
export interface OwnerClinicRow {
  clinicId: string;
  name: string;
  city?: string;
  state?: string;
  status?: string;
  campaigns: number;
  clicks: number;
  leads: number;
  conversions: number;
}

export interface OwnerQuery {
  from: string;
  to: string;
  clinicId?: string;
  state?: string;
  district?: string;
  specialty?: string;
  campaign?: string;
  q?: string;
  page?: number;
}

export interface OwnerLead {
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

export interface OwnerLeadsResponse {
  leads: OwnerLead[];
  total: number;
  page: number;
  pageSize: number;
}
