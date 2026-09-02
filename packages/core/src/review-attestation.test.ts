import { describe, expect, it } from "vitest";
import { parseReviewAttestation } from "./review-attestation.js";

const base = `---
kind: review-attestation
pr: "159"
head_sha: ${"a".repeat(40)}
verdict: pass
reviewer: independent-reviewer
independent: true
plan_hash: plan-version
ticket_updated: "2026-08-22T07:00:00.000Z"
findings: []
`;

const withExtra = (lines: string): string => `${base}${lines}---\nReview body\n`;

describe("parseReviewAttestation optional CORE-123 fields", () => {
  it("keeps an attestation without the optional fields valid and exposes plan_hash", () => {
    const parsed = parseReviewAttestation(withExtra(""));
    expect(parsed.state).toBe("valid");
    if (parsed.state !== "valid") return;
    expect(parsed.planHash).toBe("plan-version");
    expect(parsed.boardSha).toBeUndefined();
    expect(parsed.expectedReviewers).toBeUndefined();
    expect(parsed.threadsSnapshot).toBeUndefined();
  });

  it("parses board_sha, expected_reviewers and threads_snapshot when present", () => {
    const parsed = parseReviewAttestation(withExtra(
      `board_sha: ${"B".repeat(40)}\nexpected_reviewers:\n  - " copilot "\n  - claude\nthreads_snapshot:\n  - id: t1\n    resolved: true\n`,
    ));
    expect(parsed).toMatchObject({
      state: "valid",
      boardSha: "b".repeat(40),
      expectedReviewers: ["copilot", "claude"],
      threadsSnapshot: [{ id: "t1", resolved: true }],
    });
  });

  it("rejects malformed optional fields instead of ignoring them", () => {
    expect(parseReviewAttestation(withExtra("board_sha: abc123\n"))).toMatchObject({ state: "invalid", reason: expect.stringContaining("board_sha") });
    expect(parseReviewAttestation(withExtra("expected_reviewers: copilot\n"))).toMatchObject({ state: "invalid", reason: expect.stringContaining("expected_reviewers") });
    expect(parseReviewAttestation(withExtra('expected_reviewers:\n  - ""\n'))).toMatchObject({ state: "invalid", reason: expect.stringContaining("expected_reviewers") });
    expect(parseReviewAttestation(withExtra("threads_snapshot: none\n"))).toMatchObject({ state: "invalid", reason: expect.stringContaining("threads_snapshot") });
  });
});

const withFinding = (lines: string): string => `---
kind: review-attestation
pr: "159"
head_sha: ${"a".repeat(40)}
verdict: pass
reviewer: independent-reviewer
independent: true
plan_hash: plan-version
ticket_updated: "2026-08-22T07:00:00.000Z"
findings:
  - id: F-001
    severity: minor
    summary: outdated thread on a line the fix changed
${lines}---
Review body
`;

describe("parseReviewAttestation obsolete-after-change (SKILL-039)", () => {
  it("accepts obsolete-after-change with a reason naming the superseding commit", () => {
    const parsed = parseReviewAttestation(withFinding(
      `    disposition: obsolete-after-change\n    reason: superseded by ${"c".repeat(40)}\n`,
    ));
    expect(parsed.state).toBe("valid");
    if (parsed.state !== "valid") return;
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.findings[0]).toMatchObject({ id: "F-001", disposition: "obsolete-after-change" });
  });

  it("still rejects an unknown disposition", () => {
    expect(parseReviewAttestation(withFinding(
      `    disposition: superseded\n    reason: superseded by ${"c".repeat(40)}\n`,
    ))).toMatchObject({ state: "invalid", reason: expect.stringMatching(/disposition is invalid/u) });
  });

  it("requires a non-empty reason for obsolete-after-change", () => {
    expect(parseReviewAttestation(withFinding("    disposition: obsolete-after-change\n"))).toMatchObject({
      state: "invalid",
      reason: expect.stringMatching(/reason is required for obsolete-after-change/u),
    });
  });
});
