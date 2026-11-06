import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Offer } from "../domain/types.js";

/**
 * Commit–reveal sealed bids.
 * Before the deadline a provider publishes only H = SHA-256(canonical(offer) + "|" + salt).
 * After the deadline it reveals (offer, salt); anyone can recompute H. Nobody (including Aeonith)
 * can read a bid early, and a revealed bid cannot be altered.
 */

/** Deterministic JSON: object keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(",")}}`;
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function commitmentHash(offer: Offer, salt: string): string {
  if (!/^[0-9a-f]{32,}$/i.test(salt)) throw new Error("salt must be at least 16 random bytes, hex encoded");
  return createHash("sha256").update(`${canonicalJson(offer)}|${salt}`).digest("hex");
}

export function verifyReveal(expectedHash: string, offer: Offer, salt: string): boolean {
  let actual: string;
  try {
    actual = commitmentHash(offer, salt);
  } catch {
    return false;
  }
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
