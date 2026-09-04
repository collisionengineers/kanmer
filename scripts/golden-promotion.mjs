// The stable→candidate promotion/rollback rehearsal contract (CORE-119,
// FRD-035 AC3/AC4), plus the operator shell that drives it.
//
// Two halves, deliberately split the way `scripts/verify-release-assets.mjs`
// splits its own:
//
//   PURE   `PROMOTION_STEPS`, `RECORDED_TRANSCRIPTS` and `evaluatePromotion`.
//          No fs, no network, no `process.exit` — everything is decided from
//          the two arguments, which is what makes a golden fixture possible.
//          `scripts/golden-promotion.test.mjs` pins the decision function
//          against the transcript v0.4.0 actually produced.
//   SHELL  An `isMain` operator driver behind strict flags, with NO repo-local
//          default for any environment path. CORE-137 runs it for 0.4.1
//          instead of retyping tool calls through an out-of-repo client.
//
// What this file is NOT: it never installs, never rolls back, never marks a
// candidate stable, and never mutates Git, GitHub or the live board. ADR-0021
// makes the promotion boundary an auditable operator handoff; automating the
// decision would remove the boundary it exists to create.
//
// The contract is RECOVERED, not invented: `PROMOTION_STEPS` is the ordered
// acceptance sequence CORE-136 `plan/plan.md` step 9 defines and its
// `proof/proof.md` records, and `RECORDED_TRANSCRIPTS["0.4.0"]` is that proof
// transcribed. Contract and fixture therefore cannot drift apart without the
// test noticing.
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The ordered promotion acceptance contract.
 *
 * `required` marks the steps FRD-035 AC3 and AC4 name: a candidate is not
 * stable until backup, installation, migration/reconciliation and the complete
 * workflow acceptance sequence have passed, and a rollback rehearsal is part of
 * the record rather than a contingency nobody exercised.
 */
export const PROMOTION_STEPS = Object.freeze([
  {
    id: "backup",
    title: "Back up the live board and retain the prior-stable installer",
    required: true,
    evidence: "archive path, sha256, the board commit it was taken at, and the retained previous stable installer",
  },
  {
    id: "release-verify",
    title: "Prepare, publish and independently verify the candidate release",
    required: true,
    evidence: "`npm run release` prepare/publish, `verify-release-assets --remote-coherent`, `check-updater-package`, and the tag `release-verify` run",
  },
  {
    id: "packaged-boot",
    title: "Boot the packaged candidate against a copied board",
    required: true,
    evidence: "`KANMER_SMOKE=1 KANMER_OPEN=<copy>` on the packaged binary reaching ready-to-show",
  },
  {
    id: "copied-board-smoke",
    title: "Drive the standalone candidate server against the copied board",
    required: true,
    evidence: "`KANMER_ROOT=<copy> npm run smoke:headless` with the host files untouched",
  },
  {
    id: "install-candidate",
    title: "Install the candidate over the prior stable",
    required: true,
    evidence: "installer exit code and the activated runtime generation; a refusal while the GUI is running is expected evidence, not a failure",
  },
  {
    id: "migrate-reconcile",
    title: "Observe migration and reconciliation on the copied board",
    required: true,
    evidence: "identity, storage format and `project.json` allocation observed on the copy, and a `reconcile_ticket` dry run that wrote nothing",
  },
  {
    id: "workflow-acceptance",
    title: "Run the complete workflow acceptance sequence on the copied board",
    required: true,
    evidence: "get_status, list_projects, create_item, lease acquire/renew/stale-renew/release, an unattested review→implementing refusal, an `operator:` reason authorising it, a `reconcile_ticket` dry run, and `release_channel` acquire+complete",
  },
  {
    id: "rollback",
    title: "Rehearse the rollback to the previous stable and back",
    required: true,
    evidence: "the retained prior-stable installer restores the previous release and the live board is proven unchanged in both directions",
  },
  {
    id: "cut-over",
    title: "Cut the live control plane over to the candidate",
    required: true,
    evidence: "live `get_status.server.version` is the candidate, with the same project fingerprint and ticket count",
  },
  {
    id: "post-cut-over",
    title: "Confirm the repository artefacts after cut-over",
    required: true,
    evidence: "`npm run verify:agents-block` and a live `get_status.repo` report",
  },
]);

