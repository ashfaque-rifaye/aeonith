import { randomUUID } from "node:crypto";
import type { Config } from "../config.js";
import type { PaymentRail } from "./rail.js";

/** PayPal REST client (Orders v2, Payments v2, Payouts v1, webhook verification), sandbox only. */
export class PayPalClient implements PaymentRail {
  readonly mode = "sandbox" as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly cfg: Pick<Config, "PAYPAL_BASE_URL" | "PAYPAL_CLIENT_ID" | "PAYPAL_CLIENT_SECRET" | "PAYPAL_WEBHOOK_ID">) {}

  /** Client-credentials token, cached until 60 s before expiry (tokens last ~9 h). */
  private async accessToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const basic = Buffer.from(`${this.cfg.PAYPAL_CLIENT_ID}:${this.cfg.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${this.cfg.PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new PayPalError("token", res.status, await res.text());
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
    return body.access_token;
  }

  /** Authenticated call; retries once on 401 with a fresh token. `requestId` makes POSTs idempotent. */
  private async call<T>(method: string, path: string, body?: unknown, requestId?: string, retried = false): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${await this.accessToken(retried)}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (method === "POST") headers["PayPal-Request-Id"] = requestId ?? randomUUID();
    const res = await fetch(`${this.cfg.PAYPAL_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401 && !retried) return this.call(method, path, body, requestId, true);
    const text = await res.text();
    if (!res.ok) throw new PayPalError(path, res.status, text);
    return (text ? JSON.parse(text) : {}) as T;
  }

  /** Create an order that will only be AUTHORIZED (funds held), never captured here. */
  async createAuthorizeOrder(args: {
    amount: string;
    currency: string;
    description: string;
    customId: string;
    returnUrl: string;
    cancelUrl: string;
    requestId: string;
  }): Promise<{ id: string; approveUrl: string }> {
    const order = await this.call<PayPalOrder>(
      "POST",
      "/v2/checkout/orders",
      {
        intent: "AUTHORIZE",
        purchase_units: [
          {
            custom_id: args.customId,
            description: args.description.slice(0, 127),
            amount: { currency_code: args.currency, value: args.amount },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "CONTINUE",
              shipping_preference: "NO_SHIPPING",
              return_url: args.returnUrl,
              cancel_url: args.cancelUrl,
            },
          },
        },
      },
      args.requestId,
    );
    const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approveUrl) throw new Error(`PayPal order ${order.id} has no approval link`);
    return { id: order.id, approveUrl };
  }

  /** After buyer approval: place the hold. Returns the authorization id + held amount. */
  async authorizeOrder(orderId: string): Promise<{ authorizationId: string; amount: string; currency: string; status: string }> {
    const order = await this.call<PayPalOrder>("POST", `/v2/checkout/orders/${orderId}/authorize`, {}, `authz-${orderId}`);
    const auth = order.purchase_units?.[0]?.payments?.authorizations?.[0];
    if (!auth) throw new Error(`No authorization returned for order ${orderId}`);
    return { authorizationId: auth.id, amount: auth.amount.value, currency: auth.amount.currency_code, status: auth.status };
  }

  /** Capture (possibly less than) the authorized amount; final_capture releases any remainder to the buyer. */
  async captureAuthorization(authorizationId: string, amount: string, currency: string, requestId: string) {
    return this.call<{ id: string; status: string }>(
      "POST",
      `/v2/payments/authorizations/${authorizationId}/capture`,
      { amount: { value: amount, currency_code: currency }, final_capture: true },
      requestId,
    );
  }

  /** Release the hold entirely (deal did not clinch). */
  async voidAuthorization(authorizationId: string, requestId: string) {
    return this.call<Record<string, never>>("POST", `/v2/payments/authorizations/${authorizationId}/void`, undefined, requestId);
  }

  /** Re-place a hold after the 3-day honor period (valid up to 29 days from the original). */
  async reauthorize(authorizationId: string, requestId: string) {
    return this.call<{ id: string; status: string }>("POST", `/v2/payments/authorizations/${authorizationId}/reauthorize`, {}, requestId);
  }

  /** Refund (part of) a capture, e.g. when a problem is found after payment. */
  async refundCapture(captureId: string, amount: string, currency: string, requestId: string) {
    return this.call<{ id: string; status: string }>(
      "POST",
      `/v2/payments/captures/${captureId}/refund`,
      { amount: { value: amount, currency_code: currency } },
      requestId,
    );
  }

  /** Pay the winning provider (Payouts API). senderBatchId makes the payout idempotent on PayPal's side too. */
  async createPayout(args: { receiver: string; amount: string; currency: string; note: string; senderBatchId: string }) {
    const res = await this.call<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
      "POST",
      "/v1/payments/payouts",
      {
        sender_batch_header: {
          sender_batch_id: args.senderBatchId,
          email_subject: "You've been paid for a verified Aeonith job",
          email_message: args.note.slice(0, 255),
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: { value: args.amount, currency: args.currency },
            receiver: args.receiver,
            note: args.note.slice(0, 4000),
            sender_item_id: `${args.senderBatchId}-1`,
          },
        ],
      },
      args.senderBatchId,
    );
    return { batchId: res.batch_header.payout_batch_id, status: res.batch_header.batch_status };
  }

  /** Verify a webhook really came from PayPal. Never trust an unverified event. */
  async verifyWebhook(headers: Record<string, string | string[] | undefined>, event: unknown): Promise<boolean> {
    if (!this.cfg.PAYPAL_WEBHOOK_ID) return false;
    const h = (k: string) => {
      const v = headers[k];
      return Array.isArray(v) ? v[0] : v;
    };
    const res = await this.call<{ verification_status: string }>("POST", "/v1/notifications/verify-webhook-signature", {
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
      webhook_id: this.cfg.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    });
    return res.verification_status === "SUCCESS";
  }
}

export class PayPalError extends Error {
  constructor(readonly op: string, readonly status: number, readonly body: string) {
    super(`PayPal ${op} failed (${status}): ${body.slice(0, 500)}`);
  }
}

interface PayPalOrder {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    payments?: { authorizations?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
  }[];
}
