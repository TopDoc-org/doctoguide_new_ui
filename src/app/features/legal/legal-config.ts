// Single source of truth for the business facts the legal pages need.
// These are REQUIRED BUSINESS INPUTS: a qualified person must supply the real
// values before launch. Fill in ONLY this one file — the legal pages read every
// value from here, so nothing else needs editing. Bracketed
// "[... — to be confirmed]" placeholders stay until the real values are provided.
export const LEGAL_CONFIG = {
  lastUpdated: '12 June 2026',
  entityName: '[Legal entity name — to be confirmed]',
  entityAddress: '[Registered address — to be confirmed]',
  hostingLocation: '[Hosting/data location — to be confirmed]',
  retentionPeriods: '[Specific retention periods — to be confirmed]',
  privacyEmail: '[privacy contact email — to be confirmed]',
  grievanceOfficerName: '[Grievance Officer name — to be confirmed]',
  grievanceOfficerEmail: '[Grievance Officer email — to be confirmed]',
  grievanceResponseTime: '[response timeline — to be confirmed]',
  jurisdictionCity: '[jurisdiction city — to be confirmed]',
} as const;