const PROMOTION_STEP_IDS = Object.freeze(PROMOTION_STEPS.map((step) => step.id));

/**
 * The first recorded passing instance of this contract: v0.4.0, transcribed
 * from CORE-136 `proof/proof.md` version `2b12c27d1cd31641`
 * (`merged_sha` `7e114cd117ef720c20797e2bf9f5cf58643a94e6`, `result: PASS`),
 * plus the promotion step-1 values recorded in that ticket's `scratch/notes.md`.
 *
 * Two of the recorded commands evidence two contract steps each, so they are
 * transcribed once per step and each entry names the proof attempt it came
 * from in `transcribed_from`. Nothing here is a summary of a summary: every
 * `command`, `cwd`, `exit_code` and `result` is the recorded value.
 *
 * The retained non-terminal failures are deliberately kept — two prepare
 * refusals and the installer's exit-2 refusal with the GUI running. FRD-035 AC4
 * is explicit that immutable failed-attempt evidence is not discarded, and
 * `golden-promotion.test.mjs` asserts they do not change the verdict.
 */
export const RECORDED_TRANSCRIPTS = Object.freeze({
  "0.4.0": Object.freeze([
    {
      step: "backup",
      attempted_at: "2026-09-01T22:32:47Z",
      command: "board archive + retained prior-stable installer (CORE-136 scratch/notes.md, Promotion step 1)",
      cwd: "KanmerBackups",
      exit_code: 0,
      result: "PASS",
      summary:
        "kanmer-board-20260901T223247Z.zip (6,155,447 bytes), sha256 90fbb8438ef0ea6aad2226837de1b38b9f4dbea597e017bf75c6e14be2ef6539, board commit 41f795f9100d27b39f34262417362d626ade7a2b (= origin/kanmer-board, worktree clean); retained rollback installer Kanmer-Setup-0.3.12.exe (sha256 prefix 82b6fcd73f299aa2).",
      transcribed_from: "CORE-136 scratch/notes.md § Promotion step 1",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T20:25:00Z",
      command: "npm run release -- 0.4.0 --ticket CORE-136",
      cwd: "kanmer-release-0.4.0",
      exit_code: 1,
      result: "FAIL",
      summary: "Prepare attempt 1 refused: working tree not clean. Retained; no Git or remote state written.",
      transcribed_from: "proof attempt 1",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T20:26:00Z",
      command: "npm run release -- 0.4.0 --ticket CORE-136",
      cwd: "kanmer-release-0.4.0",
      exit_code: 1,
      result: "FAIL",
      summary:
        "Prepare attempt 2: verify rail, bump, bundle, MCPB and plugin:check green, then the step-6 GUI build failed (createHash not exported by __vite-browser-external). Root cause fixed by GUI-146; no branch, PR or tag created.",
      transcribed_from: "proof attempt 2",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T21:17:00Z",
      command: "npm run release -- 0.4.0 --ticket CORE-136",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "Prepare attempt 3 on main 3a98bf7c: full rail incl. GUI build green; release/v0.4.0 pushed; PR #309 opened at 1d6720c9.",
      transcribed_from: "proof attempt 3",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T22:32:13Z",
      command: "gh pr merge 309 --squash",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary: "Merged as 7e114cd117ef720c20797e2bf9f5cf58643a94e6 after independent review, hosted verify success and kanmer-gate success.",
      transcribed_from: "proof attempt 4",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T22:33:49Z",
      command: "npm run release -- 0.4.0 --publish --release-commit 7e114cd117ef720c20797e2bf9f5cf58643a94e6",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "Verify rail green; GUI built; tag v0.4.0 pushed; one --publish never package; draft release created, 4 assets uploaded, verified byte-identical and published.",
      transcribed_from: "proof attempt 5",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T22:55:00Z",
      command: "node scripts/verify-release-assets.mjs 0.4.0 --remote-coherent",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "PASS: v0.4.0 is complete and its public manifest matches the published installer bytes (4 assets).",
      transcribed_from: "proof attempt 6",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T22:55:00Z",
      command: "node scripts/check-updater-package.mjs --out apps/gui/release",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "updater package OK (8 checks).",
      transcribed_from: "proof attempt 7",
    },
    {
      step: "packaged-boot",
      attempted_at: "2026-09-01T22:56:00Z",
      command: "KANMER_SMOKE=1 KANMER_OPEN=<copied board> KANMER_SMOKE_CAPTURE_PATH=<png> apps/gui/release/win-unpacked/Kanmer.exe --user-data-dir=<fresh>",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "Packaged boot smoke: renderer reached ready-to-show; 118,602-byte PNG captured.",
      transcribed_from: "proof attempt 8",
    },
    {
      step: "copied-board-smoke",
      attempted_at: "2026-09-01T22:56:00Z",
      command: "KANMER_ROOT=<copied board> npm run smoke:headless",
      cwd: "kanmer-release-0.4.0",
      exit_code: 0,
      result: "PASS",
      summary: "Standalone 0.4.0 bundle against the copied board: explicit root reported, headless write/read, host files untouched.",
      transcribed_from: "proof attempt 9",
    },
    {
      step: "release-verify",
      attempted_at: "2026-09-01T22:59:00Z",
      command: "gh run watch 33567978927 (release.yml release-verify on tag v0.4.0)",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary: "Tag workflow release-verify: success.",
      transcribed_from: "proof attempt 10",
    },
    {
      step: "install-candidate",
      attempted_at: "2026-09-01T23:00:00Z",
      command: "Kanmer-Setup-0.4.0.exe /S (attempt 1, GUI still running)",
      cwd: ".",
      exit_code: 2,
      result: "FAIL",
      summary:
        "Installer refused while three Kanmer.exe processes remained under the install root (customCheckAppRunning fails closed, GUI-064). Retained as evidence of the installer gate; nothing was modified.",
      transcribed_from: "proof attempt 11",
    },
    {
      step: "install-candidate",
      attempted_at: "2026-09-01T23:01:00Z",
      command: "taskkill /F /IM Kanmer.exe; Kanmer-Setup-0.4.0.exe /S",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary: "Installer exit 0 in 18 s; %LOCALAPPDATA%\\Kanmer\\mcp\\current -> 0.4.0-33768; launcher --probe healthy.",
      transcribed_from: "proof attempt 12",
    },
    {
      step: "migrate-reconcile",
      attempted_at: "2026-09-01T22:57:00Z",
      command: "installed launcher on the copied board: get_status, reconcile_ticket dry run",
      cwd: "KanmerBackups/tools",
      exit_code: 0,
      result: "PASS",
      summary:
        "Server 0.4.0 packaged, format 3, project.json allocated once on first write; list_projects bound to the logical project; reconcile_ticket dry run returned EVIDENCE_INCONCLUSIVE (the copy has no Git/GitHub context) and wrote nothing.",
      transcribed_from: "proof attempt 13 (migration/reconciliation half)",
    },
    {
      step: "workflow-acceptance",
      attempted_at: "2026-09-01T22:57:00Z",
      command:
        "installed launcher on the copied board: get_status / list_projects / create_item / take_ticket take+renew+stale-renew+release / move_item review->implementing without attestation / move_item with operator: reason / release_channel acquire+complete",
      cwd: "KanmerBackups/tools",
      exit_code: 0,
      result: "PASS",
      summary:
        "Lease acquired (lease_id, revision 1, 30-minute expiry), renew -> revision 2, stale renew refused, release ok; unattested review->implementing refused with REVIEW_RETURN_NEEDS_ATTESTATION, an operator: reason authorised it and review_round became 1; release_channel acquire minted main@1 with a candidate identity and complete cleared the lease while retaining the immutable attempt.",
      transcribed_from: "proof attempt 13 (workflow-acceptance half)",
    },
    {
      step: "rollback",
      attempted_at: "2026-09-01T23:03:00Z",
      command: "Kanmer-Setup-0.3.12.exe /S; launcher get_status (live repo); Kanmer-Setup-0.4.0.exe /S; launcher get_status (live repo)",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary:
        "Rollback rehearsal: 0.3.12 installer exit 0, current -> 0.3.12-17560, live board served at 0.3.12 with fingerprint kanmer-proj-v1:5dbaab31... and 375 tickets, board worktree clean; the candidate installer then restored 0.4.0 with the same fingerprint and count.",
      transcribed_from: "proof attempt 14",
    },
    {
      step: "cut-over",
      attempted_at: "2026-09-01T23:04:00Z",
      command: "launcher get_status (live repo)",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary:
        "Live control plane is the candidate: %LOCALAPPDATA%\\Kanmer\\mcp\\current -> 0.4.0-28216; get_status reports server.version 0.4.0, fingerprint kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268, format 3, 375 tickets.",
      transcribed_from: "proof attempt 14 and the proof Outcome paragraph",
    },
    {
      step: "post-cut-over",
      attempted_at: "2026-09-01T23:05:00Z",
      command: "npm run verify:agents-block; launcher get_status (live repo) .repo",
      cwd: ".",
      exit_code: 0,
      result: "PASS",
      summary: "31/31 checks passed; installed 0.4.0 reports repo upToDate: true (board-config compensated only), so no kanmer-setup refresh is required.",
      transcribed_from: "proof attempt 15",
    },
  ]),
});

