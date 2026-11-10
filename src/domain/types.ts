/** Money is always integer cents. Never floats. */
export type Cents = number;

export type Mode = "solo" | "together";

/** What the buyer(s) require. Offers that don't meet these are filtered out before price is considered. */
export interface Requirements {
  licensed: boolean;
  minWarrantyMonths: number;
  /** Latest acceptable job start (ISO). */
  completeBy: string;
}

export type HoldStatus = "pending" | "held" | "captured" | "voided" | "failed";

/** One person's funded request. Their limit is private: it lives here and in the PayPal hold, nowhere else. */
export interface BuyerHold {
  id: string;
  name: string;
  /** Homes / units this buyer needs done (usually 1). */
  units: number;
  /** Private ceiling per unit. Never shown to providers. */
  limitCents: Cents;
  /** Best solo quote this buyer already has (Together mode best-of guarantee). Optional. */
  soloBestCents?: Cents;
  consentAt: string;
  status: HoldStatus;
  orderId?: string;
  authorizationId?: string;
  authorizedCents?: Cents;
  /** When the current authorization was placed (PayPal honor period is 3 days). */
  authorizedAt?: string;
  captureId?: string;
  capturedCents?: Cents;
  note?: string;
}

/** What a provider promises. Parsed into a strict schema; free text only lives in `pitch` (display-only). */
export interface Promises {
  licensed: boolean;
  licenseNo: string;
  warrantyMonths: number;
  /** Proposed job start (ISO). */
  startAt: string;
  /** Proposed job end (ISO). */
  endAt: string;
}

/** The sealed offer. Its canonical JSON + salt is what the commitment hash covers. */
export interface Offer {
  requestId: string;
  providerId: string;
  /** Price per unit (per home). */
  priceCents: Cents;
  /** Minimum units for this price (1 for solo jobs). */
  minUnits: number;
  promises: Promises;
}

export interface Commitment {
  providerId: string;
  providerName: string;
  hash: string;
  committedAt: string;
}

export interface Reveal {
  offer: Offer;
  salt: string;
  /** Display-only marketing text. Never parsed, never reaches the payment path. */
  pitch: string;
  revealedAt: string;
  valid: boolean;
  rejectReason?: string;
}

export interface Award {
  providerId: string;
  providerName: string;
  priceCents: Cents;
  buyersIn: string[];
  buyersOut: { buyerId: string; reason: string }[];
  unitsServed: number;
  buyerSavingCents: Cents;
  /** Plain-English, deterministic explanation of why this offer won. */
  reason: string;
  /** Every offer and why it was or wasn't chosen. */
  table: { providerId: string; providerName: string; priceCents: Cents; minUnits: number; eligibleUnits: number; feasible: boolean; note: string; surplusCents: Cents }[];
}

export type ProofVerdict = "pass" | "fail" | "review";

export interface ProofCheck {
  name: string;
  ok: boolean | null; // null = not verifiable
  detail: string;
  by: "code" | "ai";
}

export interface Proof {
  code: string;
  issuedAt: string;
  submittedAt?: string;
  photoSha256?: string;
  note?: string;
  checks: ProofCheck[];
  aiSummary?: string;
  verdict?: ProofVerdict;
}

export type RequestStatus =
  | "open" // accepting buyers / holds
  | "bidding" // providers committing sealed offers
  | "revealing" // commitments closed; providers reveal (offer, salt)
  | "awarded" // winner picked, waiting on the job + proof
  | "proving" // proof submitted, waiting on buyer confirmation / admin
  | "settled" // captured + paid out
  | "released"; // all holds voided

