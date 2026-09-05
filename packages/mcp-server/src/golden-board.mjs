// The golden-board evaluation runner (CORE-119, FRD-035).
//
// One hermetic run of every FRD-035 scenario class against disposable
// `kanmer-golden-*` boards, with a machine-readable transcript and a terminal
// result per scenario. It is a `VERIFY_STEPS` entry (`npm run golden`), which
// is why AGENTS.md §"Extend VERIFY_STEPS, never a third verification pyramid"
// decides the wiring: one array edit reaches `pr.yml verify`, every push to
// main, `release.yml release-verify` and `npm run release`.
//
// Three rules hold this file together and are not negotiable:
//
//  1. **Fail closed on coverage.** `coverageGaps(SCENARIOS, FRD_035_CLASSES)`
//     must be empty for a full run; a gap is a startup refusal (exit 2), never
//     a silent pass. That is what makes AC1 mechanical rather than a promise.
//  2. **Never fabricate a pass.** A capability with no offline source is
//     recorded `simulated` (with the injected evidence printed) or
//     `unavailable`. `unavailable` in the rail is exit 1. There is no `skip`.
//  3. **Disposable boards only.** Every root is a fresh mkdtemp under the temp
//     volume; `KANMER_ROOT` is deleted from every child env; `--root` is
//     rejected outright. ADR-0021, enforced (GB-00 proves all three).
//
// Exit codes follow `scripts/verify-release-assets.mjs`: 0 = pass, 1 = a
// scenario failed or a required capability was unavailable, 2 = the run could
// not start. `process.exitCode` is set and the loop is allowed to drain rather
// than calling `process.exit()` (AGENTS.md §8 gotcha 20).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KanmerStore,
  assessReceiptSet,
  candidateIdentity,
  candidateRefFor,
  deliveryTargets,
  evaluateMergeGate,
  mergeGateOk,
  parseReviewAttestation,
  resolveDelivery,
  RELEASE_FROZEN_FIELDS,
} from "../../core/dist/index.js";
import { reconcileTicket } from "../dist/reconciliation.js";
import {
  Recorder,
  assertDisposable,
  call,
  childEnv,
  digest,
  fileDigests,
  initialize,
  newCounters,
  startServer,
  tool,
} from "./golden-harness.mjs";
import { expireClaim, freshFixture, repoFixture, seededFixture, ticketFile } from "./golden-fixtures.mjs";
import { PROMOTION_STEPS, RECORDED_TRANSCRIPTS, evaluatePromotion } from "../../../scripts/golden-promotion.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "..", "..", "..");

/** The default wall-clock budget, sized from the measured Windows costs. */
export const DEFAULT_BUDGET_MS = 300_000;

/**
 * The twelve scenario classes named in the FRD-035 Behaviour paragraph. The
 * list is transcribed, not invented: a class with no scenario is a startup
 * refusal, so this array and `SCENARIOS` cannot drift apart silently.
 */
export const FRD_035_CLASSES = Object.freeze([
  "weak-controller-clears-prepared-work",
  "competing-controllers",
  "expired-lease-recovery-with-dirty-work",
  "batch-execution",
  "capture-exclusion-and-promotion",
  "main-only-and-candidate-delivery",
  "independent-exact-head-review",
  "remediation-delta-review-and-replan",
  "reconciliation-of-invalid-stages",
  "superseded-release-attempts",
  "multi-project-isolation",
  "stable-controlled-candidate-promotion-rollback",
]);

/** Every class with no scenario. Empty is the only acceptable full-run value. */
export function coverageGaps(scenarios, classes = FRD_035_CLASSES) {
  const covered = new Set();
  for (const scenario of scenarios) for (const id of scenario.classes ?? []) covered.add(id);
  return classes.filter((id) => !covered.has(id));
}

/** Every declared class a scenario names that FRD-035 does not. */
export function unknownClasses(scenarios, classes = FRD_035_CLASSES) {
  const known = new Set(classes);
  const bad = [];
  for (const scenario of scenarios) {
    for (const id of scenario.classes ?? []) if (!known.has(id)) bad.push(`${scenario.id}:${id}`);
  }
  return bad;
}

export class UsageError extends Error {}

const FLAGS_WITH_VALUE = new Set(["--out", "--only"]);

/**
 * Strict flag parsing, the `check-pr.mjs` / `verify-release-assets.mjs` habit:
 * unknown and duplicated flags are refused, and `--root` is refused outright
 * because a golden board root is never operator-supplied (ADR-0021).
 */
export function parseArgs(argv) {
  const options = { out: null, only: null };
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const [name, inlineValue] = arg.startsWith("--") && arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (name === "--root" || name.startsWith("--root")) {
      throw new UsageError("--root is refused: golden boards are disposable mkdtemp roots only (ADR-0021).");
    }
    if (!FLAGS_WITH_VALUE.has(name)) throw new UsageError(`unknown flag "${arg}"`);
    if (seen.has(name)) throw new UsageError(`duplicate flag "${name}"`);
    seen.add(name);
    const value = inlineValue ?? argv[++index];
    if (value === undefined || value.startsWith("--")) throw new UsageError(`${name} requires a value`);
    if (name === "--out") options.out = value;
    if (name === "--only") {
      options.only = value.split(",").map((id) => id.trim()).filter(Boolean);
      if (options.only.length === 0) throw new UsageError("--only requires at least one scenario id");
    }
  }
  return options;
}

export function usage() {
  return [
    "usage: node packages/mcp-server/src/golden-board.mjs [--only GB-00,GB-01] [--out <path>]",
    "",
    "  --only  run only these scenario ids (a narrowed diagnostic run)",
    "  --out   write the transcript JSON here (default dist/golden/golden-<stamp>.json)",
    "",
    "  KANMER_GOLDEN_BUDGET_MS  wall-clock budget, default 300000",
    "  KANMER_SERVER            server entry to drive (default packages/mcp-server/dist/index.js)",
    "",
    "  exit 0 = every scenario passed; 1 = a scenario failed or a capability was",
    "  unavailable; 2 = the run could not start. --root is refused (ADR-0021).",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Shared scenario helpers
// ---------------------------------------------------------------------------

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);

function samePath(left, right) {
  const fold = (value) => (process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value));
  return fold(left) === fold(right);
}

function storeFor(ctx) {
  return new KanmerStore(ctx.fixture.boardRoot, { actor: "golden-library" });
}

/** A valid review attestation document, parameterised for the amendment tests. */
function attestation({ pr, headSha, verdict, findings = [], planHash = "plan-v1", ticketUpdated }) {
  const body = findings.length
    ? findings
      .map((finding) => {
        const lines = [
          `  - id: "${finding.id}"`,
          `    severity: ${finding.severity}`,
          `    summary: "${finding.summary}"`,
          `    disposition: ${finding.disposition}`,
        ];
        if (finding.reason) lines.push(`    reason: "${finding.reason}"`);
        if (finding.ticket) lines.push(`    ticket: "${finding.ticket}"`);
        return lines.join("\n");
      })
      .join("\n")
    : "";
  return [
    "---",
    "kind: review-attestation",
    `pr: "${pr}"`,
    `head_sha: "${headSha}"`,
    `verdict: ${verdict}`,
    'reviewer: "golden-reviewer"',
    "independent: true",
    `plan_hash: "${planHash}"`,
    `ticket_updated: "${ticketUpdated}"`,
    findings.length ? "findings:" : "findings: []",
    ...(findings.length ? [body] : []),
    "---",
    "",
    "Golden attestation body.",
    "",
  ].join("\n");
}

/**
 * A valid `proof-record/2` document (CORE-129). The attempt ledger is derived
 * from the verdict rather than left empty: schema 2 binds the top-level result
 * to the final authoritative attempt, so a record with `attempts: []` is not a
 * record this board's gate or reconciliation will act on.
 */
function proofRecord({ result, mergedSha, failureClass }) {
  const attempt =
    result === "PASS"
      ? [
          '  - attempted_at: "2026-09-04T00:00:00.000Z"',
          '    command: "npm run verify"',
          '    cwd: "."',
          "    exit_code: 0",
          "    result: PASS",
          "    authority: authoritative",
          '    summary: "the golden rail passed"',
        ]
      : [
          '  - attempted_at: "2026-09-04T00:00:00.000Z"',
          '    command: "npm run verify"',
          '    cwd: "."',
          "    exit_code: 1",
          "    result: FAIL",
          "    authority: authoritative",
          `    failure_class: ${failureClass ?? "transient"}`,
          '    summary: "the golden rail failed"',
        ];
  return [
    "---",
    "kind: proof-record",
    "schema: 2",
    `merged_sha: "${mergedSha}"`,
    'environment: "golden disposable board"',
    'verified_at: "2026-09-04T00:00:00.000Z"',
    `result: ${result}`,
    ...(result === "PASS" ? [] : [`failure_class: ${failureClass ?? "transient"}`]),
    "attempts:",
    ...attempt,
    "---",
    "",
  ].join("\n");
}

/** A fake `gh`/`git` runner: every answer is injected, and printed as evidence. */
function injectedRun(fixtures) {
  return async (command, args) => {
    if (command === "gh") {
      if (args[0] === "repo") return { stdout: JSON.stringify({ nameWithOwner: "collisionengineers/kanmer" }) };
      if (args[0] === "pr" && args[1] === "view") {
        const response = fixtures.prs[args[2]];
        if (!response) throw new Error(`no injected PR fixture for ${args[2]}`);
        return { stdout: JSON.stringify(response) };
      }
      if (args[0] === "pr" && args[1] === "checks") return { stdout: JSON.stringify(fixtures.checks) };
    }
    if (command === "git") {
      if (args.includes("status")) return { stdout: "" };
      if (args.includes("symbolic-ref")) return { stdout: `${fixtures.branch ?? "main"}\n` };
    }
    throw new Error(`unexpected injected command: ${command} ${args.join(" ")}`);
  };
}