/**
 * PURE. No fs, no network, no `process.exit` — everything below is decided
 * from `steps` and `attempts`.
 *
 *   PASS       every required step has at least one terminal PASS attempt, and
 *              the rollback step passed.
 *   FAIL       a required step has terminal attempts but none of them passed.
 *   INCOMPLETE a required step has no terminal attempt at all.
 *
 * Only `PASS` and `FAIL` are terminal. A `SKIPPED` (dry run) or `UNAVAILABLE`
 * (operator step not driven here) entry is retained in the record but is not
 * evidence, so a rehearsal that ran nothing is INCOMPLETE rather than passing
 * or failing on absence.
 *
 * Retained non-terminal failures never turn a record FAIL: the rule is "at
 * least one PASS", not "no FAIL". That is exactly what keeps the two prepare
 * refusals and the installer's exit-2 refusal in the immutable record.
 */
export const TERMINAL_RESULTS = Object.freeze(["PASS", "FAIL"]);

export function evaluatePromotion({ steps, attempts }) {
  const list = Array.isArray(steps) ? steps : [];
  const recorded = Array.isArray(attempts) ? attempts : [];
  const problems = [];
  for (const step of list) {
    if (!step?.required) continue;
    const mine = recorded.filter((attempt) => attempt?.step === step.id && TERMINAL_RESULTS.includes(attempt?.result));
    if (mine.length === 0) {
      problems.push({
        step: step.id,
        severity: "incomplete",
        detail: `required step "${step.id}" has no terminal recorded attempt`,
        fix: `run the step and append a typed attempt recording ${step.evidence}`,
      });
      continue;
    }
    if (!mine.some((attempt) => attempt?.result === "PASS")) {
      problems.push({
        step: step.id,
        severity: "failed",
        detail: `required step "${step.id}" has ${mine.length} terminal attempt(s) and none passed`,
        fix: `resolve the failure, re-run the step and append the passing attempt; retain every failed attempt`,
      });
    }
  }
  const rollback = list.find((step) => step.id === "rollback");
  if (!rollback) {
    problems.push({
      step: "rollback",
      severity: "incomplete",
      detail: "the contract declares no rollback step, so a failed promotion has no recorded restore path",
      fix: "add a required `rollback` step naming the retained prior-stable installer",
    });
  }
  const failed = problems.some((problem) => problem.severity === "failed");
  const incomplete = problems.some((problem) => problem.severity === "incomplete");
  return { result: failed ? "FAIL" : incomplete ? "INCOMPLETE" : "PASS", problems };
}

