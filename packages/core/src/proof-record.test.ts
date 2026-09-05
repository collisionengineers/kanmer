import { describe, expect, it } from "vitest";
import {
  PROOF_RECORD_PARSER_VERSION,
  parseProofDocument,
  parseProofRecord,
  proofCensusBucket,
  type ProofRecord,
} from "./proof-record.js";

const SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);

/** A minimal, valid single-authoritative-PASS attempt. */
function passAttempt(over: Record<string, unknown> = {}) {
  return {
    attempted_at: "2026-09-05T04:00:00.000Z",
    command: "npm run verify",
    cwd: "/tmp/verify-CORE-129",
    exit_code: 0,
    result: "PASS",
    authority: "authoritative",
    summary: "the full rail passed at the merge SHA",
    ...over,
  };
}

/** A valid schema-2 record; `over` patches the top level. */
function record(over: Record<string, unknown> = {}) {
  return {
    kind: "proof-record",
    schema: 2,
    merged_sha: SHA,
    environment: "detached worktree, Windows 11, Node 24.15",
    verified_at: "2026-09-05T04:00:00.000Z",
    result: "PASS",
    attempts: [passAttempt()],
    ...over,
  };
}

function diagnosticsOf(parsed: ProofRecord): string[] {
  return parsed.diagnostics;
}

describe("parseProofRecord — the accepted shape", () => {
  it("accepts a single authoritative PASS", () => {
    const parsed = parseProofRecord(record());
    expect(parsed.state).toBe("valid-pass");
    if (parsed.state !== "valid-pass") return;
    expect(parsed.mergedSha).toBe(SHA);
    expect(parsed.waived).toBe(false);
    expect(parsed.attempts).toHaveLength(1);
    expect(parsed.receipts).toEqual([]);
    expect(parsed.unknown).toEqual({});
    expect(parsed.diagnostics).toEqual([]);
  });

  it("accepts supporting attempts before the final authoritative verdict", () => {
    const parsed = parseProofRecord(
      record({
        result: "PASS",
        verified_at: "2026-09-05T05:00:00.000Z",
        attempts: [
          passAttempt({
            attempted_at: "2026-09-05T04:00:00.000Z",
            authority: "supporting",
            result: "FAIL",
            exit_code: 1,
            failure_class: "transient",
            summary: "a flake under load",
          }),
          passAttempt({ attempted_at: "2026-09-05T05:00:00.000Z" }),
        ],
      }),
    );
    expect(parsed.state).toBe("valid-pass");
  });

  it("accepts a manual attempt with a null exit code and no command", () => {
    const manual = {
      attempted_at: "2026-09-05T04:00:00.000Z",
      exit_code: null,
      result: "INCONCLUSIVE",
      authority: "authoritative",
      failure_class: "inconclusive",
      summary: "the installed-host check needs a packaged build that is unavailable here",
    };
    const parsed = parseProofRecord(
      record({ result: "INCONCLUSIVE", failure_class: "inconclusive", attempts: [manual] }),
    );
    expect(parsed.state).toBe("valid-inconclusive");
  });

  it("accepts a consistent FAIL and reports it as valid-fail", () => {
    const parsed = parseProofRecord(
      record({
        result: "FAIL",
        failure_class: "implementation",
        attempts: [passAttempt({ result: "FAIL", exit_code: 2, failure_class: "implementation" })],
      }),
    );
    expect(parsed.state).toBe("valid-fail");
    if (parsed.state !== "valid-fail") return;
    expect(parsed.failureClass).toBe("implementation");
  });

  it("preserves and reports unknown top-level keys instead of dropping them", () => {
    const parsed = parseProofRecord(record({ ticket: "CORE-129", reviewer_note: "n/a" }));
    expect(parsed.state).toBe("valid-pass");
    if (parsed.state !== "valid-pass") return;
    expect(parsed.unknown).toEqual({ reviewer_note: "n/a", ticket: "CORE-129" });
    expect(parsed.diagnostics).toEqual([
      'unknown top-level key "reviewer_note" preserved but not interpreted',
      'unknown top-level key "ticket" preserved but not interpreted',
    ]);
  });

  it("accepts a Date-valued timestamp, as YAML loads an unquoted instant", () => {
    const parsed = parseProofRecord(
      record({
        verified_at: new Date("2026-09-05T04:00:00.000Z"),
        attempts: [passAttempt({ attempted_at: new Date("2026-09-05T04:00:00.000Z") })],
      }),
    );
    expect(parsed.state).toBe("valid-pass");
  });
});

