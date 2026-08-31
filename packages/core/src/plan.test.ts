import { describe, expect, it } from "vitest";
import {
  extractAtxSection,
  parsePlanPath,
  parseAtxSections,
  parsePlan,
  planPathMatches,
  validatePlan,
  type PlanFindingCode,
  type ParsedPlan,
} from "./plan.js";

/** A plan that satisfies the constrained-worker contract, used as the baseline. */
const GOOD_PLAN = `# Plan — TICK-001: bound the upload queue

## Objective
Uploads retry at most three times.

## Starting state
Verified against \`src/queue.ts:12\` and \`docs/functional/frd/FRD-001-uploads.md\`.
Evidence: \`research/research.md\`@\`aaaaaaaaaaaaaaaa\`, \`files/files.md\`@\`bbbbbbbbbbbbbbbb\`.

## Governing docs
Meets \`docs/functional/frd/FRD-001-uploads.md\`.

## Required changes
Add a bounded retry to \`enqueue\` in \`src/queue.ts\`.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | \`src/queue.ts\` | retry loop |
| Add | \`src/queue.test.ts\` | retry proof |
| Modify | \`src/legacy.ts\` | untouched by step 1 |

## Do not modify
- \`src/vendor/bundle.js\` — generated output.

## Constraints
Retry count stays configurable through \`QUEUE_MAX_RETRIES\`.

## Ordered steps

### Step 1 — Bound the retry loop
- Preconditions: \`enqueue\` currently retries forever.
- Files: \`src/queue.ts\`, \`src/queue.test.ts\`
- Symbols: \`enqueue\`, \`QUEUE_MAX_RETRIES\`
- Change: cap the retry loop at \`QUEUE_MAX_RETRIES\`.
- Preserved behaviour: a first-attempt success still returns immediately.
- Negative cases: a permanent failure stops after three attempts; a zero cap never retries.
- Tests: \`src/queue.test.ts\`
- Commands: \`npm test\`
- Expected output: the retry suite passes.
- Done when: \`npm test\` reports the new suite green.
- Deviation stop: stop if the cap must become dynamic.

### Step 2 — Record the cap in the changelog
- Preconditions: step 1 is complete.
- Files: \`src/legacy.ts\`
- Change: note the cap.
- Preserved behaviour: no runtime behaviour changes.
- Negative cases: none.
- Tests: \`src/queue.test.ts\`
- Commands: \`npm test\`
- Expected output: unchanged suite result.
- Done when: the note is present.
- Deviation stop: stop on any runtime change.

## Acceptance checks
- \`npm test\` proves the retry cap.
- Manual: read the changelog entry.

## Commands
- \`npm test\`

## Failure and deviation rules
Stop and report on any failing check.

## Stop condition
Stop when the PR is open.
`;

const codes = (plan: ParsedPlan, options?: Parameters<typeof validatePlan>[1]): PlanFindingCode[] =>
  validatePlan(plan, options).findings.map((finding) => finding.code);

describe("parseAtxSections / extractAtxSection", () => {
  it("retains nested lower-level headings and stops at the same level", () => {
    const markdown = "# Top\n## A\nalpha\n### A1\nnested\n## B\nbeta\n";
    expect(extractAtxSection(markdown, "A")).toBe("alpha\n### A1\nnested");
    expect(extractAtxSection(markdown, "B")).toBe("beta");
  });

  it("matches case-insensitively, strips closing hashes and returns null when empty", () => {
    const markdown = "## Stop Condition ##\n\n## Next\nx\n";
    expect(parseAtxSections(markdown)[0].title).toBe("Stop Condition");
    expect(extractAtxSection(markdown, "stop condition")).toBeNull();
    expect(extractAtxSection(markdown, "absent")).toBeNull();
  });
});

