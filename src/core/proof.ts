import { randomInt } from "node:crypto";
import type { ProofCheck } from "../domain/types.js";
import { sha256Hex } from "./commit.js";

/**
 * Proof Challenge: the provider must photograph the finished job with a one-time code written in frame.
 * Deterministic code checks what code can check (format, freshness, reuse). The AI checks what only
 * vision can (is the code visible? does the work match the job and promises?). Code decides the verdict.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L confusion when handwritten

export function newChallengeCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `AEON-${s}`;
}

export interface ImageFacts {
  sha256: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "unknown";
  bytes: number;
  exifTakenAt: string | null; // "YYYY-MM-DDTHH:MM:SS" (camera local time, no zone)
}

export function inspectImage(buf: Buffer): ImageFacts {
  const mime =
    buf[0] === 0xff && buf[1] === 0xd8
      ? "image/jpeg"
      : buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ? "image/png"
        : buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP"
          ? "image/webp"
          : "unknown";
  return { sha256: sha256Hex(buf), mime, bytes: buf.length, exifTakenAt: mime === "image/jpeg" ? exifDate(buf) : null };
}

/** EXIF DateTimeOriginal/DateTime are ASCII "YYYY:MM:DD HH:MM:SS" inside the APP1 segment. */
function exifDate(buf: Buffer): string | null {
  const head = buf.subarray(0, Math.min(buf.length, 128 * 1024)).toString("latin1");
  if (!head.includes("Exif")) return null;
  const m = head.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
}

export function codeChecks(facts: ImageFacts, issuedAt: string, seenHashes: Set<string>, maxBytes = 8 * 1024 * 1024): ProofCheck[] {
  const checks: ProofCheck[] = [];
  checks.push({
    name: "Image file",
    ok: facts.mime !== "unknown" && facts.bytes <= maxBytes,
    detail: facts.mime === "unknown" ? "Not a JPEG/PNG/WebP image" : `${facts.mime}, ${(facts.bytes / 1024).toFixed(0)} KB`,
    by: "code",
  });
  checks.push({
    name: "Never used before",
    ok: !seenHashes.has(facts.sha256),
    detail: seenHashes.has(facts.sha256) ? "This exact photo was already submitted for another job" : "New photo (SHA-256 not seen before)",
    by: "code",
  });
  if (facts.exifTakenAt) {
    // Camera time has no zone: allow ±14 h either side of the challenge time.
    const taken = Date.parse(`${facts.exifTakenAt}Z`);
    const issued = Date.parse(issuedAt);
    const fresh = taken >= issued - 14 * 3600_000 && taken <= Date.now() + 14 * 3600_000;
    checks.push({
      name: "Taken after the challenge",
      ok: fresh,
      detail: fresh ? `Camera timestamp ${facts.exifTakenAt}` : `Camera timestamp ${facts.exifTakenAt} is before the code was issued`,
      by: "code",
    });
  } else {
    checks.push({ name: "Taken after the challenge", ok: null, detail: "No camera timestamp in file: not verifiable, the one-time code covers freshness", by: "code" });
  }
  return checks;
}

/** Code decides. Any hard fail → fail. Any AI "unsure" or code null with no visible code → review. */
export function verdict(checks: ProofCheck[]): "pass" | "fail" | "review" {
  if (checks.some((c) => c.ok === false)) return "fail";
  // Freshness is proven by code (live session stamp / photo checks); AI vision must confirm the work itself.
  const matches = checks.find((c) => c.name === "Work matches the job");
  if (!matches || matches.ok !== true) return "review";
  return "pass";
}
