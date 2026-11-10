import { randomUUID } from "node:crypto";
import type { PaymentRail } from "./rail.js";

/**
 * Offline stand-in for PayPal, used ONLY when no sandbox credentials are configured (local dev, unit tests).
 * It mirrors PayPal's rules that matter to us (capture ≤ authorization, one final capture, idempotency)
 * so bugs surface without network access. The UI labels this mode loudly; the demo uses the real sandbox.
 */
export class SimulatedPayPal implements PaymentRail {
  readonly mode = "simulated" as const;
  private orders = new Map<string, { amount: string; currency: string; approved: boolean }>();
  private auths = new Map<string, { amount: number; currency: string; status: "CREATED" | "CAPTURED" | "VOIDED" }>();
  private captures = new Map<string, { amount: number; refunded: number }>();
  private seen = new Map<string, unknown>();

  constructor(private readonly appBaseUrl: string) {}

  private once<T>(key: string, fn: () => T): T {
    if (this.seen.has(key)) return this.seen.get(key) as T;
    const v = fn();
    this.seen.set(key, v);
    return v;
  }

  async createAuthorizeOrder(a: Parameters<PaymentRail["createAuthorizeOrder"]>[0]) {
    return this.once(`order:${a.requestId}`, () => {
      const id = `SIM-ORDER-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.orders.set(id, { amount: a.amount, currency: a.currency, approved: false });
      // Simulated approval page: the app's own /sim/approve screen stands in for PayPal's.
      const approveUrl = `${this.appBaseUrl}/sim/approve?token=${id}&return=${encodeURIComponent(a.returnUrl)}&cancel=${encodeURIComponent(a.cancelUrl)}&amount=${a.amount}`;
      return { id, approveUrl };
    });
  }

  async authorizeOrder(orderId: string) {
    return this.once(`authz:${orderId}`, () => {
      const o = this.orders.get(orderId);
      if (!o) throw new Error(`Simulated PayPal: unknown order ${orderId}`);
      const authorizationId = `SIM-AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.auths.set(authorizationId, { amount: Number(o.amount), currency: o.currency, status: "CREATED" });
      return { authorizationId, amount: o.amount, currency: o.currency, status: "CREATED" };
    });
  }

  async captureAuthorization(authorizationId: string, amount: string, _currency: string, requestId: string) {
    return this.once(`cap:${requestId}`, () => {
      const a = this.auths.get(authorizationId);
      if (!a || a.status !== "CREATED") throw new Error(`Simulated PayPal: authorization ${authorizationId} is not capturable`);
      if (Number(amount) > a.amount + 1e-9) throw new Error("Simulated PayPal: AMOUNT_EXCEEDS_AUTHORIZED (capture > authorization)");
      a.status = "CAPTURED";
      const id = `SIM-CAP-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.captures.set(id, { amount: Number(amount), refunded: 0 });
      return { id, status: "COMPLETED" };
    });
  }

  async voidAuthorization(authorizationId: string, requestId: string) {
    return this.once(`void:${requestId}`, () => {
      const a = this.auths.get(authorizationId);
      if (!a || a.status !== "CREATED") throw new Error(`Simulated PayPal: authorization ${authorizationId} cannot be voided`);
      a.status = "VOIDED";
      return {};
    });
  }

  async reauthorize(authorizationId: string, requestId: string) {
    return this.once(`reauth:${requestId}`, () => {
      const a = this.auths.get(authorizationId);
      if (!a || a.status !== "CREATED") throw new Error("Simulated PayPal: cannot reauthorize");
      const id = `SIM-AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.auths.set(id, { ...a });
      a.status = "VOIDED";
      return { id, status: "CREATED" };
    });
  }

  async refundCapture(captureId: string, amount: string, _currency: string, requestId: string) {
    return this.once(`refund:${requestId}`, () => {
      const c = this.captures.get(captureId);
      if (!c || c.refunded + Number(amount) > c.amount + 1e-9) throw new Error("Simulated PayPal: refund exceeds capture");
      c.refunded += Number(amount);
      return { id: `SIM-REF-${randomUUID().slice(0, 8).toUpperCase()}`, status: "COMPLETED" };
    });
  }

  async createPayout(a: { receiver: string; amount: string; currency: string; note: string; senderBatchId: string }) {
    return this.once(`payout:${a.senderBatchId}`, () => ({ batchId: `SIM-BATCH-${randomUUID().slice(0, 8).toUpperCase()}`, status: "SUCCESS" }));
  }

  private setupTokens = new Map<string, { approved: boolean }>();
  private vault = new Set<string>();

  async createVaultSetupToken(a: { description: string; returnUrl: string; cancelUrl: string; requestId: string }) {
    return this.once(`st:${a.requestId}`, () => {
      const id = `SIM-SETUP-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.setupTokens.set(id, { approved: true });
      const approveUrl = `${this.appBaseUrl}/sim/vault?token=${id}`;
      return { id, approveUrl };
    });
  }

  async createPaymentToken(setupTokenId: string, requestId: string) {
    return this.once(`pt:${requestId}`, () => {
      if (!this.setupTokens.get(setupTokenId)?.approved) throw new Error("Simulated PayPal: setup token not approved");
      const vaultId = `SIM-VAULT-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.vault.add(vaultId);
      return { vaultId, customerId: `SIM-CUST-${randomUUID().slice(0, 6).toUpperCase()}` };
    });
  }

  async authorizeWithVault(a: { vaultId: string; amount: string; currency: string; description: string; customId: string; requestId: string }) {
    return this.once(`vauth:${a.requestId}`, () => {
      if (!this.vault.has(a.vaultId)) throw new Error("Simulated PayPal: unknown vault id");
      const orderId = `SIM-ORDER-${randomUUID().slice(0, 8).toUpperCase()}`;
      const authorizationId = `SIM-AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
      this.auths.set(authorizationId, { amount: Number(a.amount), currency: a.currency, status: "CREATED" });
      return { orderId, authorizationId, amount: a.amount, currency: a.currency, status: "CREATED" };
    });
  }

  async verifyWebhook() {
    return false; // never trust webhooks in simulated mode
  }
}