describe("parsePlan", () => {
  const plan = parsePlan(GOOD_PLAN);

  it("reads the Expected files table without its header or separator rows", () => {
    expect(plan.expectedFiles.map((entry) => entry.path)).toEqual([
      "src/queue.ts",
      "src/queue.test.ts",
      "src/legacy.ts",
    ]);
    expect(plan.expectedFiles[0]).toMatchObject({ action: "Modify", responsibility: "retry loop" });
  });

  it("reads the Do not modify paths and the Stop condition", () => {
    expect(plan.doNotModify).toEqual(["src/vendor/bundle.js"]);
    expect(plan.stopCondition).toBe("Stop when the PR is open.");
  });

  it("reads the evidence pins from Starting state", () => {
    expect(plan.evidencePins).toEqual([
      { path: "research/research.md", version: "aaaaaaaaaaaaaaaa" },
      { path: "files/files.md", version: "bbbbbbbbbbbbbbbb" },
    ]);
  });

  it("reads structured steps with their labelled fields", () => {
    expect(plan.steps).toHaveLength(2);
    const [first] = plan.steps;
    expect(first).toMatchObject({ index: 1, id: "step-1", title: "Bound the retry loop", structured: true });
    expect(first.files).toEqual(["src/queue.ts", "src/queue.test.ts"]);
    expect(first.symbols).toEqual(["enqueue", "QUEUE_MAX_RETRIES"]);
    expect(first.tests).toEqual(["src/queue.test.ts"]);
    expect(first.commands).toEqual(["npm test"]);
    expect(first.negativeCases).toEqual([
      "a permanent failure stops after three attempts",
      "a zero cap never retries.",
    ]);
    expect(first.fields.done).toBe("`npm test` reports the new suite green.");
  });

  it("reads a legacy numbered list as title-only steps", () => {
    const legacy = parsePlan("## Ordered steps\n1. Do the first thing.\n2. Do the second thing.\n");
    expect(legacy.steps.map((step) => [step.index, step.title, step.structured])).toEqual([
      [1, "Do the first thing.", false],
      [2, "Do the second thing.", false],
    ]);
  });

  it("ignores fenced code blocks when reading steps", () => {
    const fenced = parsePlan("## Ordered steps\n\n```\n### Step 9 — not a step\n```\n\n### Step 1 — real\n- Change: yes\n");
    expect(fenced.steps.map((step) => step.title)).toEqual(["real"]);
  });
});

