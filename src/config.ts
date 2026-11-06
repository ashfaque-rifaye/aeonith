import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  PAYPAL_ENV: z.literal("sandbox", { error: "PAYPAL_ENV must be 'sandbox' for this project" }),
  PAYPAL_BASE_URL: z
    .string()
    .url()
    .refine((u) => new URL(u).hostname === "api-m.sandbox.paypal.com", {
      message: "PAYPAL_BASE_URL must point at the PayPal sandbox (api-m.sandbox.paypal.com)",
    }),
  PAYPAL_CLIENT_ID: z.string().optional().default(""),
  PAYPAL_CLIENT_SECRET: z.string().optional().default(""),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(""),
  /** Sandbox business account that receives provider payouts in the demo. */
  PROVIDER_PAYOUT_EMAIL: z.string().optional().default("sb-rds43c53656224@business.example.com"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  CHANNEL3_API_KEY: z.string().optional().default(""),
  BRYNTUM_LICENSE_KEY: z.string().optional().default(""),
  MAX_AUTH_AMOUNT: z.coerce.number().positive().default(1000),
  PLATFORM_FEE_PCT: z.coerce.number().min(0).max(20).default(3),
  CURRENCY: z.string().length(3).default("USD"),
  ADMIN_TOKEN: z.string().optional().default(""),
  DATA_FILE: z.string().default("data/state.json"),
});

export type Config = z.infer<typeof Env> & { paypalMode: "sandbox" | "simulated" };

/**
 * Parses and validates env. Fails fast on anything that isn't the PayPal sandbox, so live credentials
 * can never be used by accident. Without sandbox credentials the app runs in a clearly labelled
 * "simulated" PayPal mode (for local development and tests only, never for the demo video).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid configuration (see .env.example):\n${issues}`);
  }
  const c = parsed.data;
  return { ...c, paypalMode: c.PAYPAL_CLIENT_ID && c.PAYPAL_CLIENT_SECRET ? "sandbox" : "simulated" };
}
