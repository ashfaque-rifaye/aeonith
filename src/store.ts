import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AuditLog, type AuditEntry } from "./core/audit.js";
import type { BuyerHold, JobRequest, Requirements } from "./domain/types.js";

interface Persisted {
  requests: JobRequest[];
  audit: AuditEntry[];
  photoHashes: string[];
}

/** Small JSON-file store: enough for a demo, survives restarts, easy for judges to inspect. */
export class Store {
  requests = new Map<string, JobRequest>();
  audit = new AuditLog();
  photoHashes = new Set<string>();

  constructor(private readonly file: string | null) {
    if (file && existsSync(file)) {
      const data = JSON.parse(readFileSync(file, "utf8")) as Persisted;
      for (const r of data.requests) this.requests.set(r.id, r);
      this.audit = new AuditLog(data.audit);
      this.photoHashes = new Set(data.photoHashes);
    }
  }

  save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    const data: Persisted = { requests: [...this.requests.values()], audit: this.audit.toJSON(), photoHashes: [...this.photoHashes] };
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, this.file);
  }

  get(id: string): JobRequest | undefined {
    return this.requests.get(id);
  }

  list(): JobRequest[] {
    return [...this.requests.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findBuyerByOrder(orderId: string): { request: JobRequest; buyer: BuyerHold } | undefined {
    for (const request of this.requests.values()) {
      const buyer = request.buyers.find((b) => b.orderId === orderId);
      if (buyer) return { request, buyer };
    }
  }

  findBuyerByAuthorization(authId: string): { request: JobRequest; buyer: BuyerHold } | undefined {
    for (const request of this.requests.values()) {
      const buyer = request.buyers.find((b) => b.authorizationId === authId);
      if (buyer) return { request, buyer };
    }
  }
}

export function newRequest(args: {
  mode: JobRequest["mode"];
  title: string;
  category: string;
  description: string;
  zip: string;
  requirements: Requirements;
  closesInHours: number;
}): JobRequest {
  const now = new Date();
  return {
    id: `req_${randomUUID().slice(0, 8)}`,
    mode: args.mode,
    title: args.title,
    category: args.category,
    description: args.description,
    zip: args.zip,
    requirements: args.requirements,
    createdAt: now.toISOString(),
    closesAt: new Date(now.getTime() + args.closesInHours * 3600_000).toISOString(),
    status: "open",
    buyers: [],
    commitments: [],
    reveals: [],
  };
}

export function newBuyer(name: string, limitCents: number, units: number, soloBestCents?: number): BuyerHold {
  return {
    id: `b_${randomUUID().slice(0, 8)}`,
    name: name.slice(0, 60),
    units,
    limitCents,
    soloBestCents,
    consentAt: new Date().toISOString(),
    status: "pending",
  };
}

/** Demo seed: Maria's solo repair and her street's group gutter job (US, Austin TX). */
export function seedDemo(store: Store) {
  if (store.requests.size > 0) return;
  const inDays = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
  const solo = newRequest({
    mode: "solo",
    title: "Fix leaking water heater",
    category: "plumbing",
    description: "40-gallon gas water heater leaking from the bottom. Replace or repair, haul away old unit. Austin, TX 78704.",
    zip: "78704",
    requirements: { licensed: true, minWarrantyMonths: 0, completeBy: inDays(4) },
    closesInHours: 24,
  });
  solo.buyers.push(newBuyer("Maria G.", 40000, 1));
  store.requests.set(solo.id, solo);
  store.audit.append("buyer:" + solo.buyers[0].id, "request.created", { mode: "solo", title: solo.title }, solo.id);

  const group = newRequest({
    mode: "together",
    title: "Gutter cleaning before winter: Maple St",
    category: "gutters",
    description: "Single-storey homes on Maple St, Austin TX 78704. Clean gutters and downspouts, bag debris.",
    zip: "78704",
    requirements: { licensed: false, minWarrantyMonths: 0, completeBy: inDays(10) },
    closesInHours: 48,
  });
  const neighbours: [string, number, number?][] = [
    ["Maria G.", 14000, 16000],
    ["Dev P.", 13000],
    ["Aisha K.", 12500],
    ["Tom R.", 12000],
    ["Lena S.", 12000],
    ["Sam W.", 9000],
  ];
  for (const [n, limit, solo] of neighbours) group.buyers.push(newBuyer(n, limit, 1, solo));
  store.requests.set(group.id, group);
  store.audit.append("engine", "request.created", { mode: "together", title: group.title, homes: neighbours.length }, group.id);
  store.save();
}
