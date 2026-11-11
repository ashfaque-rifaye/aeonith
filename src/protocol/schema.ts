import { z } from "zod";
import type { DemandSignal, JobRequest } from "../domain/types.js";

/**
 * Aeonith Offer Protocol v1: the only interface a provider agent gets.
 * Exposed over HTTP (/protocol/v1/...) and as MCP tools (src/mcp.ts).
 */

export const PromisesSchema = z.object({
  licensed: z.boolean(),
  licenseNo: z.string().max(40),
  warrantyMonths: z.number().int().min(0).max(120),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export const OfferSchema = z.object({
  requestId: z.string().min(1).max(64),
  providerId: z.string().min(1).max(64),
  priceCents: z.number().int().positive().max(10_000_000),
  minUnits: z.number().int().min(1).max(1000),
  discountBps: z.number().int().min(0).max(3000).optional(),
  promises: PromisesSchema,
});

export const CommitBody = z.object({
  providerId: z.string().min(1).max(64),
  providerName: z.string().min(1).max(80),
  hash: z.string().regex(/^[0-9a-f]{64}$/i, "hash must be a SHA-256 hex digest"),
});

export const RevealBody = z.object({
  offer: OfferSchema,
  salt: z.string().regex(/^[0-9a-f]{32,128}$/i),
  pitch: z.string().max(600).default(""),
});

/** Build the provider-visible view. By construction there is no field here that can carry a buyer's limit. */
export function demandSignal(r: JobRequest): DemandSignal {
  // Quote-first solo requests are visible to pros before the hold: the buyer books (and PayPal holds) the winner.
  const held = r.flow === "quotes" ? r.buyers : r.buyers.filter((b) => b.status === "held");
  return {
    requestId: r.id,
    mode: r.mode,
    title: r.title,
    category: r.category,
    description: r.description,
    zip: r.zip,
    requirements: r.requirements,
    depositPerUnitCents: r.depositPerUnitCents,
    fundedUnits: held.reduce((s, b) => s + b.units, 0),
    fundedRequests: held.length,
    closesAt: r.closesAt,
    status: r.status,
    ...(r.catalog ? { catalog: { seller: r.catalog.seller, items: r.catalog.items.map((i) => ({ id: i.id, name: i.name, msrpCents: i.msrpCents, units: held.filter((b) => b.itemId === i.id).reduce((s, b) => s + b.units, 0) })) } } : {}),
  };
}
