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
