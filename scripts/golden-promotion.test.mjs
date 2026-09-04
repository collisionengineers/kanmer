// Cover for the PURE half of the promotion contract (CORE-119, FRD-035
// AC3/AC4). Auto-discovered by `scripts/test-scripts.mjs`, which enumerates
// direct `scripts/*.test.mjs` children, so this needs no wiring: it is already
// inside `npm test`, which is already a `VERIFY_STEPS` entry.
//
// The fixture is `RECORDED_TRANSCRIPTS["0.4.0"]` — the transcript v0.4.0
// actually produced, transcribed from CORE-136 `proof/proof.md` version
// `2b12c27d1cd31641`. This is the `verify-release-assets.test.mjs` shape: a
// pure comparator pinned by captured real evidence.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PROMOTION_STEPS,
  RECORDED_TRANSCRIPTS,
  evaluatePromotion,
  parsePromotionArgs,
  PromotionUsageError,
  promotionStepIds,
} from "./golden-promotion.mjs";

const GOLDEN = RECORDED_TRANSCRIPTS["0.4.0"];

test("the recorded v0.4.0 transcript evaluates PASS against the shipped contract", () => {
  const verdict = evaluatePromotion({ steps: PROMOTION_STEPS, attempts: GOLDEN });
  assert.equal(verdict.result, "PASS", JSON.stringify(verdict.problems, null, 2));
  assert.deepEqual(verdict.problems, []);
});

test("every PROMOTION_STEPS id is referenced by at least one attempt in the recorded transcript", () => {
  const referenced = new Set(GOLDEN.map((attempt) => attempt.step));
  const orphans = promotionStepIds().filter((id) => !referenced.has(id));
  assert.deepEqual(orphans, [], `contract steps with no recorded evidence: ${orphans.join(", ")}`);
  const unknown = [...referenced].filter((id) => !promotionStepIds().includes(id));
  assert.deepEqual(unknown, [], `attempts naming a step the contract does not declare: ${unknown.join(", ")}`);
});

test("removing the backup attempt is INCOMPLETE, never PASS — AC3's 'verifies backup' is structural", () => {
  const withoutBackup = GOLDEN.filter((attempt) => attempt.step !== "backup");
  const verdict = evaluatePromotion({ steps: PROMOTION_STEPS, attempts: withoutBackup });
  assert.equal(verdict.result, "INCOMPLETE");
  assert.ok(verdict.problems.some((problem) => problem.step === "backup" && problem.severity === "incomplete"));
});

test("a failed rollback attempt yields FAIL — AC4's failed-promotion fixture", () => {
  const failedRollback = GOLDEN.map((attempt) =>
    attempt.step === "rollback" ? { ...attempt, result: "FAIL", exit_code: 1 } : attempt);
  const verdict = evaluatePromotion({ steps: PROMOTION_STEPS, attempts: failedRollback });
  assert.equal(verdict.result, "FAIL");
  assert.ok(verdict.problems.some((problem) => problem.step === "rollback" && problem.severity === "failed"));
});

test("the retained non-terminal failures are preserved and do not change the PASS verdict", () => {
  const retained = GOLDEN.filter((attempt) => attempt.result === "FAIL");
  assert.equal(retained.length, 3, "two prepare refusals plus the installer's exit-2 refusal");
  assert.ok(retained.some((attempt) => attempt.step === "install-candidate" && attempt.exit_code === 2));
  assert.equal(retained.filter((attempt) => attempt.step === "release-verify").length, 2);
  assert.equal(evaluatePromotion({ steps: PROMOTION_STEPS, attempts: GOLDEN }).result, "PASS");
});

test("a contract with no rollback step cannot pass, however complete its attempts are", () => {
  const withoutRollback = PROMOTION_STEPS.filter((step) => step.id !== "rollback");
  const verdict = evaluatePromotion({ steps: withoutRollback, attempts: GOLDEN });
  assert.notEqual(verdict.result, "PASS");
  assert.ok(verdict.problems.some((problem) => problem.step === "rollback"));
});

test("a step recorded only as skipped or unavailable is not evidence", () => {
  const skipped = PROMOTION_STEPS.map((step) => ({ step: step.id, result: "SKIPPED" }));
  assert.equal(evaluatePromotion({ steps: PROMOTION_STEPS, attempts: skipped }).result, "INCOMPLETE");
  const unavailable = PROMOTION_STEPS.map((step) => ({ step: step.id, result: "UNAVAILABLE" }));
  assert.equal(evaluatePromotion({ steps: PROMOTION_STEPS, attempts: unavailable }).result, "INCOMPLETE");
});

test("backup, install-candidate, migrate-reconcile, workflow-acceptance and rollback are required (AC3/AC4)", () => {
  const required = PROMOTION_STEPS.filter((step) => step.required).map((step) => step.id);
  for (const id of ["backup", "install-candidate", "migrate-reconcile", "workflow-acceptance", "rollback"]) {
    assert.ok(required.includes(id), `${id} must be a required step`);
  }
});

test("evaluatePromotion performs no I/O: a frozen input is accepted and nothing is written", () => {
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-golden-promotion-io-"));
  try {
    const before = fs.readdirSync(probe);
    const frozen = Object.freeze({ steps: Object.freeze(PROMOTION_STEPS), attempts: Object.freeze(GOLDEN) });
    const verdict = evaluatePromotion(frozen);
    assert.equal(verdict.result, "PASS");
    assert.deepEqual(fs.readdirSync(probe), before);
  } finally {
    fs.rmSync(probe, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});

test("the operator shell refuses a missing --candidate and every unknown or duplicate flag", () => {
  assert.throws(() => parsePromotionArgs([]), PromotionUsageError);
  assert.throws(() => parsePromotionArgs(["--stable", "0.4.0"]), PromotionUsageError);
  assert.throws(() => parsePromotionArgs(["--candidate", "0.4.1", "--bogus", "x"]), PromotionUsageError);
  assert.throws(() => parsePromotionArgs(["--candidate", "0.4.1", "--candidate", "0.4.2"]), PromotionUsageError);
  assert.throws(() => parsePromotionArgs(["--candidate"]), PromotionUsageError);
  const options = parsePromotionArgs(["--candidate", "0.4.1", "--stable", "0.4.0", "--dry-run", "--board-copy", "C:/tmp/copy"]);
  assert.equal(options.candidate, "0.4.1");
  assert.equal(options.stable, "0.4.0");
  assert.equal(options.dryRun, true);
  assert.equal(options.boardCopy, "C:/tmp/copy");
});

test("no environment path has a repo-local default", () => {
  const options = parsePromotionArgs(["--candidate", "0.4.1"]);
  for (const key of ["boardBackup", "boardCopy", "stableInstaller", "candidateInstaller", "launcher", "out"]) {
    assert.equal(options[key], undefined, `${key} must have no default`);
  }
});
