import type { DemandSignal, Offer, Provider } from "../domain/types.js";

/**
 * Simulated provider agents (clearly labelled as simulated in the UI and README).
 * Each has a private cost model; its sealed price comes from that model, not from any buyer's limit
 * (it never sees one). A real merchant agent would implement the same Offer Protocol (HTTP or MCP).
 */
export function demoProviders(payoutEmail: string): Provider[] {
  return [
    {
      id: "lonestar",
      name: "Lone Star Plumbing Co.",
      payoutEmail,
      licensed: true,
      licenseNo: "M-40213",
      categories: ["plumbing"],
      baseCostCents: 27000,
      travelCostCents: 4000,
      marginPct: 16,
      warrantyMonths: 12,
      leadHours: 26,
    },
    {
      id: "capitol",
      name: "Capitol City Plumbing",
      payoutEmail,
      licensed: true,
      licenseNo: "M-38877",
      categories: ["plumbing", "hvac"],
      baseCostCents: 30000,
      travelCostCents: 4500,
      marginPct: 10,
      warrantyMonths: 6,
      leadHours: 20,
    },
    {
      id: "quickfix",
      name: "QuickFix Handyman",
      payoutEmail,
      licensed: false,
      licenseNo: "",
      categories: ["plumbing", "handyman", "gutters", "cleaning"],
      baseCostCents: 23000,
      travelCostCents: 3000,
      marginPct: 20,
      warrantyMonths: 0,
      leadHours: 8,
    },
    {
      id: "brightline",
      name: "Bright Line Electric",
      payoutEmail,
      licensed: true,
      licenseNo: "TECL-31415",
      categories: ["electrical"],
      baseCostCents: 15500,
      travelCostCents: 3500,
      marginPct: 18,
      warrantyMonths: 12,
      leadHours: 22,
    },
    {
      id: "volt",
      name: "Volt & Wire Co.",
      payoutEmail,
      licensed: true,
      licenseNo: "TECL-27182",
      categories: ["electrical"],
      baseCostCents: 17000,
      travelCostCents: 3000,
      marginPct: 12,
      warrantyMonths: 6,
      leadHours: 30,
    },
    {
      id: "aircomfort",
      name: "Lakeway Air & Heat",
      payoutEmail,
      licensed: true,
      licenseNo: "TACLA-88213",
      categories: ["hvac"],
      baseCostCents: 21000,
      travelCostCents: 4500,
      marginPct: 15,
      warrantyMonths: 12,
      leadHours: 18,
    },
    {
      id: "sparkle",
      name: "Sparkle Home Cleaning",
      payoutEmail,
      licensed: false,
      licenseNo: "",
      categories: ["cleaning"],
      baseCostCents: 14000,
      travelCostCents: 2500,
      marginPct: 20,
      warrantyMonths: 0,
      leadHours: 26,
    },
    {
      id: "hillcountry",
      name: "Hill Country Gutters",
      payoutEmail,
      licensed: true,
      licenseNo: "TX-HC-55120",
      categories: ["gutters", "landscaping"],
      baseCostCents: 8500,
      travelCostCents: 9000,
      marginPct: 15,
      warrantyMonths: 6,
      leadHours: 30,
    },
    {
      id: "cleansweep",
      name: "Clean Sweep Exteriors",
      payoutEmail,
      licensed: true,
      licenseNo: "TX-CS-20981",
      categories: ["gutters", "cleaning"],
      baseCostCents: 8000,
      travelCostCents: 8000,
      marginPct: 25,
      warrantyMonths: 3,
      leadHours: 48,
    },
    // ----- Item pools: the same loop for goods. "Travel" here is the seller's fixed cost per deal
    // (prep, paperwork, delivery run), shared across every unit in the pool. -----
    {
      id: "capitalauto",
      name: "Capital Auto Group",
      payoutEmail,
      licensed: true,
      licenseNo: "P-104422", // Texas DMV General Distinguishing Number (dealer licence)
      categories: ["vehicles"],
      baseCostCents: 3020000, // dealer cost incl. holdback for the trim
      travelCostCents: 400000, // per-deal fixed cost: prep, paperwork, F&I desk time
      marginPct: 2.5,
      warrantyMonths: 36,
      leadHours: 72,
    },
    {
      id: "hillcountrymotors",
      name: "Hill Country Motors",
      payoutEmail,
      licensed: true,
      licenseNo: "P-098317",
      categories: ["vehicles"],
      baseCostCents: 2980000,
      travelCostCents: 600000,
      marginPct: 3,
      warrantyMonths: 36,
      leadHours: 96,
    },
    {
      id: "lakelinecars",
      name: "Lakeline Value Cars",
      payoutEmail,
      licensed: true,
      licenseNo: "P-112907",
      categories: ["vehicles"],
      baseCostCents: 2890000, // certified pre-owned: cheaper, but only a 12-month warranty
      travelCostCents: 300000,
      marginPct: 3,
      warrantyMonths: 12,
      leadHours: 48,
    },
    {
      id: "campustech",
      name: "CampusTech Supply",
      payoutEmail,
      licensed: false,
      licenseNo: "",
      categories: ["electronics", "appliances"],
      baseCostCents: 23000,
      travelCostCents: 12000,
      marginPct: 8,
      warrantyMonths: 12,
      leadHours: 48,
    },
    {
      id: "riverbend",
      name: "Riverbend Electronics",
      payoutEmail,
      licensed: false,
      licenseNo: "",
      categories: ["electronics"],
      baseCostCents: 24500,
      travelCostCents: 8000,
      marginPct: 6,
      warrantyMonths: 24,
      leadHours: 30,
    },
  ];
}

/** Snap a start time into 8am–noon US Central (UTC−6 in winter), the demo's service area (Austin, TX), so jobs end by evening. */
function businessHours(d: Date): Date {
  const out = new Date(d);
  out.setUTCMinutes(0, 0, 0);
  const centralHour = (out.getUTCHours() - 6 + 24) % 24;
  if (centralHour < 8) out.setUTCHours(out.getUTCHours() + (8 - centralHour));
  else if (centralHour > 12) out.setUTCHours(out.getUTCHours() + (24 - centralHour) + 8);
  return out;
}

/**
 * The provider's pricing decision. For group jobs, one trip serves many homes, so travel cost is shared:
 * per-home price = (base + travel / homes) × (1 + margin). It bids for most of the funded homes (80%) so
 * one drop-out doesn't kill the deal.
 */
export function decideOffer(p: Provider, signal: DemandSignal, now = new Date()): Offer | null {
  if (!p.categories.includes(signal.category)) return null;
  if (signal.fundedUnits < 1) return null;
  const minUnits = signal.mode === "solo" ? 1 : Math.max(1, Math.ceil(signal.fundedUnits * 0.8));
  const perHome = (p.baseCostCents + p.travelCostCents / minUnits) * (1 + p.marginPct / 100);
  const priceCents = Math.round(perHome / 100) * 100; // whole dollars
  const start = businessHours(new Date(now.getTime() + p.leadHours * 3600_000));
  const hours = signal.mode === "solo" ? 2 : Math.min(8, 1 + minUnits);
  return {
    requestId: signal.requestId,
    providerId: p.id,
    priceCents,
    minUnits,
    promises: {
      licensed: p.licensed,
      licenseNo: p.licenseNo,
      warrantyMonths: p.warrantyMonths,
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + hours * 3600_000).toISOString(),
    },
  };
}
