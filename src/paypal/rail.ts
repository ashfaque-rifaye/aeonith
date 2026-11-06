/** Everything Aeonith needs from PayPal. Implemented by the real sandbox client and by an offline simulator. */
export interface PaymentRail {
  readonly mode: "sandbox" | "simulated";
  createAuthorizeOrder(args: {
    amount: string;
    currency: string;
    description: string;
    customId: string;
    returnUrl: string;
    cancelUrl: string;
    requestId: string;
  }): Promise<{ id: string; approveUrl: string }>;
  authorizeOrder(orderId: string): Promise<{ authorizationId: string; amount: string; currency: string; status: string }>;
  captureAuthorization(authorizationId: string, amount: string, currency: string, requestId: string): Promise<{ id: string; status: string }>;
  voidAuthorization(authorizationId: string, requestId: string): Promise<unknown>;
  reauthorize(authorizationId: string, requestId: string): Promise<{ id: string; status: string }>;
  refundCapture(captureId: string, amount: string, currency: string, requestId: string): Promise<{ id: string; status: string }>;
  createPayout(args: { receiver: string; amount: string; currency: string; note: string; senderBatchId: string }): Promise<{ batchId: string; status: string }>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, event: unknown): Promise<boolean>;
}
