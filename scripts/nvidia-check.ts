/**
 * Confirms the NVIDIA API key works with the configured text + vision models and shows the credit meter.
 * Spends 2 requests (≈2 credits). Prints no secrets.   Usage: npm run nvidia:check
 */
import { deflateSync } from "node:zlib";
import { Agent } from "../src/ai/agent.js";
import { NvidiaClient, UsageMeter } from "../src/ai/nvidia.js";
import { loadConfig } from "../src/config.js";

const cfg = loadConfig();
if (!cfg.NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is empty in .env");
const meter = new UsageMeter(cfg.AI_USAGE_FILE, cfg.NVIDIA_CREDITS, cfg.NVIDIA_CREDITS_PER_REQUEST);
const agent = new Agent("", cfg.AI_MODEL, { client: new NvidiaClient(cfg.NVIDIA_API_KEY, meter), textModel: cfg.NVIDIA_TEXT_MODEL, visionModel: cfg.NVIDIA_VISION_MODEL });

function png(): string {
  const w = 64, h = 48, raw = Buffer.alloc((w * 3 + 1) * h, 200);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
}

console.log(`AI: ${agent.label}`);
const job = await agent.parseJob("5 of us want the same 2026 compact hybrid SUV from one dealership, max $33,000 each, 36-month warranty, Austin 78704.");
console.log(`${job.source === "ai" ? "✓" : "✗"} text model parsed a request (${job.source}):`, JSON.stringify(job));
const vis = await agent.checkCompletion({ jobTitle: "Gutter cleaning", jobDescription: "Clean gutters", code: "AEON-TEST", note: "done", imageBase64: png(), mime: "image/png" });
console.log(`${vis.summary.startsWith("AI check failed") ? "✗" : "✓"} vision model answered:`, JSON.stringify(vis));
const u = meter.summary();
console.log(`\nNVIDIA credits: ${u.creditsUsed} used this project, ~${u.remainingCredits} of ${u.startingCredits} left (estimated: ${u.creditsPerRequest}/request). Check build.nvidia.com to reconcile.`);
