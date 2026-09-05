import { describe, expect, it } from "vitest";
import { assessReceipt, parseProofReceipts, type ProofReceipt } from "./proof-receipts.js";

const mergedSha = "a".repeat(40);
const otherSha = "b".repeat(40);

function validReceipt(overrides: Partial<ProofReceipt> = {}): ProofReceipt {
  return {
    kind: "github-actions-run",
    provider: "github",
    repo: "collisionengineers/kanmer",
    workflow: "pr.yml",
    event: "push",
    run_id: 1234567890,
    attempt: 1,
    head_sha: mergedSha,
    job: "verify",
    conclusion: "success",
    url: "https://github.com/collisionengineers/kanmer/actions/runs/1234567890",
    covers: ["npm run verify"],
    observed_by: "claude-code",
    ...overrides,
  };
}

describe("parseProofReceipts", () => {
  it("returns [] when the frontmatter has no receipts key (existing proofs)", () => {
    expect(parseProofReceipts({ kind: "proof-record", result: "PASS" })).toEqual([]);
  });

  it("returns [] for non-object/null frontmatter", () => {
    expect(parseProofReceipts(null)).toEqual([]);
    expect(parseProofReceipts(undefined)).toEqual([]);
    expect(parseProofReceipts("nope")).toEqual([]);
  });

  it("parses a well-formed receipts list", () => {
    const receipt = validReceipt();
    expect(parseProofReceipts({ receipts: [receipt] })).toEqual([receipt]);
  });

  it("preserves an unknown extra field on a receipt", () => {
    const receipt = validReceipt({ future_field: "kept" } as Partial<ProofReceipt>);
    const result = parseProofReceipts({ receipts: [receipt] });
    expect(Array.isArray(result)).toBe(true);
    expect((result as ProofReceipt[])[0]?.future_field).toBe("kept");
  });

  it("reports invalid when receipts is not an array", () => {
    expect(parseProofReceipts({ receipts: "not-an-array" })).toEqual({
      invalid: ["receipts must be an array when present"],
    });
  });

  it("reports invalid when an entry is not an object", () => {
    expect(parseProofReceipts({ receipts: [42] })).toEqual({
      invalid: ["receipts[0] must be an object"],
    });
  });

  it("reports invalid when an entry has no non-empty kind", () => {
    expect(parseProofReceipts({ receipts: [{ job: "verify" }] })).toEqual({
      invalid: ["receipts[0].kind must be a non-empty string"],
    });
  });
});

describe("assessReceipt", () => {
  it("is satisfied for a valid matching receipt", () => {
    expect(assessReceipt(validReceipt(), { mergedSha })).toEqual({ kind: "satisfied" });
  });

  it("rejects a receipt naming the wrong SHA", () => {
    const result = assessReceipt(validReceipt({ head_sha: otherSha }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons).toContain("receipt head_sha does not match the PR merge SHA");
  });

  it("rejects a cancelled/non-success conclusion", () => {
    const result = assessReceipt(validReceipt({ conclusion: "cancelled" }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons.some((r) => r.includes("conclusion"))).toBe(true);
  });

  it("rejects a pull_request-event run", () => {
    const result = assessReceipt(validReceipt({ event: "pull_request" }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons.some((r) => r.includes("event"))).toBe(true);
  });

  it("rejects a receipt missing the verify job", () => {
    const result = assessReceipt(validReceipt({ job: undefined }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons).toContain("receipt is missing job");
  });

  it("rejects an unknown receipt kind", () => {
    const result = assessReceipt(validReceipt({ kind: "some-other-provider-run" }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons.some((r) => r.startsWith("unknown receipt kind"))).toBe(true);
  });

  it("rejects a receipt missing run_id or url", () => {
    const noRunId = assessReceipt(validReceipt({ run_id: undefined }), { mergedSha });
    expect(noRunId.kind).toBe("rejected");
    expect((noRunId as { reasons: string[] }).reasons).toContain("receipt is missing run_id");

    const noUrl = assessReceipt(validReceipt({ url: undefined }), { mergedSha });
    expect(noUrl.kind).toBe("rejected");
    expect((noUrl as { reasons: string[] }).reasons).toContain("receipt is missing url");
  });

  it("rejects a head_sha that is not a 40-hex string even before SHA comparison", () => {
    const result = assessReceipt(validReceipt({ head_sha: "not-a-sha" }), { mergedSha });
    expect(result.kind).toBe("rejected");
    expect((result as { reasons: string[] }).reasons).toContain("receipt head_sha must be a full 40-hex Git object id");
  });
});
