/**
 * The seller side of the Offer Protocol, built on the APIMatic-generated TypeScript SDK (sdk/typescript, generated from
 * docs/openapi.yaml). Dealer and pro agents outside Aeonith (the MCP server, scripts/seller-agent.ts) use this instead
 * of hand-written HTTP: typed models, validation and retries come from the SDK.
 */
import { Client, OfferProtocolApi } from "aeonith-apilib";
import type { DemandSignal, Offer as SdkOffer } from "aeonith-apilib";
import { commitmentHash, newSalt } from "../core/commit.js";
import type { Offer } from "../domain/types.js";

export function offerProtocol(baseUrl = process.env.AEONITH_URL ?? (process.env.AEONITH_HOSTPORT ? `http://${process.env.AEONITH_HOSTPORT}` : "http://localhost:3000")) {
  const client = new Client({ baseUrl, timeout: 30_000 });
  return new OfferProtocolApi(client);
}

/** Holds this seller's salts locally: only the hash ever leaves before the reveal. */
export class SellerAgent {
  private readonly api: OfferProtocolApi;
  private readonly sealed = new Map<string, { offer: Offer; salt: string; pitch: string }>();
  constructor(readonly providerId: string, readonly providerName: string, baseUrl?: string) {
    this.api = offerProtocol(baseUrl);
  }
  async openDemand(): Promise<DemandSignal[]> {
    return (await this.api.listOpenDemand()).result;
  }
  async demand(requestId: string): Promise<DemandSignal> {
    return (await this.api.getDemand(requestId)).result;
  }
  /** Seal: SHA-256(canonical offer | salt) computed here; only the hash is sent. */
  async commit(offer: Offer, pitch = "") {
    const salt = newSalt();
    const hash = commitmentHash(offer, salt);
    const r = await this.api.commitBid(offer.requestId, { providerId: this.providerId, providerName: this.providerName, hash });
    this.sealed.set(offer.requestId, { offer, salt, pitch });
    return r.result;
  }
  async reveal(requestId: string) {
    const s = this.sealed.get(requestId);
    if (!s) throw new Error("No sealed bid for that request in this session");
    const r = await this.api.revealBid(requestId, { offer: s.offer as SdkOffer, salt: s.salt, pitch: s.pitch });
    return r.result.valid;
  }
  async result(requestId: string) {
    return (await this.api.getResult(requestId)).result;
  }
  hasSealed(requestId: string) {
    return this.sealed.has(requestId);
  }
}
