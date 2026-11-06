#!/usr/bin/env node
/**
 * Aeonith Offer Protocol as an MCP server (stdio). Lets ANY MCP-capable provider agent
 * (Claude Desktop, Claude Code, an Agent SDK app…) discover funded jobs and submit sealed bids.
 *
 * It holds the provider's salts locally (the provider's side of commit–reveal) and talks to the
 * Aeonith HTTP protocol. Buyers' limits never pass through here: the protocol has no field for them.
 *
 * Usage:  AEONITH_URL=http://localhost:3000 PROVIDER_ID=acme PROVIDER_NAME="Acme Plumbing" npx tsx src/mcp.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { commitmentHash, newSalt } from "./core/commit.js";
import type { Offer } from "./domain/types.js";

const BASE = process.env.AEONITH_URL ?? "http://localhost:3000";
const PROVIDER_ID = process.env.PROVIDER_ID ?? "mcp-provider";
const PROVIDER_NAME = process.env.PROVIDER_NAME ?? "MCP Provider";
const sealed = new Map<string, { offer: Offer; salt: string; pitch: string }>();

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return text ? JSON.parse(text) : {};
}
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "aeonith-offer-protocol", version: "1.0.0" });

server.registerTool(
  "list_open_requests",
  { description: "List funded home-service jobs open for sealed bids. Shows funded homes, requirements and deadline. Never shows any buyer's price limit." },
  async () => ok(await api("/protocol/v1/requests")),
);

server.registerTool(
  "submit_sealed_bid",
  {
    description:
      "Seal a bid: computes SHA-256(offer|salt) locally, keeps the salt secret here, and sends ONLY the hash to Aeonith. Price is per home, in US cents.",
    inputSchema: {
      requestId: z.string(),
      priceCents: z.number().int().positive(),
      minUnits: z.number().int().min(1),
      licensed: z.boolean(),
      licenseNo: z.string(),
      warrantyMonths: z.number().int().min(0),
      startAt: z.string().describe("ISO datetime"),
      endAt: z.string().describe("ISO datetime"),
      pitch: z.string().max(600).default(""),
    },
  },
  async (a) => {
    const offer: Offer = {
      requestId: a.requestId,
      providerId: PROVIDER_ID,
      priceCents: a.priceCents,
      minUnits: a.minUnits,
      promises: { licensed: a.licensed, licenseNo: a.licenseNo, warrantyMonths: a.warrantyMonths, startAt: new Date(a.startAt).toISOString(), endAt: new Date(a.endAt).toISOString() },
    };
    const salt = newSalt();
    const hash = commitmentHash(offer, salt);
    const c = await api(`/protocol/v1/requests/${encodeURIComponent(a.requestId)}/commitments`, {
      method: "POST",
      body: JSON.stringify({ providerId: PROVIDER_ID, providerName: PROVIDER_NAME, hash }),
    });
    sealed.set(a.requestId, { offer, salt, pitch: a.pitch });
    return ok({ committed: c, note: "Only the hash was sent. Call reveal_bid after bidding closes." });
  },
);

server.registerTool(
  "reveal_bid",
  { description: "After bidding closes, reveal the sealed offer + salt so Aeonith can verify it against the hash.", inputSchema: { requestId: z.string() } },
  async ({ requestId }) => {
    const s = sealed.get(requestId);
    if (!s) throw new Error("No sealed bid for that request in this session");
    return ok(await api(`/protocol/v1/requests/${encodeURIComponent(requestId)}/reveals`, { method: "POST", body: JSON.stringify(s) }));
  },
);

server.registerTool(
  "get_result",
  { description: "See whether the job was awarded and to whom.", inputSchema: { requestId: z.string() } },
  async ({ requestId }) => ok(await api(`/protocol/v1/requests/${encodeURIComponent(requestId)}/result`)),
);

await server.connect(new StdioServerTransport());
