import { PartnerOfferRecord } from '../models';

// Ready-made offers a clinic can start from. Shared by the Offers page (prefill
// the form) and the Overview "Active offers" picker (create + attach on check).
// Seeded templates disabled — clinics see only their own backend-created offers.
export const OFFER_TEMPLATES: PartnerOfferRecord[] = [];