const injectedCommonDir = (root) => async () => ({ ok: true, path: path.join(root, ".git") });

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const SCENARIOS = [
  {
    id: "GB-00",
    title: "A candidate can never silently become the live board authority",
    classes: [],
    frd: ["FRD-035"],
    ac: ["FRD-035 AC2", "ADR-0021"],
    fixture: "fresh",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const refuses = (value) => {
        try {
          assertDisposable(value);
          return false;
        } catch {
          return true;
        }
      };
      rec.check("assertDisposable refuses the repository root", refuses(repositoryRoot), repositoryRoot);
      rec.check(
        "assertDisposable refuses the Kanmer board worktree",
        refuses(path.join(repositoryRoot, ".worktrees", "kanmer")),
      );
      rec.check(
        "assertDisposable refuses a path that only contains the temp directory as a substring",
        refuses(path.join(`${os.tmpdir()}-evil`, "kanmer-golden-nope")),
        `${os.tmpdir()}-evil`,
      );
      rec.check(
        "assertDisposable refuses a temp path without the kanmer-golden- marker",
        refuses(path.join(os.tmpdir(), "kanmer-smoke-elsewhere")),
      );
      rec.check("assertDisposable accepts the fixture root", assertDisposable(ctx.fixture.boardRoot) !== null);

      const env = childEnv();
      rec.check("the child environment carries no KANMER_ROOT", !("KANMER_ROOT" in env));
      rec.check("the child environment carries no KANMER_INIT", !("KANMER_INIT" in env));

      let rootRejected = false;
      try {
        parseArgs(["--root", ctx.fixture.boardRoot]);
      } catch (error) {
        rootRejected = error instanceof UsageError;
      }
      rec.check("the runner refuses a --root flag outright", rootRejected);

      let unknownRejected = false;
      try {
        parseArgs(["--bogus"]);
      } catch (error) {
        unknownRejected = error instanceof UsageError;
      }
      rec.check("the runner refuses an unknown flag", unknownRejected);

      const status = await tool(ctx.server, rec, "get_status");
      rec.check(
        "get_status.projectRoot is the disposable fixture and rootSource is flag",
        status.ok && samePath(status.payload.projectRoot, ctx.fixture.boardRoot) && status.payload.rootSource === "flag",
        `${status.payload?.projectRoot} / ${status.payload?.rootSource}`,
      );
    },
  },

  {
    id: "GB-01",
    title: "Logical project identity is allocated exactly once, on the first write",
    classes: ["multi-project-isolation"],
    frd: ["FRD-029"],
    ac: ["FRD-029 AC1", "FRD-029 AC2"],
    fixture: "fresh",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const projectFile = path.join(ctx.fixture.boardRoot, ".kanmer", "project.json");
      const before = await tool(ctx.server, rec, "get_status");
      rec.check(
        "a board with no project.json reports an unassigned identity and format 3",
        before.ok && before.payload.project.identity === "unassigned" && before.payload.format === 3 && !fs.existsSync(projectFile),
        `${before.payload?.project?.identity} / format ${before.payload?.format}`,
      );

      const created = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "Golden identity allocation" });
      rec.check("the first write succeeds", created.ok, created.message);
      rec.check("the first write allocated .kanmer/project.json", fs.existsSync(projectFile));
      const allocated = fs.readFileSync(projectFile);

      const after = await tool(ctx.server, rec, "get_status");
      rec.check(
        "get_status now reports a logical project_id, board_id and legacy fingerprint",
        after.ok &&
          after.payload.project.identity === "logical" &&
          typeof after.payload.project.project_id === "string" &&
          after.payload.project.project_id.length > 0 &&
          typeof after.payload.project.board_id === "string" &&
          typeof after.payload.project.fingerprint === "string" &&
          after.payload.format === 3,
        `${after.payload?.project?.project_id} / ${after.payload?.project?.board_id}`,
      );

      const second = await tool(ctx.server, rec, "update_item", { id: created.payload.id, title: "Golden identity allocation (again)" });
      rec.check("a second write succeeds", second.ok, second.message);
      rec.check(
        "project.json is byte-identical after the second write — identity is allocated once",
        Buffer.compare(allocated, fs.readFileSync(projectFile)) === 0,
      );
      ctx.shared.freshProjectId = after.payload?.project?.project_id ?? null;
    },
  },

  {
    id: "GB-02",
    title: "A legacy board with no project.json is read, then migrated on its first write, without moving a byte of existing work",
    classes: ["multi-project-isolation"],
    frd: ["FRD-029"],
    ac: ["FRD-029 AC1"],
    fixture: "legacy",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const root = ctx.fixture.boardRoot;
      const projectFile = path.join(root, ".kanmer", "project.json");
      const before = await tool(ctx.server, rec, "get_status");
      rec.check(
        "a legacy board reads without error and reports an unassigned identity",
        before.ok && before.payload.exists === true && before.payload.project.identity === "unassigned" && !fs.existsSync(projectFile),
        String(before.payload?.project?.identity),
      );
      const listed = await tool(ctx.server, rec, "list_items", { type: "ticket" });
      rec.check("its existing tickets are listed", listed.ok && Array.isArray(listed.payload) && listed.payload.length >= 6, `${listed.payload?.length} tickets`);

      const areasRoot = path.join(root, ".kanmer", "areas");
      const beforeBytes = await fileDigests(areasRoot);

      const created = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "Golden legacy migration write" });
      rec.check("the first write succeeds", created.ok, created.message);
      rec.check("the first write allocated project.json", fs.existsSync(projectFile));

      const afterBytes = await fileDigests(areasRoot);
      const moved = [...beforeBytes.entries()].filter(([file, sha]) => afterBytes.get(file) !== sha);
      rec.check(
        "every pre-existing ticket file is byte-identical after the identity migration",
        moved.length === 0,
        moved.map(([file]) => file).join(", "),
      );
    },
  },

  {
    id: "GB-03",
    title: "A write naming the wrong project is refused before anything mutates",
    classes: ["multi-project-isolation"],
    frd: ["FRD-029"],
    ac: ["FRD-029 AC2"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const status = await tool(ctx.server, rec, "get_status");
      rec.check("the server advertises expectedProject compatibility", status.ok && status.payload.compat.expectedProject === "optional");
      const before = await digest(path.join(ctx.fixture.boardRoot, ".kanmer"));
      const refused = await tool(ctx.server, rec, "update_item", {
        id: ctx.fixture.meta.backlog,
        title: "this must never be written",
        expected_project: "kanmer-proj-v1:0000000000000000",
      });
      rec.bump("wrongProjectAttempts");
      rec.check(
        "a wrong expected_project is refused with the WRONG_PROJECT code",
        !refused.ok && refused.code === "WRONG_PROJECT",
        `${refused.code}: ${refused.message.slice(0, 120)}`,
      );
      const after = await digest(path.join(ctx.fixture.boardRoot, ".kanmer"));
      rec.check("the whole board digest is unchanged across the refusal", before === after, `${before.slice(0, 12)} vs ${after.slice(0, 12)}`);
      const accepted = await tool(ctx.server, rec, "update_item", {
        id: ctx.fixture.meta.backlog,
        title: "Golden backlog ticket (correct project)",
        expected_project: status.payload.project.project_id,
      });
      rec.check("the same write with the correct project_id succeeds", accepted.ok, accepted.message);
    },
  },

  {
    id: "GB-04",
    title: "A stale document-inclusive revision is refused; the current one succeeds",
    classes: ["multi-project-isolation"],
    frd: ["FRD-029"],
    ac: ["FRD-029 AC3"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const id = ctx.fixture.meta.preparing;
      const read = await tool(ctx.server, rec, "get_item", { id });
      rec.check("get_item carries a revision", read.ok && typeof read.payload.revision === "string", String(read.payload?.revision));
      const stale = "rev1:0000000000000000";
      const refused = await tool(ctx.server, rec, "update_item", { id, title: "stale write", expected_revision: stale });
      rec.check(
        "a stale expected_revision is refused with REVISION_CONFLICT",
        !refused.ok && refused.code === "REVISION_CONFLICT",
        `${refused.code}: ${refused.message.slice(0, 120)}`,
      );
      const unchanged = await tool(ctx.server, rec, "get_item", { id });
      rec.check(
        "the item is unchanged after the refusal",
        unchanged.ok && unchanged.payload.title === read.payload.title && unchanged.payload.revision === read.payload.revision,
      );
      const accepted = await tool(ctx.server, rec, "update_item", {
        id,
        title: "Golden preparing ticket (revised)",
        expected_revision: read.payload.revision,
      });
      rec.check("a write carrying the current revision succeeds", accepted.ok, accepted.message);
      const next = await tool(ctx.server, rec, "get_item", { id });
      rec.check("the revision moved", next.ok && next.payload.revision !== read.payload.revision, String(next.payload?.revision));
      rec.bump("corrections");
    },
  },

  {
    id: "GB-05",
    title: "Two named endpoints are observed without either process rebinding, and a cross-project mutation is refused structurally",
    classes: ["multi-project-isolation", "competing-controllers"],
    frd: ["FRD-029"],
    ac: ["FRD-029 AC4", "FRD-029 AC5"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const other = ctx.fixtures.get("fresh");
      if (!other) return rec.unavailable("the second project endpoint fixture was not materialised", "run without --only, or include GB-00");
      const projects = await tool(ctx.server, rec, "list_projects");
      rec.check("list_projects reports the operator registry", projects.ok && projects.payload.registry.exists === true, String(projects.payload?.registry?.path));
      const names = (projects.payload?.endpoints ?? []).map((endpoint) => endpoint.name).sort();
      rec.check("both registered endpoints are observed", names.includes("golden-seeded") && names.includes("golden-fresh"), names.join(", "));
      const bound = (projects.payload?.endpoints ?? []).find((endpoint) => endpoint.bound);
      rec.check("exactly one endpoint is this process's own", bound?.name === "golden-seeded", String(bound?.name));

      const otherEndpoint = (projects.payload?.endpoints ?? []).find((endpoint) => endpoint.name === "golden-fresh");
      const otherId = otherEndpoint?.project?.project_id ?? ctx.shared.freshProjectId;
      const otherDigestBefore = await digest(path.join(other.boardRoot, ".kanmer"));
      const cross = await tool(ctx.server, rec, "create_item", {
        type: "ticket",
        title: "a cross-project write that must never land",
        expected_project: otherId ?? "kanmer-proj-v1:0000000000000000",
      });
      rec.bump("wrongProjectAttempts");
      rec.check(
        "naming the other project's identity is refused with WRONG_PROJECT",
        !cross.ok && cross.code === "WRONG_PROJECT",
        `${cross.code}: ${cross.message.slice(0, 120)}`,
      );
      rec.check(
        "the other project's board is untouched by the observation and the refusal",
        (await digest(path.join(other.boardRoot, ".kanmer"))) === otherDigestBefore,
      );
      const status = await tool(ctx.server, rec, "get_status");
      rec.check(
        "observing another endpoint never rebinds this process",
        status.ok && samePath(status.payload.projectRoot, ctx.fixture.boardRoot),
        String(status.payload?.projectRoot),
      );

      const tools = await ctx.server.send("tools/list", {});
      const pathish = new Set(["root", "board_root", "boardRoot", "repo_root", "repoRoot", "project_root", "projectRoot"]);
      const offenders = (tools.result?.tools ?? [])
        .filter((entry) => Object.keys(entry.inputSchema?.properties ?? {}).some((property) => pathish.has(property)))
        .map((entry) => entry.name);
      rec.check("no tool schema accepts a board or repository path", offenders.length === 0, offenders.join(", "));
    },
  },

  {
    id: "GB-06",
    title: "A lease is acquired, renewed, refused on a stale revision or superseded id, and released",
    classes: ["competing-controllers"],
    frd: ["FRD-030"],
    ac: ["FRD-030 AC2"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const created = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "GB-06 lease lifecycle", area: "core", profile: "custom", requires: {} });
      const id = created.payload.id;
      const taken = await tool(ctx.server, rec, "take_ticket", { id, branch: "golden/lease-06" });
      rec.check(
        "take_ticket mints a lease with an id, revision and expiry",
        taken.ok && typeof taken.payload.lease_id === "string" && taken.payload.lease_revision === 1 && typeof taken.payload.claim_expires_at === "string",
        `${taken.payload?.lease_id} @${taken.payload?.lease_revision}`,
      );
      const leaseId = taken.payload?.lease_id;
      const renewed = await tool(ctx.server, rec, "take_ticket", { id, action: "renew", lease_id: leaseId, lease_revision: 1 });
      rec.check("a renew naming both tokens advances the revision", renewed.ok && renewed.payload.lease_revision === 2, String(renewed.payload?.lease_revision));
      const stale = await tool(ctx.server, rec, "take_ticket", { id, action: "renew", lease_id: leaseId, lease_revision: 1 });
      rec.check(
        "a renew naming a stale lease revision is refused with REVISION_CONFLICT",
        !stale.ok && stale.code === "REVISION_CONFLICT",
        `${stale.code}: ${stale.message.slice(0, 120)}`,
      );
      const superseded = await tool(ctx.server, rec, "take_ticket", {
        id,
        action: "renew",
        lease_id: "00000000-0000-4000-8000-000000000000",
        lease_revision: 2,
      });
      rec.check(
        "a renew naming a superseded lease id is refused with LEASE_EXPIRED",
        !superseded.ok && superseded.code === "LEASE_EXPIRED",
        `${superseded.code}: ${superseded.message.slice(0, 120)}`,
      );
      const extended = await tool(ctx.server, rec, "take_ticket", {
        id,
        action: "renew",
        lease_id: leaseId,
        lease_revision: 2,
        phase: "running-command",
        extend_minutes: 30,
      });
      rec.check("the explicit long-command phase renews", extended.ok && extended.payload.lease_phase === "running-command", String(extended.payload?.lease_phase));
      const released = await tool(ctx.server, rec, "take_ticket", { id, action: "release" });
      rec.check("release clears the lease", released.ok && !released.payload.lease_id && !released.payload.taken_at, JSON.stringify({ lease: released.payload?.lease_id ?? null }));
    },
  },

  {
    id: "GB-07",
    title: "A second controller cannot take a workspace another taken ticket records, with or without force",
    classes: ["competing-controllers"],
    frd: ["FRD-030"],
    ac: ["FRD-030 AC1"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const first = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "GB-07 first controller", area: "core", profile: "custom", requires: {} });
      const second = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "GB-07 second controller", area: "core", profile: "custom", requires: {} });
      const held = await tool(ctx.server, rec, "take_ticket", {
        id: first.payload.id,
        branch: "golden/occupied",
        worktree: ".worktrees/occupied",
      });
      rec.check("the first controller holds the workspace", held.ok, held.message);
      const sameWorktree = await tool(ctx.server, rec, "take_ticket", {
        id: second.payload.id,
        branch: "golden/other",
        worktree: ".worktrees/occupied",
      });
      rec.check(
        "the same worktree is refused with a WORKSPACE_OCCUPIED message and a LEASE_CONFLICT code",
        !sameWorktree.ok && sameWorktree.message.includes("WORKSPACE_OCCUPIED") && sameWorktree.code === "LEASE_CONFLICT",
        `${sameWorktree.code}: ${sameWorktree.message.slice(0, 120)}`,
      );
      const sameBranch = await tool(ctx.server, rec, "take_ticket", {
        id: second.payload.id,
        branch: "golden/occupied",
        worktree: ".worktrees/elsewhere",
      });
      rec.check(
        "the same branch is refused the same way",
        !sameBranch.ok && sameBranch.message.includes("WORKSPACE_OCCUPIED") && sameBranch.code === "LEASE_CONFLICT",
        `${sameBranch.code}: ${sameBranch.message.slice(0, 120)}`,
      );
      const forced = await tool(ctx.server, rec, "take_ticket", {
        id: second.payload.id,
        branch: "golden/occupied",
        worktree: ".worktrees/occupied",
        force: true,
      });
      rec.check(
        "force does not bypass the one-live-writer-per-workspace rule",
        !forced.ok && forced.message.includes("WORKSPACE_OCCUPIED"),
        forced.message.slice(0, 120),
      );
      const foreignRenew = await tool(ctx.server, rec, "take_ticket", {
        id: first.payload.id,
        action: "renew",
        lease_id: "11111111-1111-4111-8111-111111111111",
        lease_revision: 1,
      });
      rec.check(
        "a renew by a non-owner is refused",
        !foreignRenew.ok && (foreignRenew.code === "LEASE_EXPIRED" || foreignRenew.code === "LEASE_CONFLICT"),
        `${foreignRenew.code}: ${foreignRenew.message.slice(0, 120)}`,
      );
      rec.bump("duplicateWork");
      await tool(ctx.server, rec, "take_ticket", { id: first.payload.id, action: "release" });
    },
  },

  {
    id: "GB-08",
    title: "An expired lease over dirty work is reported, preserved and recoverable",
    classes: ["expired-lease-recovery-with-dirty-work"],
    frd: ["FRD-030", "FRD-028"],
    ac: ["FRD-030 AC3", "FRD-028 AC4"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const created = await tool(ctx.server, rec, "create_item", { type: "ticket", title: "GB-08 dirty workspace recovery", area: "core", profile: "custom", requires: {} });
      const id = created.payload.id;
      const taken = await tool(ctx.server, rec, "take_ticket", {
        id,
        branch: ctx.fixture.meta.keptBranch,
        worktree: ctx.fixture.meta.keptWorktree,
      });
      rec.check("the ticket records the dirty worktree", taken.ok && taken.payload.worktree === ctx.fixture.meta.keptWorktree, taken.message);

      const dirtyFile = ctx.fixture.meta.dirtyFile;
      const dirtyBefore = fs.readFileSync(dirtyFile);
      expireClaim(ctx.fixture.boardRoot, id);

      const inspected = await tool(ctx.server, rec, "reconcile_ticket", { id });
      const codes = (inspected.payload?.findings ?? []).map((finding) => finding.code);
      rec.check("the expired claim is reported", inspected.ok && codes.includes("CLAIM_EXPIRED"), codes.join(", "));
      rec.check("the dirty workspace is reported as preserved", codes.includes("DIRTY_WORKSPACE_PRESERVED"), codes.join(", "));
      rec.check(
        "the recommendation is to recover the expired claim, never to clean the workspace",
        inspected.payload?.recommendation?.action === "RECOVER_EXPIRED_CLAIM",
        JSON.stringify(inspected.payload?.recommendation ?? null),
      );

      const applied = await tool(ctx.server, rec, "apply_reconciliation", {
        id,
        expected_revision: inspected.payload.recommendation.revision,
        controller: "golden-recovery-controller",
      });
      rec.check("the recovery applies", applied.ok, applied.message.slice(0, 200));
      rec.bump("recoveredLeases");
      const after = await tool(ctx.server, rec, "get_item", { id });
      rec.check(
        "branch, worktree and taken-time evidence survive the recovery",
        after.ok && after.payload.branch === ctx.fixture.meta.keptBranch && after.payload.worktree === ctx.fixture.meta.keptWorktree && Boolean(after.payload.taken_at),
        JSON.stringify({ branch: after.payload?.branch, worktree: after.payload?.worktree }),
      );
      rec.check("the controller changed hands", after.payload?.claim_controller === "golden-recovery-controller", String(after.payload?.claim_controller));
      rec.check("the dirty file still exists", fs.existsSync(dirtyFile));
      rec.check("the dirty file's bytes are unchanged", Buffer.compare(dirtyBefore, fs.readFileSync(dirtyFile)) === 0);
      await tool(ctx.server, rec, "take_ticket", { id, action: "release" });
    },
  },

  {
    id: "GB-09",
    title: "Three related tickets share one frozen batch workspace and an unrelated ticket cannot join it",
    classes: ["batch-execution"],
    frd: ["FRD-030"],
    ac: ["FRD-030 AC4", "FRD-030 AC5"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const mk = async (title) => (await tool(ctx.server, rec, "create_item", { type: "ticket", title, area: "core", profile: "custom", requires: {} })).payload.id;
      const m1 = await mk("GB-09 batch member one");
      const m2 = await mk("GB-09 batch member two");
      const m3 = await mk("GB-09 batch member three");
      const stranger = await mk("GB-09 unrelated ticket");
      const workspace = { branch: "golden/batch", worktree: ".worktrees/batch" };
      const run = "golden-controller-run-09";

      const declared = await tool(ctx.server, rec, "take_ticket", {
        id: m1,
        ...workspace,
        batch: "golden-batch",
        batch_members: [m1, m2, m3],
        controller_run: run,
      });
      rec.check("the first member declares and freezes the roster", declared.ok && declared.payload.lease_batch === "golden-batch", declared.message.slice(0, 160));
      for (const member of [m2, m3]) {
        const joined = await tool(ctx.server, rec, "take_ticket", { id: member, ...workspace, batch: "golden-batch", controller_run: run });
        rec.check(`member ${member} takes the same shared workspace`, joined.ok, joined.message.slice(0, 160));
      }
      const join = await tool(ctx.server, rec, "take_ticket", {
        id: stranger,
        ...workspace,
        batch: "golden-batch",
        batch_members: [m1, m2, m3, stranger],
        controller_run: run,
      });
      rec.check(
        "an unrelated ticket cannot join the frozen batch",
        !join.ok && /BATCH_/.test(join.message) && join.code === "LEASE_CONFLICT",
        `${join.code}: ${join.message.slice(0, 160)}`,
      );
      const share = await tool(ctx.server, rec, "take_ticket", { id: stranger, ...workspace, force: true });
      rec.check(
        "and cannot share the batch workspace even with force",
        !share.ok && share.message.includes("WORKSPACE_OCCUPIED"),
        share.message.slice(0, 160),
      );
      const early = await tool(ctx.server, rec, "take_ticket", { id: m1, action: "release" });
      rec.check(
        "releasing the workspace is refused while a member is not terminal",
        !early.ok && early.message.includes("BATCH_ACTIVE"),
        early.message.slice(0, 160),
      );
    },
  },

  {
    id: "GB-10",
    title: "A quick capture owes no document, stays out of the roster, and applies gates only from its recorded promotion",
    classes: ["capture-exclusion-and-promotion"],
    frd: ["FRD-032", "FRD-034"],
    ac: ["FRD-032 AC1", "FRD-032 AC2", "FRD-032 AC3", "FRD-032 AC4", "FRD-034 AC1"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const capture = await tool(ctx.server, rec, "create_item", {
        type: "ticket",
        title: "GB-10 capture: the board flickers on resize",
        area: "core",
        profile: "capture",
        body: "Seen once while resizing; nobody has decided whether it should be delivered.",
      });
      rec.check("a capture is created from an observation alone", capture.ok, capture.message.slice(0, 160));
      const gates = await tool(ctx.server, rec, "get_doc_gates", { id: capture.payload.id });
      const owed = (gates.payload?.boundaries ?? []).flatMap((boundary) => boundary.requirements ?? []);
      rec.check(
        "the capture owes no pipeline document",
        gates.ok && gates.payload.profile === "capture" && owed.length === 0,
        `${gates.payload?.profile} owes ${owed.length}`,
      );
      const found = await tool(ctx.server, rec, "search_items", { query: "flickers on resize" });
      rec.check("the capture is searchable", found.ok && (found.payload ?? []).some((item) => item.id === capture.payload.id));

      const roster = await tool(ctx.server, rec, "list_items", { profile: "fix" });
      const rosterIds = (roster.payload ?? []).map((item) => item.id);
      rec.check(
        "a prepared ticket created before the capture is in the roster",
        rosterIds.includes(ctx.fixture.meta.preparing),
        `${rosterIds.length} roster entries`,
      );
      rec.check("the capture is absent from that roster", !rosterIds.includes(capture.payload.id));

      const later = await tool(ctx.server, rec, "create_item", {
        type: "ticket",
        title: "GB-10 capture recorded after the roster was read",
        area: "core",
        profile: "capture",
        body: "Filed after the roster read, so it cannot be an ordering artefact.",
      });
      const roster2 = await tool(ctx.server, rec, "list_items", { profile: "fix" });
      rec.check(
        "a capture created after the roster read still does not appear in it",
        !(roster2.payload ?? []).map((item) => item.id).includes(later.payload.id),
      );

      const takeAttempt = await tool(ctx.server, rec, "take_ticket", { id: capture.payload.id, branch: "golden/capture" });
      rec.check(
        "an unpromoted capture cannot be taken",
        !takeAttempt.ok && takeAttempt.message.includes("CAPTURE_NOT_PROMOTED"),
        takeAttempt.message.slice(0, 160),
      );

      const promoted = await tool(ctx.server, rec, "update_item", {
        id: capture.payload.id,
        capture_disposition: "promoted",
        profile: "feature",
      });
      rec.check(
        "promotion records its disposition",
        promoted.ok && promoted.payload.capture_disposition === "promoted" && promoted.payload.profile === "feature",
        `${promoted.payload?.capture_disposition} / ${promoted.payload?.profile}`,
      );
      const gatesAfter = await tool(ctx.server, rec, "get_doc_gates", { id: capture.payload.id });
      const owedAfter = (gatesAfter.payload?.boundaries ?? []).flatMap((boundary) => boundary.requirements ?? []);
      rec.check(
        "only from that decision does the selected profile's gate set apply",
        gatesAfter.ok && gatesAfter.payload.profile === "feature" && owedAfter.length > 0,
        `${gatesAfter.payload?.profile} owes ${owedAfter.length}`,
      );
      rec.bump("unnecessaryDocuments", 0);
    },
  },

  {
    id: "GB-11",
    title: "Main-only and dev→frozen-candidate→main delivery resolve different targets, and a changed integration SHA mints a different candidate identity",
    classes: ["main-only-and-candidate-delivery"],
    frd: ["FRD-031"],
    ac: ["FRD-031 AC1", "FRD-031 AC2", "FRD-031 AC3"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const store = storeFor(ctx);
      const original = await store.getBoard();
      try {
        const mainOnly = await tool(ctx.server, rec, "get_status");
        rec.check(
          "an undeclared policy resolves main-only and says so",
          mainOnly.ok &&
            mainOnly.payload.delivery.integrationBranch === "main" &&
            mainOnly.payload.delivery.releaseBranch === "main" &&
            mainOnly.payload.delivery.source === "default",
          JSON.stringify(mainOnly.payload?.delivery ?? null),
        );
        const mainTargets = deliveryTargets(resolveDelivery(original), {});
        rec.check(
          "base branch, PR target and verification target are all main",
          mainTargets.baseBranch === "main" && mainTargets.prTarget === "main" && mainTargets.verificationTarget === "main" && mainTargets.hotfix === false,
          JSON.stringify(mainTargets),
        );

        await store.setBoard({
          ...original,
          delivery: { integrationBranch: "dev", releaseBranch: "main", releaseCandidatePattern: "candidate/*", hotfixBackport: true },
        });
        const declared = await tool(ctx.server, rec, "get_status");
        rec.check(
          "a dev→frozen-candidate→main policy is read from the board and reported as such",
          declared.ok &&
            declared.payload.delivery.integrationBranch === "dev" &&
            declared.payload.delivery.releaseBranch === "main" &&
            declared.payload.delivery.releaseCandidatePattern === "candidate/*" &&
            declared.payload.delivery.source === "board",
          JSON.stringify(declared.payload?.delivery ?? null),
        );
        const policy = resolveDelivery(await store.getBoard());
        const ordinary = deliveryTargets(policy, {});
        rec.check("an ordinary ticket targets the integration branch", ordinary.prTarget === "dev" && ordinary.hotfix === false, JSON.stringify(ordinary));
        const hotfix = deliveryTargets(policy, { delivery_branch: "main" });
        rec.check(
          "a ticket whose recorded delivery names the release branch is the hotfix, and is verified there",
          hotfix.hotfix === true && hotfix.prTarget === "main" && hotfix.verificationTarget === "main",
          JSON.stringify(hotfix),
        );

        // CORE-147: the verification contract is part of the same delivery
        // policy, so the project that integrates into `dev` also says which run
        // proves a merge there. Declared here on top of the dev→main policy
        // above and restored with it in the `finally`.
        rec.check(
          "an undeclared verification contract resolves to Kanmer's own pr.yml/verify/push and says so",
          mainOnly.payload.delivery.verification?.workflow === "pr.yml" &&
            mainOnly.payload.delivery.verification?.event === "push" &&
            (mainOnly.payload.delivery.verification?.jobs ?? []).join(",") === "verify" &&
            mainOnly.payload.delivery.verificationSource === "default",
          JSON.stringify(mainOnly.payload?.delivery?.verification ?? null),
        );
        await store.setBoard({
          ...(await store.getBoard()),
          delivery: {
            integrationBranch: "dev",
            releaseBranch: "main",
            releaseCandidatePattern: "candidate/*",
            hotfixBackport: true,
            verification: { workflow: "ci.yml", jobs: ["build", "test"], event: "push" },
          },
        });
        const contractStatus = await tool(ctx.server, rec, "get_status");
        rec.check(
          "a declared verification contract is read from the board and reported as board-sourced",
          contractStatus.ok &&
            contractStatus.payload.delivery.verification?.workflow === "ci.yml" &&
            (contractStatus.payload.delivery.verification?.jobs ?? []).join(",") === "build,test" &&
            contractStatus.payload.delivery.verificationSource === "board",
          JSON.stringify(contractStatus.payload?.delivery?.verification ?? null),
        );
        const contract = resolveDelivery(await store.getBoard()).verification;
        const ciReceipt = (job) => ({
          kind: "github-actions-run", provider: "github", repo: "acme/app", workflow: "ci.yml", event: "push",
          run_id: 42, attempt: 1, head_sha: SHA_A, job, conclusion: "success", url: "https://example.invalid/42",
        });
        rec.check(
          "receipts covering every contract job satisfy the set assessment",
          assessReceiptSet([ciReceipt("build"), ciReceipt("test")], { mergedSha: SHA_A, contract }).kind === "satisfied",
        );
        rec.check(
          "a receipt for only one of two contract jobs is incomplete, naming the missing one",
          assessReceiptSet([ciReceipt("build")], { mergedSha: SHA_A, contract }).reasons?.some((reason) => reason.includes('missing "test"')) === true,
          JSON.stringify(assessReceiptSet([ciReceipt("build")], { mergedSha: SHA_A, contract })),
        );
        rec.check(
          "Kanmer's own pr.yml/verify receipt is rejected under this project's contract, naming ci.yml",
          assessReceiptSet([{ ...ciReceipt("verify"), workflow: "pr.yml" }], { mergedSha: SHA_A, contract })
            .reasons?.some((reason) => reason.includes('receipt workflow must be "ci.yml"')) === true,
        );
        rec.check(
          "no receipts at all is satisfied — the designated verifier ran every obligation itself",
          assessReceiptSet([], { mergedSha: SHA_A, contract }).kind === "satisfied",
        );

        const first = candidateIdentity("main", SHA_A, 1);
        const same = candidateIdentity("main", SHA_A, 1);
        const changed = candidateIdentity("main", SHA_B, 1);
        rec.check("a candidate identity is a pure function of channel, exact SHA and ordinal", first === same, first);
        rec.check("changing the integration SHA yields a different candidate identity", first !== changed, `${first} vs ${changed}`);
        rec.check("the frozen identity is unchanged by that later mint", candidateIdentity("main", SHA_A, 1) === first);
        rec.check(
          "the candidate ref carries the immutable token, never a surviving wildcard",
          candidateRefFor(policy, "main", 1) === "candidate/main-1",
          String(candidateRefFor(policy, "main", 1)),
        );
        rec.check(
          "candidate identity and integration SHA are frozen attempt fields",
          RELEASE_FROZEN_FIELDS.includes("candidate_id") && RELEASE_FROZEN_FIELDS.includes("integration_sha") && RELEASE_FROZEN_FIELDS.includes("delivery_policy_version"),
          RELEASE_FROZEN_FIELDS.join(", "),
        );
        const delivered = await tool(ctx.server, rec, "update_item", {
          id: ctx.fixture.meta.done,
          delivery_state: "released",
          delivery_branch: "main",
          delivery_sha: SHA_A,
          delivery_release_branch: "main",
          delivery_release_tag: "v0.0.0-golden",
        });
        rec.check(
          "final release is recorded separately from the workflow stage, with its own evidence",
          delivered.ok && delivered.payload.delivery_state === "released" && delivered.payload.status === "done",
          delivered.ok ? `${delivered.payload?.delivery_state} @ ${delivered.payload?.status}` : delivered.message.slice(0, 200),
        );
        rec.check(
          "a hotfix delivered on the release branch records the backport it owes the integration branch",
          delivered.ok && delivered.payload.delivery_backport_required === "dev",
          String(delivered.payload?.delivery_backport_required),
        );
      } finally {
        await store.setBoard(original);
      }
    },
  },

  {
    id: "GB-12",
    title: "One release channel has one owner, and a superseded immutable attempt stays readable and names its successor",
    classes: ["superseded-release-attempts"],
    frd: ["FRD-031", "FRD-035"],
    ac: ["FRD-031 AC4", "FRD-035 edge case 2"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const acquired = await tool(ctx.server, rec, "release_channel", { action: "acquire", channel: "main", integration_sha: SHA_A });
      rec.check("acquire mints main@1 with a candidate identity", acquired.ok && /main@1/.test(JSON.stringify(acquired.payload)), acquired.message.slice(0, 160));
      const status1 = await tool(ctx.server, rec, "get_status");
      const current1 = status1.payload?.release?.channels?.main?.current ?? status1.payload?.release?.current ?? null;
      rec.check(
        "the minted attempt records the exact integration SHA and a cand1: identity",
        JSON.stringify(status1.payload?.release ?? {}).includes(SHA_A) && JSON.stringify(status1.payload?.release ?? {}).includes("cand1:"),
        JSON.stringify(current1 ?? {}).slice(0, 200),
      );
      const held = await tool(ctx.server, rec, "release_channel", { action: "acquire", channel: "main", integration_sha: SHA_B });
      rec.check(
        "a second concurrent owner is refused with RELEASE_CHANNEL_HELD",
        !held.ok && held.code === "RELEASE_CHANNEL_HELD",
        `${held.code}: ${held.message.slice(0, 160)}`,
      );

      const lease = readChannelLease(ctx.fixture.boardRoot, "main");
      const superseded = await tool(ctx.server, rec, "release_channel", {
        action: "supersede",
        channel: "main",
        integration_sha: SHA_B,
        lease_id: lease.lease_id,
        lease_revision: lease.lease_revision,
      });
      rec.check("supersede mints a successor attempt", superseded.ok, superseded.message.slice(0, 200));
      const first = readAttempt(ctx.fixture.boardRoot, "main@1");
      const second = readAttempt(ctx.fixture.boardRoot, "main@2");
      rec.check("the superseded attempt is still readable", first !== null && first.attempt_id === "main@1", JSON.stringify(first ?? {}).slice(0, 160));
      rec.check("its terminal outcome is superseded", first?.outcome === "superseded", String(first?.outcome));
      rec.check(
        "it names its successor, and the successor names it as its predecessor",
        first?.successor === "main@2" && second?.supersedes === "main@1",
        `${first?.successor} / ${second?.supersedes}`,
      );
      rec.check("the successor inherits no verification evidence", (second?.verification_state ?? "pending") === "pending", String(second?.verification_state));

      const lease2 = readChannelLease(ctx.fixture.boardRoot, "main");
      const completed = await tool(ctx.server, rec, "release_channel", {
        action: "complete",
        channel: "main",
        lease_id: lease2.lease_id,
        lease_revision: lease2.lease_revision,
      });
      rec.check("complete clears the lease", completed.ok, completed.message.slice(0, 200));
      rec.check("the immutable attempt remains readable after the lease is cleared", readAttempt(ctx.fixture.boardRoot, "main@2") !== null);

      const reacquired = await tool(ctx.server, rec, "release_channel", { action: "acquire", channel: "main", integration_sha: SHA_C });
      rec.check("a cleared channel can be acquired again", reacquired.ok, reacquired.message.slice(0, 200));
      expireChannelLease(ctx.fixture.boardRoot, "main");
      const afterExpiry = await tool(ctx.server, rec, "release_channel", { action: "acquire", channel: "main", integration_sha: SHA_A });
      rec.check(
        "an expired-but-unreleased channel still refuses a second acquire — expiry alone never frees a channel",
        !afterExpiry.ok && afterExpiry.code === "RELEASE_CHANNEL_HELD",
        `${afterExpiry.code}: ${afterExpiry.message.slice(0, 160)}`,
      );
    },
  },

  {
    id: "GB-13",
    title: "A weak controller cannot clear prepared work: Review → Implementing needs a bound attestation or an operator reason, and the budget stops repeats",
    classes: ["remediation-delta-review-and-replan", "weak-controller-clears-prepared-work"],
    frd: ["FRD-034"],
    ac: ["FRD-034 AC2", "FRD-034 AC3", "FRD-034 AC5"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const mk = async (title, extra = {}) =>
        (await tool(ctx.server, rec, "create_item", {
          type: "ticket",
          title,
          area: "core",
          profile: "custom",
          requires: {},
          status: "review",
          prs: ["12"],
          ...extra,
        })).payload.id;

      const noRecord = await mk("GB-13 no attestation at all");
      const invalid = await mk("GB-13 invalid attestation");
      const wrongVerdict = await mk("GB-13 attestation verdict is pass");
      const wrongPr = await mk("GB-13 attestation names another PR");
      const authorised = await mk("GB-13 attestation authorises the return");
      const operator = await mk("GB-13 operator reason authorises the return");

      const updatedOf = async (id) => (await tool(ctx.server, rec, "get_item", { id })).payload.updated;

      await tool(ctx.server, rec, "set_ticket_doc", { id: invalid, doc: "scratch/review", content: "not an attestation at all\n" });
      await tool(ctx.server, rec, "set_ticket_doc", {
        id: wrongVerdict,
        doc: "scratch/review",
        content: attestation({ pr: "12", headSha: SHA_A, verdict: "pass", ticketUpdated: await updatedOf(wrongVerdict) }),
      });
      await tool(ctx.server, rec, "set_ticket_doc", {
        id: wrongPr,
        doc: "scratch/review",
        content: attestation({ pr: "999", headSha: SHA_A, verdict: "needs-changes", ticketUpdated: await updatedOf(wrongPr) }),
      });

      const reasons = [
        [noRecord, "no attestation exists"],
        [invalid, "the record is not a valid attestation"],
        [wrongVerdict, "the verdict is not needs-changes"],
        [wrongPr, "the attestation names a PR this ticket does not record"],
      ];
      for (const [id, why] of reasons) {
        const refused = await tool(ctx.server, rec, "move_item", { id, status: "implementing", reason: "the controller would like it back" });
        rec.check(
          `an unattested return is refused because ${why}`,
          !refused.ok && refused.message.includes("REVIEW_RETURN_NEEDS_ATTESTATION"),
          refused.message.slice(0, 200),
        );
      }

      await tool(ctx.server, rec, "take_ticket", { id: authorised, branch: "golden/review-13", worktree: ".worktrees/review-13", stage: "review" });
      const beforeReturn = await tool(ctx.server, rec, "get_item", { id: authorised });
      await tool(ctx.server, rec, "set_ticket_doc", {
        id: authorised,
        doc: "scratch/review",
        content: attestation({ pr: "12", headSha: SHA_A, verdict: "needs-changes", ticketUpdated: beforeReturn.payload.updated }),
      });
      const returned = await tool(ctx.server, rec, "move_item", { id: authorised, status: "implementing", reason: "reviewer asked for changes" });
      rec.check("a needs-changes attestation bound to this ticket's PR authorises the return", returned.ok, returned.message.slice(0, 200));
      rec.bump("reviewCycles");
      const afterReturn = await tool(ctx.server, rec, "get_item", { id: authorised });
      rec.check("review_round becomes 1", afterReturn.payload?.review_round === 1, String(afterReturn.payload?.review_round));
      rec.check(
        "branch, worktree and PR are unchanged by the return",
        afterReturn.payload?.branch === beforeReturn.payload.branch &&
          afterReturn.payload?.worktree === beforeReturn.payload.worktree &&
          JSON.stringify(afterReturn.payload?.prs) === JSON.stringify(beforeReturn.payload.prs),
        JSON.stringify({ branch: afterReturn.payload?.branch, worktree: afterReturn.payload?.worktree, prs: afterReturn.payload?.prs }),
      );

      const operatorReturn = await tool(ctx.server, rec, "move_item", { id: operator, status: "implementing", reason: "operator: reopened deliberately" });
      rec.check("a reason beginning operator: authorises the return without an attestation", operatorReturn.ok, operatorReturn.message.slice(0, 200));
      rec.bump("reviewCycles");

      const back = await tool(ctx.server, rec, "move_item", { id: authorised, status: "review" });
      rec.check("the ticket can return to review for a second round", back.ok, back.message.slice(0, 200));
      const nextUpdated = await updatedOf(authorised);
      await tool(ctx.server, rec, "set_ticket_doc", {
        id: authorised,
        doc: "scratch/review",
        content: attestation({ pr: "12", headSha: SHA_B, verdict: "needs-changes", ticketUpdated: nextUpdated }),
      });
      const exhausted = await tool(ctx.server, rec, "move_item", { id: authorised, status: "implementing", reason: "reviewer asked again" });
      rec.check(
        "a second remediation round beyond the budget is refused with REMEDIATION_BUDGET_EXHAUSTED",
        !exhausted.ok && exhausted.message.includes("REMEDIATION_BUDGET_EXHAUSTED"),
        exhausted.message.slice(0, 200),
      );
      const overridden = await tool(ctx.server, rec, "move_item", { id: authorised, status: "implementing", reason: "operator: budget extended once, deliberately" });
      rec.check("only an operator reason re-opens an exhausted budget", overridden.ok, overridden.message.slice(0, 200));
      rec.bump("reviewCycles");
      await tool(ctx.server, rec, "take_ticket", { id: authorised, action: "release" });
    },
  },

  {
    id: "GB-14",
    title: "Reconciliation of invalid stages is inert, refuses the board worktree, and invents nothing without a provider",
    classes: ["reconciliation-of-invalid-stages"],
    frd: ["FRD-028"],
    ac: ["FRD-028 AC1", "FRD-028 AC5"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const ACTIONS = new Set([
        "MOVE_TO_IMPLEMENTING",
        "MOVE_TO_VERIFYING",
        "MOVE_TO_DONE",
        "ROUTE_VERIFICATION_FAILURE",
        "RELEASE_CLEAN_TERMINAL_CLAIM",
        "RECOVER_EXPIRED_CLAIM",
      ]);
      const staleReview = (await tool(ctx.server, rec, "create_item", {
        type: "ticket", title: "GB-14 stale review ticket", area: "core", profile: "custom", requires: {}, status: "review", prs: ["4242"],
      })).payload.id;
      const staleVerifying = (await tool(ctx.server, rec, "create_item", {
        type: "ticket", title: "GB-14 stale verifying ticket", area: "core", profile: "custom", requires: {}, status: "verifying", prs: ["4243"],
      })).payload.id;
      const boardTicket = (await tool(ctx.server, rec, "create_item", {
        type: "ticket", title: "GB-14 ticket recording the board worktree", area: "core", profile: "custom", requires: {}, status: "implementing",
      })).payload.id;
      // take_ticket refuses the board worktree outright (worktree-guard.ts), so
      // this state is materialised the only way it can occur in the wild: as
      // additive passthrough frontmatter written by something else.
      stampClaim(ctx.fixture.boardRoot, boardTicket, {
        branch: "kanmer-board",
        worktree: ctx.fixture.meta.boardWorktree,
        taken_at: new Date().toISOString(),
        claim_expires_at: new Date(Date.now() - 60 * 60_000).toISOString(),
        claim_controller: "golden-stale-controller",
      });

      const before = await digest(path.join(ctx.fixture.boardRoot, ".kanmer"));
      const observed = [];
      for (const id of [staleReview, staleVerifying, boardTicket]) {
        const result = await tool(ctx.server, rec, "reconcile_ticket", { id });
        rec.check(`reconcile_ticket answers for ${id}`, result.ok, result.message.slice(0, 200));
        observed.push({ id, findings: (result.payload?.findings ?? []).map((finding) => finding.code), recommendation: result.payload?.recommendation ?? null });
      }
      const after = await digest(path.join(ctx.fixture.boardRoot, ".kanmer"));
      rec.check("the dry run writes nothing at all — the whole board digest, including activity.jsonl, is identical", before === after, `${before.slice(0, 12)} vs ${after.slice(0, 12)}`);

      const review = observed.find((entry) => entry.id === staleReview);
      const verifying = observed.find((entry) => entry.id === staleVerifying);
      const board = observed.find((entry) => entry.id === boardTicket);
      rec.check(
        "with no GitHub context the stale Review ticket is EVIDENCE_INCONCLUSIVE and gets no recommendation",
        review.findings.includes("EVIDENCE_INCONCLUSIVE") && review.recommendation === null,
        review.findings.join(", "),
      );
      rec.check(
        "the stale Verifying ticket is likewise inconclusive rather than routed on invented evidence",
        verifying.findings.includes("EVIDENCE_INCONCLUSIVE") && verifying.recommendation === null,
        verifying.findings.join(", "),
      );
      rec.check(
        "the ticket recording the board worktree is refused with BOARD_WORKTREE_PROTECTED and no recommendation",
        board.findings.includes("BOARD_WORKTREE_PROTECTED") && board.recommendation === null,
        board.findings.join(", "),
      );
      const recommendations = observed.map((entry) => entry.recommendation?.action).filter(Boolean);
      rec.check(
        "every recommendation observed is a member of the closed six-value ReconciliationAction union",
        recommendations.every((action) => ACTIONS.has(action)),
        recommendations.join(", ") || "(none)",
      );
      const apply = await tool(ctx.server, rec, "apply_reconciliation", { id: boardTicket, expected_revision: "rev1:whatever" });
      rec.check(
        "applying against the protected board worktree is a normal RECONCILIATION_INCONCLUSIVE refusal",
        !apply.ok && apply.code === "RECONCILIATION_INCONCLUSIVE",
        `${apply.code}: ${apply.message.slice(0, 160)}`,
      );
      rec.bump("stuckStages", observed.length);
    },
  },

  {
    id: "GB-15",
    title: "A missing or unrecorded workspace is recoverable, and a foreign or branch-mismatched one is still refused",
    classes: ["reconciliation-of-invalid-stages", "expired-lease-recovery-with-dirty-work"],
    frd: ["FRD-028", "FRD-030"],
    ac: ["FRD-028 AC2", "FRD-028 AC4", "FRD-028 AC5", "FRD-030 AC3"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const mk = async (title) => (await tool(ctx.server, rec, "create_item", { type: "ticket", title, area: "core", profile: "custom", requires: {} })).payload.id;

      // 1. A recorded worktree whose directory has been deleted on disk.
      const missing = await mk("GB-15 deleted worktree directory");
      await tool(ctx.server, rec, "take_ticket", { id: missing, branch: ctx.fixture.meta.missingBranch, worktree: ctx.fixture.meta.missingWorktree });
      expireClaim(ctx.fixture.boardRoot, missing);
      const missingResult = await tool(ctx.server, rec, "reconcile_ticket", { id: missing });
      const missingCodes = (missingResult.payload?.findings ?? []).map((finding) => finding.code);
      rec.check("a deleted worktree directory yields WORKSPACE_MISSING", missingCodes.includes("WORKSPACE_MISSING"), missingCodes.join(", "));
      rec.check(
        "and recommends RECOVER_EXPIRED_CLAIM (this is the CORE-133 predicate; its absence means CORE-133 is not merged into this branch)",
        missingResult.payload?.recommendation?.action === "RECOVER_EXPIRED_CLAIM",
        JSON.stringify(missingResult.payload?.recommendation ?? null),
      );

      const staleApply = await tool(ctx.server, rec, "apply_reconciliation", { id: missing, expected_revision: "rev1:0000000000000000" });
      rec.check(
        "applying against a stale revision is refused with REVISION_CONFLICT",
        !staleApply.ok && staleApply.code === "REVISION_CONFLICT",
        `${staleApply.code}: ${staleApply.message.slice(0, 160)}`,
      );
      const beforeMissing = await tool(ctx.server, rec, "get_item", { id: missing });
      const appliedMissing = await tool(ctx.server, rec, "apply_reconciliation", {
        id: missing,
        expected_revision: missingResult.payload.recommendation.revision,
        controller: "golden-recovery-15",
      });
      rec.check("the recovery applies on the current revision", appliedMissing.ok, appliedMissing.message.slice(0, 200));
      rec.bump("recoveredLeases");
      const afterMissing = await tool(ctx.server, rec, "get_item", { id: missing });
      rec.check(
        "ownership transferred while branch, worktree and taken-time evidence are preserved and nothing is deleted",
        afterMissing.payload?.claim_controller === "golden-recovery-15" &&
          afterMissing.payload?.branch === beforeMissing.payload.branch &&
          afterMissing.payload?.worktree === beforeMissing.payload.worktree &&
          afterMissing.payload?.taken_at === beforeMissing.payload.taken_at,
        JSON.stringify({ branch: afterMissing.payload?.branch, worktree: afterMissing.payload?.worktree }),
      );

      // 2. A claim that never recorded a workspace at all.
      const unrecorded = await mk("GB-15 claim with no recorded workspace");
      await tool(ctx.server, rec, "take_ticket", { id: unrecorded, branch: "golden/no-worktree-15" });
      expireClaim(ctx.fixture.boardRoot, unrecorded);
      const unrecordedResult = await tool(ctx.server, rec, "reconcile_ticket", { id: unrecorded });
      const unrecordedCodes = (unrecordedResult.payload?.findings ?? []).map((finding) => finding.code);
      rec.check("a claim with no recorded workspace yields CLAIM_WITHOUT_RECORDED_WORKSPACE", unrecordedCodes.includes("CLAIM_WITHOUT_RECORDED_WORKSPACE"), unrecordedCodes.join(", "));
      rec.check(
        "and the same RECOVER_EXPIRED_CLAIM recommendation",
        unrecordedResult.payload?.recommendation?.action === "RECOVER_EXPIRED_CLAIM",
        JSON.stringify(unrecordedResult.payload?.recommendation ?? null),
      );

      // 3. Foreign repository and branch mismatch stay refused.
      const foreign = await mk("GB-15 foreign repository workspace");
      stampClaim(ctx.fixture.boardRoot, foreign, {
        branch: ctx.fixture.meta.foreignBranch,
        worktree: ctx.fixture.meta.foreignRepo,
        taken_at: new Date().toISOString(),
        claim_expires_at: new Date(Date.now() - 60 * 60_000).toISOString(),
        claim_controller: "golden-foreign",
      });
      const foreignTransfer = await tool(ctx.server, rec, "take_ticket", { id: foreign, action: "transfer", assignee: "golden-recovery-15" });
      rec.check(
        "a foreign-repository workspace is still refused with RECOVERY_REFUSED",
        !foreignTransfer.ok && foreignTransfer.message.includes("RECOVERY_REFUSED"),
        foreignTransfer.message.slice(0, 200),
      );

      const mismatch = await mk("GB-15 branch-mismatched workspace");
      await tool(ctx.server, rec, "take_ticket", { id: mismatch, branch: "golden/not-checked-out", worktree: ctx.fixture.meta.keptWorktree });
      expireClaim(ctx.fixture.boardRoot, mismatch);
      const mismatchTransfer = await tool(ctx.server, rec, "take_ticket", { id: mismatch, action: "transfer", assignee: "golden-recovery-15" });
      rec.check(
        "a branch-mismatched workspace is still refused with RECOVERY_REFUSED",
        !mismatchTransfer.ok && mismatchTransfer.message.includes("RECOVERY_REFUSED"),
        mismatchTransfer.message.slice(0, 200),
      );
      rec.check("the kept worktree still exists after every refusal", fs.existsSync(path.join(ctx.fixture.meta.repoRoot, ctx.fixture.meta.keptWorktree)));
      await tool(ctx.server, rec, "take_ticket", { id: mismatch, action: "release" });
    },
  },

  {
    id: "GB-16",
    title: "Provider-derived reconciliation routes, driven from injected evidence and recorded as simulated",
    classes: ["reconciliation-of-invalid-stages"],
    frd: ["FRD-028", "FRD-035"],
    ac: ["FRD-028 AC3", "FRD-035 edge case 1"],
    fixture: "seeded",
    mode: "simulated",
    async run(ctx) {
      const { rec } = ctx;
      const store = storeFor(ctx);
      const mergedSha = SHA_A;
      const otherSha = SHA_C;
      const merged = { state: "MERGED", headRefOid: SHA_B, mergeCommit: { oid: mergedSha } };
      const checks = [{ state: "SUCCESS", bucket: "pass" }];
      const commonDir = injectedCommonDir(ctx.fixture.boardRoot);

      const mk = async (title, status) =>
        (await store.createItem({ type: "ticket", title, area: "core", profile: "custom", requires: {}, status, prs: ["77"] })).id;

      const reviewTicket = await mk("GB-16 merged review", "review");
      const passTicket = await mk("GB-16 pass proof still verifying", "verifying");
      const mismatchTicket = await mk("GB-16 proof bound to the wrong SHA", "verifying");
      const implFail = await mk("GB-16 implementation verification failure", "verifying");
      const planFail = await mk("GB-16 plan verification failure", "verifying");

      await store.setDoc(passTicket, "proof", proofRecord({ result: "PASS", mergedSha }));
      await store.setDoc(mismatchTicket, "proof", proofRecord({ result: "PASS", mergedSha: otherSha }));
      await store.setDoc(implFail, "proof", proofRecord({ result: "FAIL", mergedSha, failureClass: "implementation" }));
      await store.setDoc(planFail, "proof", proofRecord({ result: "FAIL", mergedSha, failureClass: "plan" }));

      const evidence = { prs: { 77: merged }, checks, branch: "main" };
      const run = injectedRun(evidence);
      const printed = JSON.stringify({ ghPrView: merged, ghPrChecks: checks, gitStatus: "", gitSymbolicRef: "main" });

      const routes = [
        [reviewTicket, "MERGED_REVIEW", "MOVE_TO_VERIFYING"],
        [passTicket, "PASS_PROOF_STILL_VERIFYING", "MOVE_TO_DONE"],
        [mismatchTicket, "PROOF_MERGE_SHA_MISMATCH", null],
        [implFail, "VERIFICATION_FAILED_IMPLEMENTATION", "ROUTE_VERIFICATION_FAILURE"],
        [planFail, "VERIFICATION_FAILED_PLAN", "ROUTE_VERIFICATION_FAILURE"],
      ];
      for (const [id, code, action] of routes) {
        const result = await reconcileTicket(store, id, run, { resolveCommonDir: commonDir });
        const codes = (result.findings ?? []).map((finding) => finding.code);
        const observed = result.recommendation?.action ?? null;
        rec.simulated(
          `injected provider evidence yields ${code}${action ? ` ⇒ ${action}` : " and no recommendation"}`,
          codes.includes(code) && observed === action,
          printed,
          `${codes.join(", ")} ⇒ ${observed ?? "(none)"}`,
        );
      }
      rec.simulated(
        "the implementation route returns to Implementing and the plan route to Preparing",
        (await reconcileTicket(store, implFail, run, { resolveCommonDir: commonDir })).recommendation?.targetStatus === "implementing" &&
          (await reconcileTicket(store, planFail, run, { resolveCommonDir: commonDir })).recommendation?.targetStatus === "preparing",
        printed,
      );
      rec.check("every check in this scenario is recorded simulated, never as a provider pass", rec.checks.every((entry) => entry.state !== "pass"));
    },
  },

  {
    id: "GB-17",
    title: "A structured plan compiles one bounded step packet, and reconciliation catches a forbidden path, an undeclared path and a stale document",
    classes: ["remediation-delta-review-and-replan"],
    frd: ["FRD-033"],
    ac: ["FRD-033 AC1", "FRD-033 AC3", "FRD-033 AC4"],
    fixture: "repo",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const id = ctx.fixture.meta.feature;
      const advisory = await tool(ctx.server, rec, "get_execution_packet", { id });
      rec.check("the whole-ticket packet is ready", advisory.ok && advisory.payload.ready === true, JSON.stringify(advisory.payload?.reason ?? advisory.payload?.missing ?? "").slice(0, 200));
      const advisoryCodes = (advisory.payload?.validation?.findings ?? []).map((finding) => finding.code);
      rec.check(
        "an unresolved vague phrase produces the advisory validation finding without blocking",
        advisoryCodes.includes("PLAN_VAGUE_INSTRUCTION"),
        advisoryCodes.join(", "),
      );

      const taken = await tool(ctx.server, rec, "take_ticket", {
        id,
        branch: ctx.fixture.meta.stepBranch,
        worktree: ctx.fixture.meta.stepWorktree,
      });
      rec.check("the ticket is taken on a real recorded workspace", taken.ok, taken.message.slice(0, 200));

      const packet = await tool(ctx.server, rec, "get_execution_packet", { id, step: 1 });
      const step = packet.payload?.step ?? null;
      rec.check(
        "a step-packet/2 is compiled for ordered step 1",
        packet.ok && step?.packetVersion === "step-packet/2" && step?.step?.index === 1 && typeof step?.packetId === "string",
        JSON.stringify(packet.payload?.reason ?? step?.packetVersion ?? "").slice(0, 200),
      );
      rec.check(
        "it is limited to that step's declared file and carries its tests, commands and stop condition",
        Array.isArray(step?.allowedFiles) && step.allowedFiles.length === 1 && step.allowedFiles.includes("tracked.txt") &&
          (step?.commands ?? []).length > 0 && (step?.tests ?? []).length > 0 && typeof step?.stopCondition === "string" && step.stopCondition.length > 0,
        JSON.stringify({ allowedFiles: step?.allowedFiles, commands: step?.commands, tests: step?.tests }),
      );
      rec.check(
        "the plan's Do not modify list rides on the packet as forbidden files",
        (step?.forbiddenFiles ?? []).some((pattern) => pattern.startsWith("forbidden/")),
        JSON.stringify(step?.forbiddenFiles ?? []),
      );

      const worktree = path.join(ctx.fixture.meta.repoRoot, ctx.fixture.meta.stepWorktree);
      fs.mkdirSync(path.join(worktree, "forbidden"), { recursive: true });
      fs.writeFileSync(path.join(worktree, "forbidden", "no.txt"), "forbidden change\n", "utf8");
      fs.writeFileSync(path.join(worktree, "undeclared.txt"), "undeclared change\n", "utf8");
      const deviated = await tool(ctx.server, rec, "reconcile_ticket", { id, step_packet: step });
      const deviationCodes = (deviated.payload?.step?.findings ?? []).map((finding) => finding.code);
      rec.check(
        "a change outside the declared set is reported as STEP_PATH_FORBIDDEN or STEP_PATH_UNDECLARED",
        deviated.ok && (deviationCodes.includes("STEP_PATH_FORBIDDEN") || deviationCodes.includes("STEP_PATH_UNDECLARED")),
        deviationCodes.join(", "),
      );
      rec.check("and the step result is not PASS", deviated.payload?.step?.status !== "pass", String(deviated.payload?.step?.status));
      rec.bump("planDeviations");
      fs.rmSync(path.join(worktree, "forbidden"), { recursive: true, force: true });
      fs.rmSync(path.join(worktree, "undeclared.txt"), { force: true });

      await tool(ctx.server, rec, "set_ticket_doc", { id, doc: "research", content: "# Research — golden feature ticket\n\nRewritten after the packet was issued.\n" });
      const stale = await tool(ctx.server, rec, "reconcile_ticket", { id, step_packet: step });
      const staleCodes = (stale.payload?.step?.findings ?? []).map((finding) => finding.code);
      rec.check(
        "a ticket document rewritten since the packet is reported as STEP_TICKET_DOCUMENTS_STALE",
        stale.ok && staleCodes.includes("STEP_TICKET_DOCUMENTS_STALE"),
        staleCodes.join(", "),
      );
      await tool(ctx.server, rec, "take_ticket", { id, action: "release" });
    },
  },

  {
    id: "GB-18",
    title: "Independent exact-head review: repeated audits consume no budget, dispositioned minors merge, an open blocker does not, and an obsolete-after-change thread does not block",
    classes: ["independent-exact-head-review"],
    frd: ["FRD-034"],
    ac: ["FRD-034 AC5", "FRD-034 § Amendment — review budget and root-cause classes"],
    fixture: "seeded",
    mode: "live",
    async run(ctx) {
      const { rec } = ctx;
      const store = storeFor(ctx);
      const cite = "FRD-034 § Amendment — review budget and root-cause classes (fallback: HZN-008 context.md § \"Review budget and root-cause rule\")";

      const ticket = await store.createItem({
        type: "ticket",
        title: "GB-18 exact-head review subject",
        area: "core",
        profile: "custom",
        requires: {},
        status: "review",
        prs: ["4321"],
        docs_todo: true,
      });
      const headSha = SHA_A;
      const pr = { number: 4321, headSha, branch: `${ticket.id}-golden`, body: `Golden review subject\n\nKanmer: ${ticket.id}\n`, baseRef: "main" };

      // A — three reads of an unchanged head consume no remediation attempts.
      const rounds = [];
      for (let index = 0; index < 3; index++) {
        const read = await tool(ctx.server, rec, "get_item", { id: ticket.id });
        rounds.push(read.payload?.review_round ?? 0);
      }
      rec.check(
        `amendment test A — three audits of one unchanged head leave review_round unchanged (${cite})`,
        rounds.every((round) => round === 0),
        rounds.join(","),
      );

      const evaluate = async (raw) => {
        const parsed = parseReviewAttestation(raw);
        if (parsed.state !== "valid") return { parsed, result: null };
        const result = await evaluateMergeGate(store, pr, {
          reviewStageId: "review",
          finalStageId: "done",
          blockers: [],
          review: {
            state: "valid",
            headSha: parsed.headSha,
            verdict: parsed.verdict,
            pr: parsed.pr,
            independent: parsed.independent,
            ticketUpdated: parsed.ticketUpdated,
            planHash: parsed.planHash,
          },
          commits: [],
          strict: true,
        });
        return { parsed, result };
      };

      const updated = (await tool(ctx.server, rec, "get_item", { id: ticket.id })).payload.updated;
      const minors = attestation({
        pr: "4321",
        headSha,
        verdict: "pass",
        ticketUpdated: updated,
        findings: [
          { id: "F-001", severity: "minor", summary: "a minor naming nit", disposition: "accepted-risk", reason: "outside the packet" },
          { id: "F-002", severity: "note", summary: "a note for later", disposition: "deferred-to-ticket", ticket: "CORE-999" },
        ],
      });
      const b = await evaluate(minors);
      rec.check(
        `amendment test B — green required checks with only dispositioned minor/note findings pass the merge gate (${cite})`,
        b.parsed.state === "valid" && b.result !== null && mergeGateOk(b.result.findings),
        JSON.stringify(b.result?.findings?.map((finding) => finding.code) ?? b.parsed),
      );

      const blocker = attestation({
        pr: "4321",
        headSha,
        verdict: "needs-changes",
        ticketUpdated: updated,
        findings: [{ id: "F-003", severity: "blocker", summary: "a blocker introduced by remediation", disposition: "open" }],
      });
      const c = await evaluate(blocker);
      rec.check(
        `amendment test C — an open blocker at the current head blocks the merge gate (${cite})`,
        c.parsed.state === "valid" && c.result !== null && !mergeGateOk(c.result.findings),
        JSON.stringify(c.result?.findings?.map((finding) => finding.code) ?? c.parsed),
      );

      const obsolete = attestation({
        pr: "4321",
        headSha,
        verdict: "pass",
        ticketUpdated: updated,
        findings: [{ id: "F-004", severity: "major", summary: "an outdated thread the change already superseded", disposition: "obsolete-after-change", reason: `superseded by ${SHA_B}` }],
      });
      const d = await evaluate(obsolete);
      if (d.parsed.state !== "valid") {
        rec.unavailable(
          `amendment test D — obsolete-after-change is absent from DISPOSITIONS, so this build cannot express it (SKILL-039 is not merged here) (${cite})`,
          `parse: ${d.parsed.state}${d.parsed.reason ? ` — ${d.parsed.reason}` : ""}`,
        );
      } else {
        rec.check(
          `amendment test D — a thread dispositioned obsolete-after-change does not block the merge gate (${cite})`,
          d.result !== null && mergeGateOk(d.result.findings),
          JSON.stringify(d.result?.findings?.map((finding) => finding.code) ?? []),
        );
      }

      // F (mechanical half) — an exhausted budget refuses, and only an
      // operator reason authorises it. No numeric counter extension is needed.
      const budget = await store.createItem({
        type: "ticket", title: "GB-18 exhausted remediation budget", area: "core", profile: "custom", requires: {}, status: "review", prs: ["4321"],
      });
      await store.setDoc(budget.id, "scratch/review", attestation({
        pr: "4321", headSha, verdict: "needs-changes", ticketUpdated: (await store.getItem(budget.id)).updated,
      }));
      const firstReturn = await tool(ctx.server, rec, "move_item", { id: budget.id, status: "implementing", reason: "reviewer asked for changes" });
      rec.check("the first attested return is allowed", firstReturn.ok, firstReturn.message.slice(0, 160));
      rec.bump("reviewCycles");
      await tool(ctx.server, rec, "move_item", { id: budget.id, status: "review" });
      await store.setDoc(budget.id, "scratch/review", attestation({
        pr: "4321", headSha: SHA_B, verdict: "needs-changes", ticketUpdated: (await store.getItem(budget.id)).updated,
      }));
      const exhausted = await tool(ctx.server, rec, "move_item", { id: budget.id, status: "implementing", reason: "reviewer asked again" });
      rec.check(
        `amendment test F (mechanical) — an exhausted budget is refused with REMEDIATION_BUDGET_EXHAUSTED (${cite})`,
        !exhausted.ok && exhausted.message.includes("REMEDIATION_BUDGET_EXHAUSTED"),
        exhausted.message.slice(0, 200),
      );
      const operator = await tool(ctx.server, rec, "move_item", { id: budget.id, status: "implementing", reason: "operator: one deliberate extra round" });
      rec.check(
        `amendment test F (mechanical) — an operator: reason authorises it, so no numeric-counter extension is required (${cite})`,
        operator.ok,
        operator.message.slice(0, 200),
      );
      rec.bump("reviewCycles");
    },
  },

  {
    id: "GB-19",
    title: "The stable-controlled promotion/rollback contract evaluates the recorded v0.4.0 transcript as PASS",
    classes: ["stable-controlled-candidate-promotion-rollback"],
    frd: ["FRD-035"],
    ac: ["FRD-035 AC3", "FRD-035 AC4"],
    fixture: "none",
    mode: "contract",
    async run(ctx) {
      const { rec } = ctx;
      const attempts = RECORDED_TRANSCRIPTS["0.4.0"];
      rec.check("the recorded v0.4.0 transcript is present", Array.isArray(attempts) && attempts.length > 0, `${attempts?.length} attempts`);
      const verdict = evaluatePromotion({ steps: PROMOTION_STEPS, attempts });
      rec.check(
        "it evaluates PASS against the shipped contract",
        verdict.result === "PASS",
        `${verdict.result}: ${verdict.problems.map((problem) => `${problem.step}/${problem.detail}`).join("; ")}`,
      );
      const required = PROMOTION_STEPS.filter((step) => step.required).map((step) => step.id);
      rec.check("the contract names a required backup step", required.includes("backup"), required.join(", "));
      rec.check("the contract names a required rollback step", required.includes("rollback"), required.join(", "));
      rec.check(
        "and requires installation, migration/reconciliation and the complete workflow acceptance sequence before a candidate is marked stable",
        ["install-candidate", "migrate-reconcile", "workflow-acceptance"].every((id) => required.includes(id)),
        required.join(", "),
      );
      const retainedFailures = attempts.filter((attempt) => attempt.result === "FAIL");
      rec.check(
        "retained non-terminal failed attempts are preserved in the record without changing the verdict",
        retainedFailures.length >= 3 && verdict.result === "PASS",
        retainedFailures.map((attempt) => `${attempt.step}#${attempt.exit_code}`).join(", "),
      );
      ctx.shared.promotionSteps = PROMOTION_STEPS.map((step) => step.id);
      rec.check("the contract's step ids are retained in this transcript", ctx.shared.promotionSteps.length === PROMOTION_STEPS.length);
    },
  },
];

