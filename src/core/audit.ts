import { canonicalJson, sha256Hex } from "./commit.js";

/**
 * Tamper-evident audit log: each entry carries the SHA-256 of the previous entry,
 * so editing or deleting any past entry breaks every hash after it.
 */
export interface AuditEntry {
  seq: number;
  at: string;
  actor: string; // "buyer:<id>", "provider:<id>", "ai", "engine", "policy", "paypal", "admin"
  action: string;
  requestId?: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

const GENESIS = "0".repeat(64);

export class AuditLog {
  constructor(private entries: AuditEntry[] = []) {}

  append(actor: string, action: string, data: Record<string, unknown> = {}, requestId?: string): AuditEntry {
    const prevHash = this.entries.at(-1)?.hash ?? GENESIS;
    const body = { seq: this.entries.length + 1, at: new Date().toISOString(), actor, action, requestId, data, prevHash };
    const entry: AuditEntry = { ...body, hash: sha256Hex(canonicalJson(body)) };
    this.entries.push(entry);
    return entry;
  }

  all(requestId?: string): AuditEntry[] {
    return requestId ? this.entries.filter((e) => e.requestId === requestId) : [...this.entries];
  }

  /** Recompute the chain. Returns the first broken seq, or null if intact. */
  verify(): { ok: boolean; brokenAt: number | null; length: number } {
    let prev = GENESIS;
    for (const e of this.entries) {
      const { hash, ...body } = e;
      if (e.prevHash !== prev || sha256Hex(canonicalJson(body)) !== hash) return { ok: false, brokenAt: e.seq, length: this.entries.length };
      prev = hash;
    }
    return { ok: true, brokenAt: null, length: this.entries.length };
  }

  toJSON() {
    return this.entries;
  }
}