describe("parseProofRecord — legacy records are described, never reinterpreted", () => {
  it("reports a proof with no frontmatter as legacy", () => {
    expect(parseProofDocument("# Proof\n\nIt worked.\n").state).toBe("legacy");
  });

  it("reports today's schema-less proof-record as legacy, however well formed", () => {
    const parsed = parseProofRecord({
      kind: "proof-record",
      merged_sha: SHA,
      environment: "detached worktree",
      verified_at: "2026-09-04T00:00:00.000Z",
      result: "PASS",
      attempts: [{ attempted_at: "2026-09-04T00:00:00.000Z", command: "npm run verify", cwd: ".", exit_code: 0, result: "PASS", summary: "ok" }],
    });
    expect(parsed.state).toBe("legacy");
    expect(diagnosticsOf(parsed)[0]).toContain("without schema: 2");
  });

  it("reports a CORE-042-shaped record — top-level PASS, contradicted only in prose — as legacy, not as PASS", () => {
    const parsed = parseProofDocument(
      [
        "---",
        "kind: proof-record",
        `merged_sha: "${SHA}"`,
        'environment: "local"',
        'verified_at: "2026-08-22T00:00:00.000Z"',
        "result: PASS",
        "attempts: []",
        "---",
        "",
        "A later independent rerun on 2026-08-23T14:04Z records npm run verify FAIL",
        "on five tests. CORE-042 stays Verifying and is not moved or closed.",
      ].join("\n"),
    );
    expect(parsed.state).toBe("legacy");
  });

  it("refuses a schema this build does not know rather than calling it legacy", () => {
    const parsed = parseProofRecord(record({ schema: 3 }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toEqual(["schema must be 2, got 3"]);
  });

  it("reports unreadable frontmatter as invalid, because it makes no describable claim", () => {
    const parsed = parseProofDocument("---\nkind: [unclosed\n---\n\nbody\n");
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)[0]).toContain("frontmatter could not be parsed");
  });

  it("gives the same answer for the same bytes however many times it is asked (review round 1, F-001)", () => {
    // `gray-matter` memoises by input string and, when the YAML throws, caches
    // `{ data: {} }` under that key before rethrowing — so without
    // `cache: false` these same bytes read `invalid` once and `legacy` for the
    // rest of the process. The census digest is computed from parsed state, so
    // that made a dry run and its own locked re-read disagree over identical
    // documents. Three calls, because the defect only appears from the second.
    const malformed = "---\nkind: [unclosed\n---\n\nbody\n";
    const states = [1, 2, 3].map(() => parseProofDocument(malformed).state);
    expect(states).toEqual(["invalid", "invalid", "invalid"]);

    // The same property for a record that parses: repeated reads must not drift
    // either, and must not be served from a stale entry for different bytes.
    const good = parseProofDocument(["---", "kind: proof-record", "schema: 2", `merged_sha: "${SHA}"`, 'environment: "e"', 'verified_at: "2026-09-05T04:00:00.000Z"', "result: PASS", "attempts:", '  - attempted_at: "2026-09-05T04:00:00.000Z"', '    command: "npm run verify"', '    cwd: "."', "    exit_code: 0", "    result: PASS", "    authority: authoritative", '    summary: "ok"', "---", ""].join("\n"));
    expect(good.state).toBe("valid-pass");
    expect(parseProofDocument(malformed).state).toBe("invalid");
  });
});