// ---------------------------------------------------------------------------
// Fixture surgery helpers used by the reconciliation scenarios
// ---------------------------------------------------------------------------

/**
 * Stamp claim frontmatter directly on a ticket file.
 *
 * Deliberate and narrow: `take_ticket` refuses the board worktree
 * (`worktree-guard.ts`) and a foreign repository is not reachable through it
 * either, so the only honest way to materialise the states reconciliation
 * exists to classify is to write the additive passthrough frontmatter that a
 * different writer would have left behind. This never edits a production file.
 */
function stampClaim(boardRoot, id, fields) {
  const file = ticketFile(boardRoot, id);
  const raw = fs.readFileSync(file, "utf8");
  const end = raw.indexOf("\n---", 4);
  if (!raw.startsWith("---") || end === -1) throw new Error(`stampClaim: ${file} has no frontmatter block`);
  const lines = Object.entries(fields).map(([key, value]) => `${key}: '${String(value).replaceAll("'", "''")}'`);
  fs.writeFileSync(file, `${raw.slice(0, end)}\n${lines.join("\n")}${raw.slice(end)}`, "utf8");
  return file;
}

function readJsonIfPresent(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readChannelLease(boardRoot, channel) {
  const record = readJsonIfPresent(path.join(boardRoot, ".kanmer", "releases", "channels", `${channel}.json`));
  if (!record) throw new Error(`no release channel record for ${channel}`);
  return record;
}

function readAttempt(boardRoot, attemptId) {
  return readJsonIfPresent(path.join(boardRoot, ".kanmer", "releases", "attempts", `${attemptId}.json`));
}

/** Age a release lease on disk; expiry alone must not free a channel. */
function expireChannelLease(boardRoot, channel) {
  const file = path.join(boardRoot, ".kanmer", "releases", "channels", `${channel}.json`);
  const record = readJsonIfPresent(file);
  if (!record) throw new Error(`no release channel record for ${channel}`);
  const aged = new Date(Date.now() - 60 * 60_000).toISOString();
  for (const key of Object.keys(record)) {
    if (/expires/i.test(key)) record[key] = aged;
  }
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return record;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const FIXTURE_FACTORIES = {
  fresh: () => freshFixture(),
  legacy: () => seededFixture({ legacy: true }),
  seeded: () => seededFixture({}),
  repo: () => repoFixture(),
};

/** Which fixtures a selected scenario set needs, in a deterministic order. */
export function requiredFixtures(scenarios) {
  const order = ["fresh", "legacy", "seeded", "repo"];
  const needed = new Set(scenarios.map((scenario) => scenario.fixture).filter((kind) => kind !== "none"));
  // GB-05 observes a second named endpoint, which is the `fresh` board.
  if (needed.has("seeded")) needed.add("fresh");
  return order.filter((kind) => needed.has(kind));
}

function terminalResult(recorder) {
  if (recorder.checks.length === 0) return "FAIL";
  if (recorder.checks.some((entry) => entry.state === "fail")) return "FAIL";
  if (recorder.checks.some((entry) => entry.state === "unavailable")) return "UNAVAILABLE";
  if (recorder.checks.some((entry) => entry.state === "simulated")) return "SIMULATED";
  return "PASS";
}

async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`kanmer/golden: ${error.message}`);
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const bad = unknownClasses(SCENARIOS);
  if (bad.length > 0) {
    console.error(`kanmer/golden: scenarios declare classes FRD-035 does not name: ${bad.join(", ")}`);
    process.exitCode = 2;
    return;
  }

  let selected = SCENARIOS;
  if (options.only) {
    const byId = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));
    const missing = options.only.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      console.error(`kanmer/golden: unknown scenario id(s): ${missing.join(", ")}`);
      process.exitCode = 2;
      return;
    }
    selected = SCENARIOS.filter((scenario) => options.only.includes(scenario.id));
  } else {
    // Fail closed: a class with no scenario cannot be a silent pass (AC1).
    const gaps = coverageGaps(SCENARIOS);
    if (gaps.length > 0) {
      console.error(`kanmer/golden: ${gaps.length} FRD-035 scenario class(es) have no scenario and the run refuses to start:`);
      for (const gap of gaps) console.error(`  - ${gap}`);
      console.error("Add a scenario, or narrow the run with --only for a deliberate diagnostic.");
      process.exitCode = 2;
      return;
    }
  }

  const budgetMs = Number(process.env.KANMER_GOLDEN_BUDGET_MS ?? DEFAULT_BUDGET_MS);
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    console.error(`kanmer/golden: KANMER_GOLDEN_BUDGET_MS must be a positive number, got "${process.env.KANMER_GOLDEN_BUDGET_MS}"`);
    process.exitCode = 2;
    return;
  }

  const startedAt = new Date().toISOString();
  const started = Date.now();
  const fixtures = new Map();
  const servers = new Map();
  const results = [];
  const counters = newCounters();
  const shared = {};
  let serverInfo = null;
  let registryPath = null;

  const cleanup = async () => {
    for (const server of servers.values()) server.stop();
    for (const fixture of fixtures.values()) {
      try {
        await fixture.close();
      } catch (error) {
        console.error(`kanmer/golden: teardown warning for ${fixture.kind}: ${error.message}`);
      }
    }
    if (registryPath) fs.rmSync(registryPath, { force: true });
  };

  try {
    for (const kind of requiredFixtures(selected)) {
      fixtures.set(kind, await FIXTURE_FACTORIES[kind]());
    }
    if (fixtures.size > 0) {
      const seeded = fixtures.get("seeded");
      const fresh = fixtures.get("fresh");
      const endpoints = {};
      if (seeded) endpoints["golden-seeded"] = { boardRoot: seeded.boardRoot };
      if (fresh) endpoints["golden-fresh"] = { boardRoot: fresh.boardRoot };
      if (Object.keys(endpoints).length > 0) {
        const holder = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-golden-registry-"));
        registryPath = path.join(holder, "endpoints.json");
        fs.writeFileSync(registryPath, `${JSON.stringify({ schema: 1, endpoints }, null, 2)}\n`, "utf8");
      }
    }
  } catch (error) {
    console.error(`kanmer/golden: could not materialise the fixture boards: ${error.message}`);
    await cleanup();
    process.exitCode = 2;
    return;
  }

  const env = childEnv(registryPath ? { registry: registryPath } : {});

  // One server process per fixture board: the first locked write in each
  // process costs ~1 s resolving Windows identity, so a process per scenario
  // would dominate the budget (packages/core/vitest.config.ts:1-30).
  const serverFor = async (kind) => {
    if (servers.has(kind)) return servers.get(kind);
    const fixture = fixtures.get(kind);
    const server = startServer({ root: fixture.boardRoot, env });
    const handshake = await initialize(server);
    serverInfo ??= handshake.result?.serverInfo ?? null;
    servers.set(kind, server);
    return server;
  };

  let aborted = null;
  for (const scenario of selected) {
    const elapsed = Date.now() - started;
    if (elapsed > budgetMs) {
      aborted = {
        elapsedMs: elapsed,
        remaining: selected.slice(selected.indexOf(scenario)).map((entry) => entry.id),
      };
      break;
    }
    const rec = Recorder(scenario.id);
    const fixture = scenario.fixture === "none" ? null : fixtures.get(scenario.fixture);
    const scenarioStarted = Date.now();
    let error = null;
    try {
      if (fixture && fixture.meta.git === "unavailable") {
        rec.unavailable(`the ${scenario.fixture} fixture needs git and git is unavailable`, String(fixture.meta.reason ?? ""));
      } else {
        const server = fixture ? await serverFor(scenario.fixture) : null;
        await scenario.run({ rec, server, fixture, fixtures, shared, registryPath });
        if (server && server.parseErrors.length > 0) {
          rec.check("the server wrote nothing unparseable to the transport", false, server.parseErrors.join(" | ").slice(0, 300));
        }
      }
    } catch (thrown) {
      error = thrown;
      // The server buffers stderr and only surfaces it on failure, so a child
      // that never started says why here instead of only "timed out".
      const stderr = servers.get(scenario.fixture)?.stderr?.() ?? "";
      const detail = `${String(thrown?.message ?? thrown)}${stderr ? ` | server stderr: ${stderr.slice(-300)}` : ""}`;
      rec.check("the scenario ran to completion", false, detail.slice(0, 500));
    }
    const result = terminalResult(rec);
    rec.counters.elapsedMs = Date.now() - scenarioStarted;
    for (const [field, value] of Object.entries(rec.counters)) counters[field] = (counters[field] ?? 0) + value;
    results.push({
      id: scenario.id,
      title: scenario.title,
      classes: scenario.classes,
      frd: scenario.frd,
      ac: scenario.ac,
      fixture: scenario.fixture,
      mode: scenario.mode,
      result,
      calls: rec.calls,
      checks: rec.checks,
      counters: rec.counters,
    });
    const failed = rec.checks.filter((entry) => entry.state === "fail" || entry.state === "unavailable");
    console.log(`${result.padEnd(11)} ${scenario.id}  ${scenario.title} (${rec.counters.elapsedMs} ms)`);
    for (const entry of rec.checks) {
      if (entry.state === "pass") continue;
      console.log(`    ${entry.state.toUpperCase()}  ${entry.name}${entry.detail ? ` — ${entry.detail}` : ""}`);
    }
    if (result !== "PASS" && result !== "SIMULATED") {
      const detail = failed.map((entry) => entry.name).join("; ") || String(error?.message ?? "no checks recorded");
      console.log(`::error title=kanmer/golden [${scenario.id}]::${detail.replaceAll("\n", " ").slice(0, 500)}`);
    }
  }

  await cleanup();

  const elapsedMs = Date.now() - started;
  counters.elapsedMs = elapsedMs;
  const passed = results.filter((entry) => entry.result === "PASS" || entry.result === "SIMULATED").length;
  const transcript = {
    version: 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    serverInfo,
    server: process.env.KANMER_SERVER ?? "packages/mcp-server/dist/index.js",
    budgetMs,
    elapsedMs,
    narrowed: options.only ?? null,
    classes: FRD_035_CLASSES,
    coverageGaps: options.only ? null : coverageGaps(SCENARIOS),
    counters,
    promotionSteps: shared.promotionSteps ?? null,
    ...(aborted ? { aborted } : {}),
    scenarios: results,
  };

  const out = options.out
    ? path.resolve(options.out)
    : path.join(repositoryRoot, "dist", "golden", `golden-${startedAt.replaceAll(":", "-")}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(transcript, null, 2)}\n`, "utf8");

  console.log("");
  console.log(`${passed}/${results.length} scenarios passed in ${elapsedMs} ms (budget ${budgetMs} ms)`);
  console.log(`transcript: ${out}`);
  if (aborted) {
    console.log(`::error title=kanmer/golden [BUDGET]::the ${budgetMs} ms budget was exhausted after ${aborted.elapsedMs} ms; not run: ${aborted.remaining.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = passed === results.length ? 0 : 1;
}

// Importing this module must expose SCENARIOS without running anything: the
// same guard `scripts/verify.mjs:39` and `verify-release-assets.mjs:610` use.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main(process.argv.slice(2));
}
