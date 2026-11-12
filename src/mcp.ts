#!/usr/bin/env node
/**
 * Aeonith Offer Protocol as an MCP server (stdio). Lets ANY MCP-capable provider agent
 * (Claude Desktop, Claude Code, an Agent SDK app…) discover funded jobs and submit sealed bids.
 *
 * It holds the provider's salts locally (the provider's side of commit–reveal) and talks to the
 * Aeonith HTTP protocol through the APIMatic-generated SDK (src/agents/sellerSdk.ts). Buyers' limits never pass through here: the protocol has no field for them.
 *
 * Usage:  AEONITH_URL=http://localhost:3000 PROVIDER_ID=acme PROVIDER_NAME="Acme Plumbing" npx tsx src/mcp.ts
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SellerAgent } from "./agents/sellerSdk.js";
import type { Offer } from "./domain/types.js";

const BASE = process.env.AEONITH_URL ?? "http://localhost:3000";
const PROVIDER_ID = process.env.PROVIDER_ID ?? "mcp-provider";
const PROVIDER_NAME = process.env.PROVIDER_NAME ?? "MCP Provider";
const agent = new SellerAgent(PROVIDER_ID, PROVIDER_NAME, BASE);
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "aeonith-offer-protocol", version: "1.0.0" });

server.registerTool(
  "list_open_requests",
  { description: "List funded home-service jobs open for sealed bids. Shows funded homes, requirements and deadline. Never shows any buyer's price limit." },
  async () => ok(await agent.openDemand()),
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
    const c = await agent.commit(offer, a.pitch);
    return ok({ committed: c, note: "Only the hash was sent. Call reveal_bid after bidding closes." });
  },
);

server.registerTool(
  "reveal_bid",
  { description: "After bidding closes, reveal the sealed offer + salt so Aeonith can verify it against the hash.", inputSchema: { requestId: z.string() } },
  async ({ requestId }) => {
    return ok({ valid: await agent.reveal(requestId) });
  },
);

server.registerTool(
  "get_result",
  { description: "See whether the job was awarded and to whom.", inputSchema: { requestId: z.string() } },
  async ({ requestId }) => ok(await agent.result(requestId)),
);

await server.connect(new StdioServerTransport());
