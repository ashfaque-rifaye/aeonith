/**
 * Checks the PayPal sandbox setup without printing any secret:
 *   1. config passes the sandbox guard
 *   2. OAuth client-credentials token works
 *   3. an AUTHORIZE order can be created (prints the buyer approval link)
 * Usage: npm run sandbox:check
 */
import { loadConfig } from "../src/config.js";
import { PayPalClient } from "../src/paypal/client.js";

const cfg = loadConfig();
if (cfg.paypalMode !== "sandbox") {
  console.error("✗ PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must both be set in .env (sandbox app 'Aeonith').");
  process.exit(1);
}
const pp = new PayPalClient(cfg);
try {
  const order = await pp.createAuthorizeOrder({
    amount: "1.00",
    currency: cfg.CURRENCY,
    description: "Aeonith sandbox check (safe to ignore)",
    customId: "sandbox-check",
    returnUrl: `${cfg.APP_BASE_URL}/paypal/return`,
    cancelUrl: `${cfg.APP_BASE_URL}/paypal/cancel`,
    requestId: `check-${Date.now()}`,
  });
  console.log("✓ Token OK");
  console.log(`✓ AUTHORIZE order created: ${order.id}`);
  console.log(`  Approve link (optional, log in as the sandbox buyer): ${order.approveUrl}`);
} catch (e) {
  console.error(`✗ ${(e as Error).message.slice(0, 300)}`);
  process.exit(1);
}