/** Every step id, for a caller that wants the contract shape without the steps. */
export function promotionStepIds(steps = PROMOTION_STEPS) {
  return steps.map((step) => step.id);
}

// ---------------------------------------------------------------------------
// Operator shell (isMain only). Nothing above this line touches the outside
// world; nothing below it runs on import.
// ---------------------------------------------------------------------------

const FLAGS = new Set([
  "--candidate",
  "--stable",
  "--board-backup",
  "--board-copy",
  "--stable-installer",
  "--candidate-installer",
  "--launcher",
  "--out",
]);
const SWITCHES = new Set(["--dry-run"]);

export class PromotionUsageError extends Error {}

/**
 * Strict flags with NO repo-local default for any environment path: an
 * installer, a board copy and a launcher are properties of the operator's
 * machine, and baking one in is how a rehearsal quietly points at the wrong
 * thing.
 */
export function parsePromotionArgs(argv) {
  const options = { dryRun: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const [name, inline] = arg.startsWith("--") && arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (SWITCHES.has(name)) {
      if (inline !== undefined) throw new PromotionUsageError(`${name} takes no value`);
      if (seen.has(name)) throw new PromotionUsageError(`duplicate flag "${name}"`);
      seen.add(name);
      options.dryRun = true;
      continue;
    }
    if (!FLAGS.has(name)) throw new PromotionUsageError(`unknown flag "${arg}"`);
    if (seen.has(name)) throw new PromotionUsageError(`duplicate flag "${name}"`);
    seen.add(name);
    const value = inline ?? argv[++index];
    if (value === undefined || value.startsWith("--")) throw new PromotionUsageError(`${name} requires a value`);
    options[name.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  if (!options.candidate) throw new PromotionUsageError("--candidate <version> is required");
  return options;
}

export function promotionUsage() {
  return [
    "usage: node scripts/golden-promotion.mjs --candidate <version> [--stable <version>]",
    "         [--board-backup <zip>] [--board-copy <dir>]",
    "         [--stable-installer <exe>] [--candidate-installer <exe>]",
    "         [--launcher <cmd>] [--out <path>] [--dry-run]",
    "",
    "Rehearses the FRD-035 promotion contract against a COPIED board and reports.",
    "It never installs, never rolls back, never marks a candidate stable and never",
    "mutates Git, GitHub or the live board — those stay operator actions (ADR-0021).",
    "",
    "  --dry-run  record every step as skipped and still evaluate the contract shape",
    "",
    "  exit 0 = the record evaluates PASS; 1 = FAIL or INCOMPLETE; 2 = could not run.",
  ].join("\n");
}

/** The copied-board acceptance sequence, driven through the harness's call(). */
async function driveCopiedBoard(options) {
  const { call, initialize } = await import("../packages/mcp-server/src/golden-harness.mjs");
  const { spawn } = await import("node:child_process");
  const proc = spawn(options.launcher, [], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true, shell: true });
  const pending = new Map();
  let buffer = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      const resolve = message.id !== undefined ? pending.get(message.id) : undefined;
      if (resolve) {
        pending.delete(message.id);
        resolve(message);
      }
    }
  });
  let nextId = 1;
  const server = {
    send: (method, params) => {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`timed out waiting for ${method}`));
        }, 30_000);
        pending.set(id, (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) })}\n`);
      });
    },
    notify: (method, params) => {
      proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) })}\n`);
    },
    stop: () => {
      proc.stdin.end();
      proc.kill();
    },
  };
  try {
    await initialize(server, "kanmer-golden-promotion");
    const status = await call(server, "get_status");
    const projects = await call(server, "list_projects");
    const created = await call(server, "create_item", { type: "ticket", title: `Promotion rehearsal ${options.candidate}` });
    return { status, projects, created };
  } finally {
    server.stop();
  }
}

