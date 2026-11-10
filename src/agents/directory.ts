import type { Provider } from "../domain/types.js";

/**
 * Local pros who are NOT on Aeonith yet (simulated phone directory, 555 numbers). The buyer's agent can phone them
 * about an already-funded job. If they accept, they bid through the same sealed Offer Protocol and get paid by
 * PayPal Payouts to their email: no PayPal account is needed in advance, they claim the payout.
 */
export function offlineDirectory(payoutEmail: string): Provider[] {
  const p = (x: Omit<Provider, "payoutEmail" | "recruited">): Provider => ({ ...x, payoutEmail, recruited: true });
  return [
    p({ id: "rec-barton", name: "Barton Creek Plumbing", phone: "(512) 555-0142", licensed: true, licenseNo: "M-41877", categories: ["plumbing"], baseCostCents: 26000, travelCostCents: 3500, marginPct: 14, warrantyMonths: 12, leadHours: 20 }),
    p({ id: "rec-eastside", name: "Eastside Pipe & Drain", phone: "(512) 555-0187", licensed: true, licenseNo: "M-39021", categories: ["plumbing", "hvac"], baseCostCents: 28500, travelCostCents: 3000, marginPct: 12, warrantyMonths: 6, leadHours: 30 }),
    p({ id: "rec-pecan", name: "Pecan Street Electric", phone: "(512) 555-0119", licensed: true, licenseNo: "TECL-33190", categories: ["electrical"], baseCostCents: 15000, travelCostCents: 3000, marginPct: 16, warrantyMonths: 12, leadHours: 26 }),
    p({ id: "rec-mopac", name: "MoPac Mechanical", phone: "(512) 555-0164", licensed: true, licenseNo: "TACLA-90417", categories: ["hvac"], baseCostCents: 20500, travelCostCents: 4000, marginPct: 14, warrantyMonths: 12, leadHours: 22 }),
    p({ id: "rec-zilker", name: "Zilker Home Services", phone: "(512) 555-0178", licensed: false, licenseNo: "", categories: ["handyman", "gutters", "cleaning"], baseCostCents: 11000, travelCostCents: 5000, marginPct: 18, warrantyMonths: 3, leadHours: 18 }),
  ];
}
