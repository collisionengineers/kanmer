import matter from "gray-matter";

/**
 * The review attestation written by kanmer-review to `scratch/review.md`.
 * This mirrors the field validation in `packages/mcp-server/src/check-pr.mjs`
 * so the store's Review → Implementing rule (CORE-121) and the CI gate accept
 * the same document; keep the two in step.
 */
export type ReviewAttestation =
  | { state: "absent" }
  | { state: "invalid"; reason: string }
  | {
      state: "valid";
      pr: string;
      headSha: string;
      verdict: "pass" | "needs-changes";
      reviewer: string;
      independent: boolean;
      ticketUpdated: string;
      findings: unknown[];
    };

const FULL_SHA = /^[0-9a-f]{40}$/iu;
const SEVERITIES = new Set(["blocker", "major", "minor", "note"]);
const DISPOSITIONS = new Set(["open", "fixed", "rejected-with-reason", "accepted-risk", "deferred-to-ticket"]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseReviewAttestation(raw: string | null): ReviewAttestation {
  if (raw === null) return { state: "absent" };
  try {
    const data = matter(raw).data as Record<string, unknown> | undefined;
    if (!data || typeof data !== "object") return { state: "invalid", reason: "frontmatter is not an object" };
    if (data.kind !== "review-attestation") return { state: "invalid", reason: 'kind must be "review-attestation"' };
    if (!nonEmpty(data.pr)) return { state: "invalid", reason: "pr must be a non-empty string" };
    if (typeof data.head_sha !== "string" || !FULL_SHA.test(data.head_sha)) {
      return { state: "invalid", reason: "head_sha must be a full hexadecimal Git object id" };
    }
    if (data.verdict !== "pass" && data.verdict !== "needs-changes") {
      return { state: "invalid", reason: 'verdict must be "pass" or "needs-changes"' };
    }
    if (!nonEmpty(data.reviewer)) return { state: "invalid", reason: "reviewer must be a non-empty string" };
    if (typeof data.independent !== "boolean") return { state: "invalid", reason: "independent must be boolean" };
    if (!nonEmpty(data.plan_hash)) return { state: "invalid", reason: "plan_hash must be a non-empty string" };
    if (!nonEmpty(data.ticket_updated)) return { state: "invalid", reason: "ticket_updated must be a non-empty string" };
    if (!Array.isArray(data.findings)) return { state: "invalid", reason: "findings must be an array" };
    for (const [index, finding] of (data.findings as unknown[]).entries()) {
      const f = finding as Record<string, unknown> | null;
      if (!f || typeof f !== "object") return { state: "invalid", reason: `findings[${index}] must be an object` };
      if (typeof f.id !== "string" || !/^F-\d{3,}$/u.test(f.id)) return { state: "invalid", reason: `findings[${index}].id must be an F-### identifier` };
      if (!SEVERITIES.has(f.severity as string)) return { state: "invalid", reason: `findings[${index}].severity is invalid` };
      if (!nonEmpty(f.summary)) return { state: "invalid", reason: `findings[${index}].summary must be non-empty` };
      if (!DISPOSITIONS.has(f.disposition as string)) return { state: "invalid", reason: `findings[${index}].disposition is invalid` };
      if ((f.disposition === "rejected-with-reason" || f.disposition === "accepted-risk") && !nonEmpty(f.reason)) {
        return { state: "invalid", reason: `findings[${index}].reason is required for ${f.disposition}` };
      }
      if (f.disposition === "deferred-to-ticket" && !nonEmpty(f.ticket)) {
        return { state: "invalid", reason: `findings[${index}].ticket is required for deferred-to-ticket` };
      }
    }
    return {
      state: "valid",
      pr: String(data.pr).trim(),
      headSha: data.head_sha.toLowerCase(),
      verdict: data.verdict,
      reviewer: data.reviewer,
      independent: data.independent,
      ticketUpdated: data.ticket_updated,
      findings: data.findings as unknown[],
    };
  } catch (error) {
    const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]+/gu, " ").slice(0, 240);
    return { state: "invalid", reason: `frontmatter could not be parsed: ${reason}` };
  }
}