export interface JobRequest {
  id: string;
  mode: Mode;
  title: string;
  category: string;
  description: string;
  zip: string;
  requirements: Requirements;
  /**
   * Big-ticket item pools (cars, appliances): each buyer holds a refundable deposit per unit instead of their full
   * limit. Their private limit still decides whether they're in the deal; the deposit is captured at delivery and
   * applied to the price, and the balance is paid to the seller at handover (financing / PayPal checkout).
   */
  depositPerUnitCents?: Cents;
  createdAt: string;
  closesAt: string;
  status: RequestStatus;
  buyers: BuyerHold[];
  commitments: Commitment[];
  reveals: Reveal[];
  award?: Award;
  aiOfferReview?: { ok: boolean; summary: string; flags: string[] };
  /** Autopilot: the job was filed by a home sensor and funded from the buyer's vaulted PayPal (merchant-initiated). */
  autopilotId?: string;
  trigger?: { device: string; location: string; reading: string; at: string };
  /** Autopilot jobs need the buyer's consent (Voice Agent call) before the pro is dispatched. */
  bookedAt?: string;
  /** Consents captured by the Voice Agent (spoken or tapped), each fingerprinted into the audit chain. */
  consents?: Consent[];
  /** Agent phone calls: consent calls to the buyer, recruiting calls to offline pros. */
  calls?: CallLog[];
  /** Offline pros the agent recruited for this job (they bid like any provider, paid by Payouts to email). */
  recruited?: Provider[];
  /** Live Proof session: a code shown only once the camera session starts, valid for two minutes. */
  live?: LiveSession;
  proof?: Proof;
  buyerConfirmedAt?: string;
  settlement?: Settlement;
}

export interface Consent {
  intent: "book" | "release";
  method: "voice" | "tap";
  transcript: string;
  approved: boolean;
  at: string;
  /** SHA-256 of intent|transcript|at|request: the fingerprint written to the audit chain. */
  sha256: string;
}

export interface CallLog {
  id: string;
  kind: "consent" | "recruit";
  at: string;
  party: string;
  phone?: string;
  lines: { who: "agent" | "buyer" | "pro"; text: string }[];
  outcome: string;
}

export interface LiveFrame {
  at: string;
  sha256: string;
  codeVisible: boolean | null;
  matchesJob: boolean | null;
  summary: string;
}

export interface LiveSession {
  code: string;
  startedAt: string;
  expiresAt: string;
  frames: LiveFrame[];
  finishedAt?: string;
}

/** A standing, buyer-approved budget that lets a home sensor file and fund a job on the buyer's vaulted PayPal. */
export interface Autopilot {
  id: string;
  buyerName: string;
  zip: string;
  capCents: Cents;
  categories: string[];
  status: "pending" | "active" | "revoked";
  setupTokenId?: string;
  vaultId?: string;
  customerId?: string;
  createdAt: string;
  activatedAt?: string;
}

export interface Settlement {
  at: string;
  captures: { buyerId: string; amountCents: Cents; captureId: string }[];
  voids: { buyerId: string; reason: string }[];
  /** Deposit pools only: what buyers still owe the seller at handover (price − deposit) across the deal. */
  balanceDueCents?: Cents;
  payout?: { batchId: string; amountCents: Cents; feeCents: Cents; receiver: string; status: string };
}

/** What providers are allowed to see. Deliberately has no field that can carry a buyer's limit. */
export interface DemandSignal {
  requestId: string;
  mode: Mode;
  title: string;
  category: string;
  description: string;
  zip: string;
  requirements: Requirements;
  /** Item pools: the refundable deposit each funded unit has placed (public deal terms, not a buyer limit). */
  depositPerUnitCents?: Cents;
  fundedUnits: number;
  fundedRequests: number;
  closesAt: string;
  status: RequestStatus;
}

export interface Provider {
  id: string;
  name: string;
  payoutEmail: string;
  licensed: boolean;
  licenseNo: string;
  categories: string[];
  /** Cost model for the simulated agent. */
  baseCostCents: Cents;
  travelCostCents: Cents;
  marginPct: number;
  warrantyMonths: number;
  /** Earliest available start offset in hours. */
  leadHours: number;
  /** Recruited by the agent's phone call (not previously on Aeonith). */
  recruited?: boolean;
  phone?: string;
}
