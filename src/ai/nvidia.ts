import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * NVIDIA API catalog (build.nvidia.com) client: OpenAI-compatible chat completions at integrate.api.nvidia.com.
 * Every call is metered by UsageMeter so the NVIDIA credit balance is tracked on each request.
 */

export const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

export type ChatContent = string | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: ChatContent;
}

export interface UsageEvent {
  at: string;
  purpose: string;
  model: string;
  ok: boolean;
  ms: number;
  promptTokens: number;
  completionTokens: number;
  credits: number;
  error?: string;
}

interface UsageState {
  startingCredits: number;
  creditsPerRequest: number;
  requests: number;
  failed: number;
  creditsUsed: number;
  promptTokens: number;
  completionTokens: number;
  byPurpose: Record<string, { requests: number; credits: number; tokens: number }>;
  byModel: Record<string, { requests: number; credits: number; tokens: number }>;
  recent: UsageEvent[];
}

/**
 * Tracks NVIDIA credit spend. NVIDIA doesn't expose a balance API, so the balance is estimated:
 * starting credits (NVIDIA_CREDITS, from your build.nvidia.com account) minus credits per request
 * (NVIDIA_CREDITS_PER_REQUEST, default 1). Every attempt is counted, including failed ones, since the
 * dashboard may charge them. Persisted to disk so the count survives restarts. Check the dashboard to reconcile.
 */
export class UsageMeter {
  private s: UsageState;

  constructor(private readonly file: string | null, startingCredits: number, creditsPerRequest: number) {
    const fresh: UsageState = { startingCredits, creditsPerRequest, requests: 0, failed: 0, creditsUsed: 0, promptTokens: 0, completionTokens: 0, byPurpose: {}, byModel: {}, recent: [] };
    this.s = fresh;
    if (file && existsSync(file)) {
      try {
        this.s = { ...fresh, ...JSON.parse(readFileSync(file, "utf8")), startingCredits, creditsPerRequest };
      } catch {
        this.s = fresh;
      }
    }
  }

  record(e: Omit<UsageEvent, "at" | "credits">): UsageEvent {
    const ev: UsageEvent = { ...e, at: new Date().toISOString(), credits: this.s.creditsPerRequest };
    const s = this.s;
    s.requests++;
    if (!ev.ok) s.failed++;
    s.creditsUsed += ev.credits;
    s.promptTokens += ev.promptTokens;
    s.completionTokens += ev.completionTokens;
    const tok = ev.promptTokens + ev.completionTokens;
    for (const [map, key] of [[s.byPurpose, ev.purpose], [s.byModel, ev.model]] as const) {
      const row = (map[key] ??= { requests: 0, credits: 0, tokens: 0 });
      row.requests++;
      row.credits += ev.credits;
      row.tokens += tok;
    }
    s.recent = [ev, ...s.recent].slice(0, 50);
    this.save();
    console.log(
      `[nvidia] ${ev.purpose} · ${ev.model} · ${ev.ok ? "ok" : "FAILED"} · ${tok} tokens · ${ev.ms} ms · ` +
        `-${ev.credits} credit · ~${this.remaining} of ${s.startingCredits} left (${s.requests} requests)`,
    );
    return ev;
  }

  get remaining() {
    return Math.max(0, this.s.startingCredits - this.s.creditsUsed);
  }

  summary() {
    return { ...this.s, remainingCredits: this.remaining, estimated: true };
  }

  private save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.s, null, 2));
    renameSync(tmp, this.file);
  }
}

export class NvidiaClient {
  constructor(
    private readonly apiKey: string,
    readonly meter: UsageMeter,
    private readonly timeoutMs = 60_000,
  ) {}

  /** One chat completion. Returns the assistant text (reasoning traces stripped). Throws on HTTP/network errors. */
  async chat(args: { purpose: string; model: string; messages: ChatMessage[]; maxTokens: number; temperature?: number; thinking?: boolean }): Promise<string> {
    const t0 = Date.now();
    let usage = { prompt_tokens: 0, completion_tokens: 0 };
    try {
      const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ model: args.model, messages: args.messages, max_tokens: args.maxTokens, temperature: args.temperature ?? 0.2, stream: false,
          // Nemotron reasoning models: skip the thinking trace unless asked (faster, fewer tokens, same credit).
          chat_template_kwargs: { enable_thinking: args.thinking ?? false } }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      const body = (await res.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        detail?: string;
        error?: { message?: string } | string;
      };
      usage = { prompt_tokens: body.usage?.prompt_tokens ?? 0, completion_tokens: body.usage?.completion_tokens ?? 0 };
      if (!res.ok) {
        const msg = typeof body.error === "string" ? body.error : body.error?.message ?? body.detail ?? res.statusText;
        throw new Error(`NVIDIA ${res.status}: ${String(msg).slice(0, 160)}`);
      }
      const text = stripReasoning(body.choices?.[0]?.message?.content ?? "");
      this.meter.record({ purpose: args.purpose, model: args.model, ok: true, ms: Date.now() - t0, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens });
      return text;
    } catch (e) {
      const error = (e as Error).message.slice(0, 200);
      this.meter.record({ purpose: args.purpose, model: args.model, ok: false, ms: Date.now() - t0, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, error });
      throw e;
    }
  }
}

export function stripReasoning(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}

/** Pull the first JSON object out of a model reply (handles ```json fences and leading prose). */
export function extractJson(s: string): unknown {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fenced ? fenced[1] : s;
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(src.slice(start, end + 1));
}