describe("parseProofRecord — the negative matrix", () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["wrong kind", record({ kind: "review-attestation" }), 'kind must be "proof-record"'],
    ["short merged_sha", record({ merged_sha: "abc123" }), "merged_sha must be a full 40-hex Git object id"],
    ["blank environment", record({ environment: "   " }), "environment must be a non-empty string"],
    ["unparseable verified_at", record({ verified_at: "last tuesday" }), "verified_at must be an ISO-8601 timestamp"],
    ["unknown top-level result", record({ result: "GREEN" }), "result must be one of PASS, FAIL, INCONCLUSIVE, WAIVED_BY_OPERATOR"],
    ["empty attempts", record({ attempts: [] }), "attempts must be a non-empty array"],
    ["non-array attempts", record({ attempts: "one" }), "attempts must be a non-empty array"],
    ["non-object attempt", record({ attempts: ["ran it"] }), "attempts[0] must be an object"],
    ["unknown attempt key", record({ attempts: [passAttempt({ notes: "extra" })] }), 'attempts[0] has unknown key "notes"'],
    ["bad attempt result", record({ attempts: [passAttempt({ result: "OK" })] }), "attempts[0].result must be one of PASS, FAIL, INCONCLUSIVE"],
    ["bad attempt authority", record({ attempts: [passAttempt({ authority: "final" })] }), 'attempts[0].authority must be "authoritative" or "supporting"'],
    ["blank attempt summary", record({ attempts: [passAttempt({ summary: " " })] }), "attempts[0].summary must be a non-empty string"],
    ["missing exit_code", record({ attempts: [{ attempted_at: "2026-09-05T04:00:00.000Z", result: "PASS", authority: "authoritative", summary: "ok" }] }), "attempts[0].exit_code is required (an integer, or null for a manual check)"],
    ["non-integer exit_code", record({ attempts: [passAttempt({ exit_code: 0.5 })] }), "attempts[0].exit_code must be an integer or null"],
    ["command without exit code", record({ attempts: [passAttempt({ exit_code: null })] }), "attempts[0] has exit_code: null but also names command/cwd; a manual attempt records its procedure in summary"],
    ["process attempt missing cwd", record({ attempts: [{ attempted_at: "2026-09-05T04:00:00.000Z", command: "npm run verify", exit_code: 0, result: "PASS", authority: "authoritative", summary: "ok" }] }), "attempts[0].cwd must be a non-empty string beside an integer exit_code"],
    ["PASS with a non-zero exit", record({ attempts: [passAttempt({ exit_code: 1 })] }), "attempts[0] records PASS with a non-zero exit code"],
    ["FAIL with exit 0", record({ result: "FAIL", failure_class: "implementation", attempts: [passAttempt({ result: "FAIL", failure_class: "implementation" })] }), "attempts[0] records FAIL with exit code 0"],
    ["PASS carrying a failure class", record({ attempts: [passAttempt({ failure_class: "transient" })] }), "attempts[0] records PASS and must not carry a failure_class"],
    ["FAIL with no failure class", record({ result: "FAIL", attempts: [passAttempt({ result: "FAIL", exit_code: 1 })] }), "attempts[0] records FAIL and must carry failure_class implementation, plan or transient"],
    ["FAIL classed inconclusive", record({ result: "FAIL", failure_class: "inconclusive", attempts: [passAttempt({ result: "FAIL", exit_code: 1, failure_class: "inconclusive" })] }), "attempts[0] records FAIL and must carry failure_class implementation, plan or transient"],
    ["INCONCLUSIVE classed implementation", record({ result: "INCONCLUSIVE", failure_class: "implementation", attempts: [passAttempt({ result: "INCONCLUSIVE", exit_code: 1, failure_class: "implementation" })] }), 'attempts[0] records INCONCLUSIVE and must carry failure_class "inconclusive"'],
    ["unrecognised failure class", record({ attempts: [passAttempt({ failure_class: "flaky" })] }), "attempts[0].failure_class must be one of implementation, plan, transient, inconclusive"],
  ];

  for (const [name, frontmatter, expected] of cases) {
    it(`refuses ${name}`, () => {
      const parsed = parseProofRecord(frontmatter);
      expect(parsed.state).toBe("invalid");
      expect(diagnosticsOf(parsed)).toContain(expected);
    });
  }
});

