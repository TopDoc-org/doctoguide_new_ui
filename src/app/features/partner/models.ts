// Shapes for the clinic partner (affiliate) dashboard. These mirror the
// `/partner/*` backend contract documented in BACKEND-AFFILIATE-SPEC.md.

export interface PartnerLoginResponse {
  token: string;
  clinicId: string;
  clinicName: string;
}

// Self-serve onboarding for independent (non-KnocDoc-partner) clinics.
export interface PartnerSignupPayload {
  clinicName: string;
  city: string;
  state?: string;
  contactName: string;
  mobile: string;
  pin: string;
}

export interface PartnerProfile {
  clinicId: string;
  clinicName: string;
  city?: string;
}

export interface MetricPoint {
  date: string; // YYYY-MM-DD
  clicks: number;
  leads: number;
}

export interface SpecialtyCount {
  specialty: string;
  count: number;
}

// Clicks + leads (+ conversions) attributed to one digital campaign
// (utm_campaign value).
export interface CampaignCount {
  campaign: string;
  clicks: number;
  leads: number;
  conversions?: number;
}

export interface DistrictCount {
  district: string;
  leads: number;
}

export interface PartnerMetrics {
  clicks: number;
  leads: number;
  conversions: number; // leads that proceeded (e.g. booked / connected)
  series: MetricPoint[];
  topSpecialties: SpecialtyCount[];
  byCampaign?: CampaignCount[];
  byDistrict?: DistrictCount[];
}

export interface PartnerLead {
  name: string;
  mobile: string;
  city?: string;
  district?: string;
  specialty?: string;
  campaign?: string;
  sessionId?: string;
  createdAt: string;
}

// Filters + sort for the per-clinic leads queries (campaign view & leads page).
export interface PartnerLeadQuery {
  from: string;
  to: string;
  page?: number;
  campaign?: string;
  specialty?: string;
  district?: string;
  sort?: string; // "field:order", field = createdAt | name
}

export interface PartnerLeadsResponse {
  leads: PartnerLead[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PartnerOfferRecord {
  id?: string;
  title: string;
  description?: string;
  discountText?: string;
  specialty?: string; // empty/undefined = applies to all specialties
  campaigns?: string[]; // campaigns this offer is enabled for; empty = all
  validFrom?: string;
  validTo?: string;
  active: boolean;
}