function attemptFor(step, { result, exitCode, summary, command, cwd }) {
  return {
    step: step.id,
    attempted_at: new Date().toISOString(),
    command,
    cwd,
    exit_code: exitCode,
    result,
    summary,
  };
}

async function mainPromotion(argv) {
  let options;
  try {
    options = parsePromotionArgs(argv);
  } catch (error) {
    console.error(`kanmer/golden-promotion: ${error.message}`);
    console.error(promotionUsage());
    process.exitCode = 2;
    return;
  }

  const attempts = [];
  for (const step of PROMOTION_STEPS) {
    if (options.dryRun) {
      attempts.push(attemptFor(step, {
        result: "SKIPPED",
        exitCode: null,
        summary: `dry run: ${step.evidence}`,
        command: "(dry run)",
        cwd: process.cwd(),
      }));
      console.log(`SKIPPED      ${step.id}  ${step.title}`);
      continue;
    }
    if (step.id === "workflow-acceptance" && options.launcher && options.boardCopy) {
      try {
        const observed = await driveCopiedBoard(options);
        const ok = observed.status.ok && observed.projects.ok && observed.created.ok;
        attempts.push(attemptFor(step, {
          result: ok ? "PASS" : "FAIL",
          exitCode: ok ? 0 : 1,
          summary: `copied-board acceptance through ${options.launcher}: get_status ${observed.status.ok}, list_projects ${observed.projects.ok}, create_item ${observed.created.ok}`,
          command: `${options.launcher} (get_status, list_projects, create_item)`,
          cwd: options.boardCopy,
        }));
        console.log(`${ok ? "PASS" : "FAIL"}         ${step.id}  ${step.title}`);
      } catch (error) {
        attempts.push(attemptFor(step, {
          result: "UNAVAILABLE",
          exitCode: null,
          summary: `the copied-board sequence could not run: ${error.message}`,
          command: String(options.launcher),
          cwd: String(options.boardCopy),
        }));
        console.log(`UNAVAILABLE  ${step.id}  ${step.title} — ${error.message}`);
      }
      continue;
    }
    attempts.push(attemptFor(step, {
      result: "UNAVAILABLE",
      exitCode: null,
      summary: `operator step: run it and append a typed attempt recording ${step.evidence}`,
      command: "(operator action)",
      cwd: process.cwd(),
    }));
    console.log(`UNAVAILABLE  ${step.id}  ${step.title} — operator action, not automated (ADR-0021)`);
  }

  const verdict = evaluatePromotion({ steps: PROMOTION_STEPS, attempts });
  const transcript = {
    version: 1,
    candidate: options.candidate,
    stable: options.stable ?? null,
    dryRun: options.dryRun === true,
    inputs: {
      boardBackup: options.boardBackup ?? null,
      boardCopy: options.boardCopy ?? null,
      stableInstaller: options.stableInstaller ?? null,
      candidateInstaller: options.candidateInstaller ?? null,
      launcher: options.launcher ?? null,
    },
    steps: PROMOTION_STEP_IDS,
    attempts,
    verdict,
    recordedInstances: Object.keys(RECORDED_TRANSCRIPTS),
  };
  if (options.out) {
    const fs = await import("node:fs");
    const target = path.resolve(options.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(transcript, null, 2)}\n`, "utf8");
    console.log(`transcript: ${target}`);
  }

  console.log("");
  console.log(`contract shape: ${PROMOTION_STEP_IDS.length} steps, ${PROMOTION_STEPS.filter((step) => step.required).length} required`);
  console.log(`verdict: ${verdict.result}`);
  if (options.dryRun) {
    // A dry run proves the contract SHAPE, not a promotion: nothing ran, so
    // INCOMPLETE is the honest verdict and exit 0 reports a coherent contract.
    const reference = evaluatePromotion({ steps: PROMOTION_STEPS, attempts: RECORDED_TRANSCRIPTS["0.4.0"] });
    console.log(`dry run: every step recorded skipped; the recorded v0.4.0 instance still evaluates ${reference.result}`);
    process.exitCode = verdict.result === "INCOMPLETE" && reference.result === "PASS" ? 0 : 2;
    return;
  }
  for (const problem of verdict.problems) console.log(`  ${problem.severity}: ${problem.detail}\n    fix: ${problem.fix}`);
  process.exitCode = verdict.result === "PASS" ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await mainPromotion(process.argv.slice(2));
}