describe("parseProofRecord — chronology and authority binding", () => {
  it("refuses a trailing supporting entry, so a later FAIL cannot hide behind an earlier PASS", () => {
    const parsed = parseProofRecord(
      record({
        attempts: [
          passAttempt({ attempted_at: "2026-09-05T04:00:00.000Z" }),
          passAttempt({
            attempted_at: "2026-09-05T05:00:00.000Z",
            authority: "supporting",
            result: "FAIL",
            exit_code: 1,
            failure_class: "implementation",
            summary: "five tests failed on the rerun",
          }),
        ],
      }),
    );
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("the final attempt must be authoritative; a supporting entry may only precede the verdict");
  });

  it("refuses a top-level PASS whose final authoritative attempt is a FAIL", () => {
    const parsed = parseProofRecord(
      record({
        verified_at: "2026-09-05T05:00:00.000Z",
        failure_class: "implementation",
        attempts: [
          passAttempt({ attempted_at: "2026-09-05T04:00:00.000Z" }),
          passAttempt({
            attempted_at: "2026-09-05T05:00:00.000Z",
            result: "FAIL",
            exit_code: 1,
            failure_class: "implementation",
            summary: "the rerun failed",
          }),
        ],
      }),
    );
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain('result "PASS" disagrees with the final authoritative attempt\'s "FAIL"');
  });

  it("refuses tied attempt timestamps", () => {
    const parsed = parseProofRecord(
      record({
        attempts: [
          passAttempt({ authority: "supporting" }),
          passAttempt(),
        ],
      }),
    );
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("attempts[1].attempted_at ties attempts[0]; attempt timestamps must strictly increase");
  });

  it("refuses reversed attempt timestamps", () => {
    const parsed = parseProofRecord(
      record({
        attempts: [
          passAttempt({ attempted_at: "2026-09-05T06:00:00.000Z", authority: "supporting" }),
          passAttempt({ attempted_at: "2026-09-05T04:00:00.000Z" }),
        ],
      }),
    );
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("attempts[1].attempted_at precedes attempts[0]; attempt timestamps must strictly increase");
  });

  it("refuses verified_at that drifts from the final authoritative attempt", () => {
    const parsed = parseProofRecord(record({ verified_at: "2026-09-05T09:00:00.000Z" }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("verified_at must equal the final authoritative attempt's attempted_at");
  });

  it("refuses a top-level failure class that drifts from the final attempt", () => {
    const parsed = parseProofRecord(
      record({
        result: "FAIL",
        failure_class: "plan",
        attempts: [passAttempt({ result: "FAIL", exit_code: 1, failure_class: "implementation" })],
      }),
    );
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain('top-level failure_class must equal the final authoritative attempt\'s "implementation"');
  });

  it("refuses a PASS record carrying a top-level failure class", () => {
    const parsed = parseProofRecord(record({ failure_class: "transient" }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("a PASS record must not carry a top-level failure_class");
  });
});

describe("parseProofRecord — operator waivers", () => {
  const waived = (over: Record<string, unknown> = {}) =>
    record({
      result: "WAIVED_BY_OPERATOR",
      failure_class: "inconclusive",
      waived_by: "Alex",
      waiver_reason: "the installed-host check cannot run on this machine",
      attempts: [
        {
          attempted_at: "2026-09-05T04:00:00.000Z",
          exit_code: null,
          result: "INCONCLUSIVE",
          authority: "authoritative",
          failure_class: "inconclusive",
          summary: "no packaged build available",
        },
      ],
      ...over,
    });

  it("accepts a waiver with the operator identity and reason", () => {
    const parsed = parseProofRecord(waived());
    expect(parsed.state).toBe("valid-pass");
    if (parsed.state !== "valid-pass") return;
    expect(parsed.waived).toBe(true);
    expect(parsed.diagnostics).toContain("operator waiver by Alex over a INCONCLUSIVE ledger");
  });

  it("refuses a waiver with no named operator", () => {
    const parsed = parseProofRecord(waived({ waived_by: undefined }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("WAIVED_BY_OPERATOR requires waived_by naming the operator");
  });

  it("refuses a waiver with no reason", () => {
    const parsed = parseProofRecord(waived({ waiver_reason: "  " }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("WAIVED_BY_OPERATOR requires waiver_reason");
  });

  it("refuses operator fields on a record that is not waived", () => {
    const parsed = parseProofRecord(record({ waived_by: "Alex" }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("waived_by is only valid with result: WAIVED_BY_OPERATOR");
  });
});

describe("parseProofRecord — receipts (MCP-057) are read by the same parser", () => {
  const receipt = (over: Record<string, unknown> = {}) => ({
    kind: "github-actions-run",
    provider: "github",
    repo: "collisionengineers/kanmer",
    workflow: "pr.yml",
    event: "push",
    run_id: 1234567890,
    head_sha: SHA,
    job: "verify",
    conclusion: "success",
    url: "https://github.com/collisionengineers/kanmer/actions/runs/1234567890",
    ...over,
  });

  it("preserves a well-formed receipt, unknown fields included", () => {
    const parsed = parseProofRecord(record({ receipts: [receipt({ observed_by: "kt", covers: ["npm run verify"] })] }));
    expect(parsed.state).toBe("valid-pass");
    if (parsed.state !== "valid-pass") return;
    expect(parsed.receipts).toHaveLength(1);
    expect(parsed.receipts[0].observed_by).toBe("kt");
    expect(parsed.receipts[0].covers).toEqual(["npm run verify"]);
  });

  it("refuses a receipt whose head_sha disagrees with this record's merged_sha", () => {
    const parsed = parseProofRecord(record({ receipts: [receipt({ head_sha: OTHER_SHA })] }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("receipts[0].head_sha does not match this record's merged_sha");
  });

  it("refuses a receipt whose head_sha is not a full object id", () => {
    const parsed = parseProofRecord(record({ receipts: [receipt({ head_sha: "abc" })] }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("receipts[0].head_sha must be a full 40-hex Git object id");
  });

  it("refuses a receipts value that is not an array", () => {
    const parsed = parseProofRecord(record({ receipts: "one run" }));
    expect(parsed.state).toBe("invalid");
    expect(diagnosticsOf(parsed)).toContain("receipts must be an array when present");
  });

  it("leaves a record with no receipts entirely unaffected", () => {
    const parsed = parseProofRecord(record());
    expect(parsed.state).toBe("valid-pass");
    if (parsed.state !== "valid-pass") return;
    expect(parsed.receipts).toEqual([]);
  });

  it("does not re-check what reconciliation owns: a receipt naming this record's own SHA is accepted whatever the live PR says", () => {
    // `assessReceipt` compares against the *live* merge SHA and is called by
    // reconciliation; this parser only asks whether the document contradicts
    // itself. A conclusion of `failure` is therefore not this parser's refusal.
    const parsed = parseProofRecord(record({ receipts: [receipt({ conclusion: "failure" })] }));
    expect(parsed.state).toBe("valid-pass");
  });
});

describe("census helpers", () => {
  it("buckets every state", () => {
    expect(proofCensusBucket("valid-pass")).toBe("valid");
    expect(proofCensusBucket("valid-fail")).toBe("valid");
    expect(proofCensusBucket("valid-inconclusive")).toBe("valid");
    expect(proofCensusBucket("legacy")).toBe("legacy");
    expect(proofCensusBucket("invalid")).toBe("invalid");
  });

  it("pins the parser version a census digest is computed under", () => {
    expect(PROOF_RECORD_PARSER_VERSION).toBe("proof-record/2#1");
  });
});