describe("validatePlan without a selected step", () => {
  it("never reports a blocker, even for a plan with nothing in it", () => {
    const empty = validatePlan(parsePlan("# Plan\n"));
    expect(empty.ok).toBe(true);
    expect(empty.blockers).toBe(0);
    expect(empty.advisories).toBe(empty.findings.length);
    expect(empty.findings.some((finding) => finding.code === "PLAN_SECTION_MISSING")).toBe(true);
  });

  it("reports the good plan as clean apart from nothing at all", () => {
    const report = validatePlan(parsePlan(GOOD_PLAN));
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

describe("unresolved vague language", () => {
  const withRequiredChanges = (body: string) =>
    parsePlan(`## Required changes\n${body}\n\n## Ordered steps\n\n### Step 1 — s\n- Change: x\n`);

  it("flags a vague sentence that resolves nothing", () => {
    const findings = validatePlan(withRequiredChanges("Investigate the caching layer and decide what to do.")).findings;
    const vague = findings.filter((finding) => finding.code === "PLAN_VAGUE_INSTRUCTION");
    expect(vague).toHaveLength(1);
    expect(vague[0].severity).toBe("advisory");
    expect(vague[0].section).toBe("Required changes");
  });

  it("does not flag a sentence that names the exact file, symbol, error or mapping", () => {
    for (const sentence of [
      "Decide the cap in `src/queue.ts`.",
      "Determine the retry count in src/queue.ts and record it.",
      "Choose the refusal code: QUEUE_LIMIT_REACHED.",
      "Determine the branch → always `main`.",
    ]) {
      const vague = validatePlan(withRequiredChanges(sentence)).findings.filter(
        (finding) => finding.code === "PLAN_VAGUE_INSTRUCTION",
      );
      expect(vague, sentence).toEqual([]);
    }
  });

  it("stays advisory even when a step is selected", () => {
    const plan = parsePlan(GOOD_PLAN.replace("Add a bounded retry to `enqueue` in `src/queue.ts`.", "Investigate the queue."));
    const vague = validatePlan(plan, { step: 1 }).findings.filter(
      (finding) => finding.code === "PLAN_VAGUE_INSTRUCTION",
    );
    expect(vague).toHaveLength(1);
    expect(vague[0].severity).toBe("advisory");
    expect(validatePlan(plan, { step: 1 }).ok).toBe(true);
  });
});

describe("risk-sensitive evidence", () => {
  it("names an uncovered risk category the plan actually touches", () => {
    const plan = parsePlan(
      "## Starting state\nNothing verified yet.\n\n" +
        "## Required changes\nRewrite the migration so the board format bump lands.\n",
    );
    const risk = validatePlan(plan).findings.filter((finding) => finding.code === "PLAN_RISK_EVIDENCE_MISSING");
    expect(risk.map((finding) => finding.detail)).toContain("migration");
    expect(risk.every((finding) => finding.severity === "advisory")).toBe(true);
  });

  it("accepts a category the plan cites evidence for", () => {
    const plan = parsePlan(
      "## Starting state\nMigration behaviour verified in `packages/core/src/migrate.ts:40`.\n\n" +
        "## Required changes\nRewrite the migration.\n",
    );
    expect(codes(plan)).not.toContain("PLAN_RISK_EVIDENCE_MISSING");
  });

  it("invents no research debt for a plan that touches no risk category", () => {
    const trivial = parsePlan(
      "## Required changes\nFix the typo in the welcome banner.\n\n" +
        "## Expected files\n| Action | Path | Responsibility |\n|---|---|---|\n| Modify | `src/banner.ts` | wording |\n",
    );
    expect(codes(trivial)).not.toContain("PLAN_RISK_EVIDENCE_MISSING");
  });
});

describe("validatePlan with a selected step", () => {
  it("compiles cleanly for the good plan", () => {
    const report = validatePlan(parsePlan(GOOD_PLAN), { step: 1 });
    expect(report.ok).toBe(true);
    expect(report.blockers).toBe(0);
  });

  it("blocks when the plan has no ordered steps", () => {
    const report = validatePlan(parsePlan(GOOD_PLAN.replace(/## Ordered steps[\s\S]*?## Acceptance checks/, "## Acceptance checks")), { step: 1 });
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.code === "PLAN_STEPS_MISSING" && f.severity === "blocker")).toBe(true);
  });

  it("blocks an out-of-range step without inventing per-step findings", () => {
    const report = validatePlan(parsePlan(GOOD_PLAN), { step: 9 });
    expect(report.ok).toBe(false);
    expect(report.findings.filter((f) => f.code === "PLAN_STEP_NOT_FOUND")).toHaveLength(1);
    expect(codes(parsePlan(GOOD_PLAN), { step: 9 })).not.toContain("PLAN_STEP_FIELD_MISSING");
  });

  it("blocks an unstructured step", () => {
    const report = validatePlan(parsePlan("## Ordered steps\n1. Do it all.\n"), { step: 1 });
    expect(report.findings.some((f) => f.code === "PLAN_STEP_UNSTRUCTURED" && f.severity === "blocker")).toBe(true);
  });

  it("blocks a missing required field only on the selected step", () => {
    const plan = parsePlan(GOOD_PLAN.replace("- Tests: `src/queue.test.ts`\n- Commands: `npm test`\n- Expected output: unchanged suite result.", "- Commands: `npm test`"));
    const forStepTwo = validatePlan(plan, { step: 2 }).findings.filter((f) => f.code === "PLAN_STEP_FIELD_MISSING" && f.severity === "blocker");
    expect(forStepTwo.map((f) => f.detail)).toContain("tests");
    const forStepOne = validatePlan(plan, { step: 1 }).findings.filter((f) => f.code === "PLAN_STEP_FIELD_MISSING" && f.severity === "blocker");
    expect(forStepOne).toEqual([]);
  });

  it("blocks a step file the Expected files table never declares", () => {
    const plan = parsePlan(GOOD_PLAN.replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/queue.ts`, `src/secret.ts`"));
    const report = validatePlan(plan, { step: 1 });
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.code === "PLAN_STEP_FILE_UNDECLARED" && f.detail === "src/secret.ts")).toBe(true);
  });

  it("blocks a step file the plan forbids", () => {
    const plan = parsePlan(
      GOOD_PLAN.replace("| Modify | `src/legacy.ts` | untouched by step 1 |", "| Modify | `src/vendor/bundle.js` | generated |")
        .replace("- Files: `src/legacy.ts`", "- Files: `src/vendor/bundle.js`"),
    );
    const report = validatePlan(plan, { step: 2 });
    expect(report.findings.some((f) => f.code === "PLAN_STEP_FILE_FORBIDDEN" && f.severity === "blocker")).toBe(true);
  });

  it("blocks a step file matched by a supported forbidden glob", () => {
    const plan = parsePlan(
      GOOD_PLAN.replace("`src/vendor/bundle.js`", "`src/vendor/**`")
        .replace("| Modify | `src/legacy.ts` | untouched by step 1 |", "| Modify | `src/vendor/generated/file.ts` | generated |")
        .replace("- Files: `src/legacy.ts`", "- Files: `src/vendor/generated/file.ts`"),
    );
    expect(validatePlan(plan, { step: 2 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_FORBIDDEN")).toBe(true);
  });

  it("lets a broader Expected-files glob cover a literal step path", () => {
    const plan = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", ""),
    );
    expect(validatePlan(plan, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);
  });

  it("proves narrower patterned step authority inside supported Expected-files globs", () => {
    const segment = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/*.ts` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/a*.ts`"),
    );
    expect(validatePlan(segment, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);

    const recursive = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**/*.ts` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/**/a*.ts`"),
    );
    expect(validatePlan(recursive, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);

    const trailingRecursive = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `a/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `a/**/b`"),
    );
    expect(validatePlan(trailingRecursive, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);

    const consecutiveRecursive = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `a/**/b` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `a/**/**/b`"),
    );
    expect(validatePlan(consecutiveRecursive, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);

    for (const [authority, requested] of [
      ["src/*/**", "src/**/file.ts"],
      ["a/*/**/b", "a/**/x/b"],
      ["a/*/**", "a/**/x"],
      ["*/**", "**"],
      ["a/**/*", "a/*/**"],
    ]) {
      const crossSegment = parsePlan(
        GOOD_PLAN
          .replace("| Modify | `src/queue.ts` | retry loop |", `| Modify | \`${authority}\` | retry sources |`)
          .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
          .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", `- Files: \`${requested}\``),
      );
      expect(validatePlan(crossSegment, { step: 1 }).findings.some(
        (finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED",
      )).toBe(false);
    }
  });

  it("rejects a requested glob language that can escape its Expected-files authority", () => {
    for (const [authority, requested] of [
      ["src/a*.ts", "src/*.ts"],
      ["src/*/**", "src/**"],
      ["src/*/**/file.ts", "src/**/file.ts"],
      ["a/*/**/b", "a/**/b"],
      ["a/**/x/b", "a/*/**/b"],
    ]) {
      const plan = parsePlan(
        GOOD_PLAN
          .replace("| Modify | `src/queue.ts` | retry loop |", `| Modify | \`${authority}\` | retry sources |`)
          .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
          .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", `- Files: \`${requested}\``),
      );
      expect(validatePlan(plan, { step: 1 }).findings.some(
        (finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED",
      )).toBe(true);
    }
  });

  it("authorizes canonical-equal long globs and reports non-identical proof-budget exhaustion explicitly", () => {
    const longPath = Array.from({ length: 14 }, () => "a*".repeat(100)).join("/");
    const planFor = (requested: string): ParsedPlan => parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", `| Modify | \`${longPath}\` | retry sources |`)
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- `src/vendor/bundle.js` — generated output.", "- No generated paths are in scope.")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", `- Files: \`${requested}\``),
    );

    const equal = validatePlan(planFor(longPath), { step: 1 });
    expect(equal.findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);
    expect(equal.findings.some((finding) => finding.code === "PLAN_GLOB_COMPLEXITY")).toBe(false);

    const exhausted = validatePlan(planFor(`${longPath}b`), { step: 1 });
    expect(exhausted.findings.some(
      (finding) => finding.code === "PLAN_GLOB_COMPLEXITY" && finding.severity === "blocker",
    )).toBe(true);
    expect(exhausted.findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(false);
  });

  it("does not let narrow Expected-files literals authorize a broader step glob", () => {
    const plan = parsePlan(GOOD_PLAN.replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/*.ts`"));
    expect(validatePlan(plan, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_UNDECLARED")).toBe(true);
  });

  it("fails closed when patterned step and forbidden declarations intersect without containing each other", () => {
    const plan = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("`src/vendor/bundle.js`", "`src/a/*.ts`")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/*/x.ts`"),
    );
    expect(validatePlan(plan, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_FORBIDDEN")).toBe(true);
  });

  it("does not falsely intersect disjoint segment-star languages", () => {
    const plan = parsePlan(
      GOOD_PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("`src/vendor/bundle.js`", "`src/b*.js`")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/a*.ts`"),
    );
    expect(validatePlan(plan, { step: 1 }).findings.some((finding) => finding.code === "PLAN_STEP_FILE_FORBIDDEN")).toBe(false);
  });

  it("blocks a plan with no usable acceptance check", () => {
    const plan = parsePlan(GOOD_PLAN.replace("- `npm test` proves the retry cap.\n- Manual: read the changelog entry.", "- It should work well."));
    expect(validatePlan(plan, { step: 1 }).findings.some((f) => f.code === "PLAN_ACCEPTANCE_MISSING")).toBe(true);
    expect(validatePlan(plan).ok).toBe(true);
  });

  it("blocks a missing stop condition and an empty Expected files table", () => {
    const plan = parsePlan("## Ordered steps\n\n### Step 1 — s\n- Files: `a.ts`\n- Change: x\n- Tests: `a.test.ts`\n- Commands: `npm test`\n- Done when: green\n");
    const report = validatePlan(plan, { step: 1 });
    expect(codes(plan, { step: 1 })).toContain("PLAN_STOP_CONDITION_MISSING");
    expect(codes(plan, { step: 1 })).toContain("PLAN_ALLOWED_FILES_MISSING");
    expect(report.ok).toBe(false);
  });
});

describe("evidence currency", () => {
  const live = [
    { path: "research/research.md", version: "aaaaaaaaaaaaaaaa" },
    { path: "files/files.md", version: "bbbbbbbbbbbbbbbb" },
  ];

  it("accepts pins that match the live versions", () => {
    expect(validatePlan(parsePlan(GOOD_PLAN), { step: 1, liveEvidence: live, requireEvidencePin: true }).ok).toBe(true);
  });

  it("blocks a pin the live document has moved past", () => {
    const moved = [{ path: "research/research.md", version: "cccccccccccccccc" }, live[1]];
    const report = validatePlan(parsePlan(GOOD_PLAN), { step: 1, liveEvidence: moved });
    expect(report.ok).toBe(false);
    expect(report.findings.some((f) => f.code === "PLAN_EVIDENCE_STALE" && f.detail === "research/research.md")).toBe(true);
  });

  it("blocks an unknown pin when compiling a selected step", () => {
    const report = validatePlan(parsePlan(GOOD_PLAN), { step: 1, liveEvidence: [live[0]] });
    const unknown = report.findings.filter((f) => f.code === "PLAN_EVIDENCE_UNKNOWN");
    expect(unknown).toHaveLength(1);
    expect(unknown[0].severity).toBe("blocker");
    expect(report.ok).toBe(false);
  });

  it("requires a matching pin for every current research/files document", () => {
    const onePin = parsePlan(GOOD_PLAN.replace(/, `files\/files\.md`@`bbbbbbbbbbbbbbbb`/, ""));
    const report = validatePlan(onePin, { step: 1, liveEvidence: live, requireEvidencePin: true });
    expect(report.findings.some((finding) => finding.code === "PLAN_EVIDENCE_UNRECORDED" && finding.detail === "files/files.md")).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("blocks an evidence-bearing ticket whose plan pins nothing", () => {
    const plan = parsePlan(GOOD_PLAN.replace(/Evidence: .*\n/, ""));
    expect(validatePlan(plan, { step: 1, liveEvidence: live, requireEvidencePin: true }).ok).toBe(false);
    expect(validatePlan(plan, { step: 1, liveEvidence: live, requireEvidencePin: false }).ok).toBe(true);
  });

  it("says nothing about evidence when no live evidence is supplied", () => {
    expect(codes(parsePlan(GOOD_PLAN), { step: 1 })).not.toContain("PLAN_EVIDENCE_UNRECORDED");
  });
});

describe("repository-relative plan paths", () => {
  it.each(["../x.ts", "src/../../x.ts", "/etc/hosts", "C:\\temp\\x.ts", "\\\\server\\share\\x.ts", "file://x", "https://x", "mailto:x", "src/name:alt", "", ".", "a\0b", "src/[ab].ts", "src/a**b.ts"])(
    "rejects unsupported or escaping authority %j",
    (value) => expect(parsePlanPath(value, { allowPattern: true }).ok).toBe(false),
  );

  it("normalizes a single leading dot and Windows separators", () => {
    expect(parsePlanPath("./src\\queue.ts")).toEqual({ ok: true, path: "src/queue.ts", pattern: false });
  });

  it("preserves exact observed whitespace, Unicode and newline bytes without declaration normalization", () => {
    const observed = " src/雪\nqueue.ts ";
    expect(parsePlanPath(observed, { observed: true })).toEqual({ ok: true, path: observed, pattern: false });
    expect(parsePlanPath("./src/queue.ts", { observed: true }).ok).toBe(false);
    expect(parsePlanPath("src\\queue.ts", { observed: true }).ok).toBe(false);
    expect(planPathMatches("src/*.ts", "src/雪\nqueue.ts")).toBe(true);
  });

  it("matches literal, segment-local star and cross-segment double star without regex leakage", () => {
    expect(planPathMatches("apps/gui/**", "apps/gui/src/main.ts")).toBe(true);
    expect(planPathMatches("src/*.ts", "src/a.ts")).toBe(true);
    expect(planPathMatches("src/*.ts", "src/nested/a.ts")).toBe(false);
    expect(planPathMatches("src/a+b.ts", "src/a+b.ts")).toBe(true);
    expect(planPathMatches("src/a+b.ts", "src/aaab.ts")).toBe(false);
    expect(planPathMatches("src/foo.ts", "src/foo.ts.old")).toBe(false);
  });

  it("retains invalid plan authority as a typed blocking finding", () => {
    const invalid = parsePlan(GOOD_PLAN.replace("`src/queue.ts`, `src/queue.test.ts`", "`../escape.ts`, `src/queue.test.ts`"));
    const report = validatePlan(invalid, { step: 1 });
    expect(report.findings.some((finding) => finding.code === "PLAN_PATH_INVALID" && finding.severity === "blocker")).toBe(true);
  });
});
