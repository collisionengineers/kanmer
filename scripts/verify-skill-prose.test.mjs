import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { removeTreeWithRetrySync } from "../packages/core/dist/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "verify-skill-prose.mjs");

test("rejects a v2 stage sequence in AGENTS.md", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-skill-prose-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(
      join(fixture, "AGENTS.md"),
      "Stages: backlog → researching → planning → implementing → review → verifying → done\n",
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /AGENTS\.md:1/);
    assert.match(result.stdout, /no v2 stage names/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("rejects a groom skill without the board-vs-reality sweep contract", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-groom-sweep-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Clean fixture.\n");

    const groom = join(fixture, "plugins", "kanmer", "skills", "kanmer-groom", "SKILL.md");
    writeFileSync(groom, readFileSync(groom, "utf8").replace(/`main`\s+history/, "repository history"));

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /kanmer-groom keeps the bounded, evidence-first, proposal-only sweep/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("agents template keeps the required user-owned guide contract", () => {
  const template = readFileSync(
    join(root, "plugins", "kanmer", "skills", "kanmer-docs", "assets", "agents-template.md"),
    "utf8",
  );
  const skill = readFileSync(join(root, "plugins", "kanmer", "skills", "kanmer-docs", "SKILL.md"), "utf8");

  assert.deepEqual(
    [...template.matchAll(/^## (Commands|Architecture map|Conventions|Gotchas|Verification)$/gm)].map((m) => m[1]),
    ["Commands", "Architecture map", "Conventions", "Gotchas", "Verification"],
  );
  assert.match(template, /^\| Command \| Purpose \|$/m);
  assert.ok(template.indexOf("### Deterministic checks") < template.indexOf("### Manual or environment-dependent checks"));
  assert.match(template, /outside Kanmer's managed[\s\S]*marker-delimited instruction block/i);
  assert.doesNotMatch(template, /<!-- kanmer:instructions:(?:start|end)/);
  assert.match(skill, /assets\/agents-template\.md/);
  assert.match(skill, /only when the file is absent/i);
  assert.match(skill, /preserve its human-authored prose/i);
});

test("setup reconciles the AGENTS guide skeleton without taking ownership of human prose", () => {
  const setup = readFileSync(join(root, "plugins", "kanmer", "skills", "kanmer-setup", "SKILL.md"), "utf8");

  assert.match(setup, /kanmer-docs\/assets\/agents-template\.md/);
  assert.match(setup, /No `AGENTS\.md`:[\s\S]*copy the canonical/i);
  assert.match(setup, /Existing `AGENTS\.md`:[\s\S]*do not replace, complete, reformat/i);
  assert.match(setup, /case-insensitively at Markdown headings of any depth/i);
  assert.match(setup, /Commands[\s\S]*Architecture map[\s\S]*Conventions[\s\S]*Gotchas[\s\S]*Verification/);
  assert.match(setup, /Malformed markers:[\s\S]*stop/i);
  assert.match(setup, /Source: AGENTS\.md skeleton created by kanmer-setup/);
  assert.match(setup, /instead of creating a duplicate/i);
});

test("greenfield playbook stays linked from setup and protects bounded planning", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const playbook = readFileSync(join(root, "docs", "manual", "greenfield.md"), "utf8");
  const setup = readFileSync(join(root, "plugins", "kanmer", "skills", "kanmer-setup", "SKILL.md"), "utf8");

  for (const term of [
    "Lean",
    "Standard",
    "High-assurance",
    "one-page brief",
    "non-goals",
    "walking skeleton",
    "first horizon",
    "first real release",
  ]) {
    assert.match(playbook, new RegExp(term, "i"));
  }
  assert.match(playbook, /Do not create a lifetime backlog[\s\S]*walking skeleton/i);
  assert.match(setup, /docs\/manual\/greenfield\.md/);
  assert.match(setup, /brief-first interview[\s\S]*confirmation before board creation/i);
});

test("auto prose validator rejects the legacy unbounded serial fallback", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-auto-serial-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const auto = join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", "SKILL.md");
    const body = readFileSync(auto, "utf8");
    writeFileSync(
      auto,
      body.replace(
        /If parallel worker dispatch is unavailable before a worker starts,[\s\S]*?Serial mode permits only one active or uncertain ticket\./,
        "If your host has no subagent mechanism, run the same waves sequentially — the lane partition still tells you the safe order.\n\nSerial mode permits only one active or uncertain ticket.",
      ),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /no unbounded serial fallback/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("auto prose validator rejects partial-roster success language", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-auto-stop-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const auto = join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", "SKILL.md");
    writeFileSync(auto, `${readFileSync(auto, "utf8")}\nContinue until every ticket is done.\n`);

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /no partial completion presented as success/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("review prose validator rejects the deleted legacy review-asset claim", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-review-assets-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const review = join(fixture, "plugins", "kanmer", "skills", "kanmer-review", "SKILL.md");
    writeFileSync(
      review,
      `${readFileSync(review, "utf8")}\nThe legacy \`pr-*\` review assets remain untouched here; SKILL-015 owns their deletion.\n`,
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /no stale legacy review-asset prose/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects a resumed execution flow that recreates its worktree", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-execute-resume-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    writeFileSync(
      execute,
      readFileSync(execute, "utf8").replace(
        "Only when `packet.ticket.taken` is absent, create the worktree",
        "Create the worktree for every ready packet",
      ),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /kanmer-execute separates resumed and fresh worktree flows/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects a resumed flow without repository and retained-handoff checks", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-execute-resume-safety-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    writeFileSync(
      execute,
      readFileSync(execute, "utf8")
        .replace("git -C <source-repository-root> rev-parse --git-common-dir", "git -C <source-repository-root> status")
        .replace("Do not release a paused ticket", "Release a paused ticket"),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /kanmer-execute validates resumed repository, location, and pause handoff/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects document writes on refusal and closeout release of paused work", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-resume-handoff-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    const closeout = join(fixture, "plugins", "kanmer", "skills", "kanmer-closeout", "SKILL.md");
    writeFileSync(
      execute,
      readFileSync(execute, "utf8").replace(
        "in the external hand-off and stop without mutating the ticket",
        "in scratch and stop",
      ),
    );
    writeFileSync(
      closeout,
      readFileSync(closeout, "utf8").replace(
        "This is not closeout. Leave the ticket taken",
        "Release the ticket before a later worker resumes it",
      ),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /ready:false refusal externally handed off and read-only/);
    assert.match(result.stdout, /closeout preserves a paused ticket's resume metadata/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects a review flow that parks needs-changes in Review or opens a second PR", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-remediation-loop-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const review = join(fixture, "plugins", "kanmer", "skills", "kanmer-review", "SKILL.md");
    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    writeFileSync(
      review,
      `${readFileSync(review, "utf8")}\nIf changes are needed, write needs-changes, leave the ticket in Review, and do not merge.\n`,
    );
    writeFileSync(
      execute,
      readFileSync(execute, "utf8").replace("never open a second PR for the same ticket", "open a fresh PR for each round"),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-review takes the sanctioned same-PR return/);
    assert.match(result.stdout, /FAIL {2}kanmer-execute re-enters on the existing PR/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects incomplete protected-batch execution, review, and closeout contracts", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-protected-batch-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    const review = join(fixture, "plugins", "kanmer", "skills", "kanmer-review", "SKILL.md");
    const closeout = join(fixture, "plugins", "kanmer", "skills", "kanmer-closeout", "SKILL.md");
    writeFileSync(
      execute,
      readFileSync(execute, "utf8").replace(
        "one standalone `Kanmer: <ID>` footer\nfor every member in the complete frozen roster",
        "one leader-only Kanmer footer",
      ),
    );
    writeFileSync(
      review,
      readFileSync(review, "utf8").replace(
        "a separate, member-owned whole-file `scratch/review.md` attestation\nfor every member in the complete frozen roster",
        "one shared review record for the batch leader",
      ),
    );
    writeFileSync(
      closeout,
      readFileSync(closeout, "utf8")
        .replace("first call `list_items include_archived: true`", "inspect only the active board")
        .replace(
          "After that all-terminal check, keep the manifest linked and do not release any\nmember yet.",
          "After that all-terminal check, release every member before shared Git cleanup.",
        ),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-execute emits the complete frozen batch footer roster/);
    assert.match(result.stdout, /FAIL {2}kanmer-review writes one member-owned exact-head pass attestation per roster ticket/);
    assert.match(result.stdout, /FAIL {2}kanmer-closeout discovers archived batch members by exact batch id/);
    assert.match(result.stdout, /FAIL {2}kanmer-closeout retains the all-terminal manifest through shared Git cleanup before member release/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects batch run, renewal CAS, manifest projection, and fresh closeout regressions", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-protected-batch-remediation-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    const review = join(fixture, "plugins", "kanmer", "skills", "kanmer-review", "SKILL.md");
    const closeout = join(fixture, "plugins", "kanmer", "skills", "kanmer-closeout", "SKILL.md");
    const toolReference = join(
      fixture,
      "plugins",
      "kanmer",
      "skills",
      "kanmer-tickets",
      "references",
      "tool-reference.md",
    );

    writeFileSync(
      execute,
      readFileSync(execute, "utf8")
        .replace(
          "Retain that nonempty `controller_run` in the controller's durable run record",
          "Trust the caller's visible controller label",
        )
        .replace(
          "A modern batch renewal always requires both current `lease_id` and\n`lease_revision` plus that exact run id; it never enters the no-token owner\ncompatibility lane.",
          "A modern batch renewal may omit its lease tokens and use owner compatibility.",
        ),
    );
    writeFileSync(
      review,
      readFileSync(review, "utf8").replace(
        "call `list_items include_archived: true` and read the authoritative",
        "inspect one remembered active member and assume the",
      ),
    );
    writeFileSync(
      closeout,
      readFileSync(closeout, "utf8")
        .replace(
          "`list_items include_archived: true` is the sole complete roster census",
          "`search_items` is also a complete roster census",
        )
        .replace(
          "Terminal batch release\nis deliberately not actor-bound",
          "Terminal batch release remains bound to the implementation actor",
        ),
    );
    writeFileSync(
      toolReference,
      readFileSync(toolReference, "utf8")
        .replace(
          "Pending, active and releasing manifests persist the exact pair of the actual MCP request actor and that durable run id.",
          "The batch stores a display owner.",
        )
        .replace(
          "`list_items include_archived: true` is the sole complete roster census",
          "`search_items` is a complete roster census",
        ),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-review reads the complete active manifest projection before batch attestation/);
    assert.match(result.stdout, /FAIL {2}kanmer-execute binds all batch work authority to actor plus durable controller_run/);
    assert.match(result.stdout, /FAIL {2}kanmer-execute requires current CAS tokens on every modern batch renew/);
    assert.match(result.stdout, /FAIL {2}kanmer-closeout retains manifest discovery through unlink and permits a fresh terminal releaser/);
    assert.match(result.stdout, /FAIL {2}tool reference exposes the durable batch authority, summary, CAS, and closeout contract/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("skill prose validator rejects a resumed flow without reference inputs or an implementation boundary", () => {
  const fixture = mkdtempSync(join(tmpdir(), "kanmer-resume-stage-reference-contract-"));
  try {
    cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
      recursive: true,
    });
    mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
    cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
    writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");

    const execute = join(fixture, "plugins", "kanmer", "skills", "kanmer-execute", "SKILL.md");
    writeFileSync(
      execute,
      readFileSync(execute, "utf8")
        .replace("including non-Markdown\ninputs deliberately omitted from `extraDocs`", "only Markdown packet documents")
        .replace("only while the ticket remains in\n`implementing`", "at every ticket stage"),
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /retains reference inputs and limits resumption to implementation/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

/** A fixture repo carrying the real skills tree, for the SKILL-036 contract checks. */
function goalFixture(label) {
  const fixture = mkdtempSync(join(tmpdir(), label));
  cpSync(join(root, "plugins", "kanmer", "skills"), join(fixture, "plugins", "kanmer", "skills"), {
    recursive: true,
  });
  mkdirSync(join(fixture, "packages", "core", "src"), { recursive: true });
  cpSync(join(root, "packages", "core", "src", "profiles.ts"), join(fixture, "packages", "core", "src", "profiles.ts"));
  cpSync(join(root, "AGENTS.md"), join(fixture, "AGENTS.md"));
  return fixture;
}
const skillFile = (fixture, skill) => join(fixture, "plugins", "kanmer", "skills", skill, "SKILL.md");
const edit = (path, from, to) => {
  const body = readFileSync(path, "utf8");
  assert.ok(body.includes(from), `fixture anchor missing: ${from}`);
  writeFileSync(path, body.replace(from, to));
};

test("goal contract validator rejects an unfrozen roster and a missing preflight", () => {
  const fixture = goalFixture("kanmer-goal-scope-contract-");
  try {
    const auto = skillFile(fixture, "kanmer-auto");
    edit(
      auto,
      "five scopes: one ticket, one explicit existing group, one area, an explicit\nticket list, or the prepared board.",
      "one explicit existing group per invocation.",
    );
    edit(auto, "### Preflight before the first mutation", "### Getting started");

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-auto accepts the five goal scopes and freezes its roster/);
    assert.match(result.stdout, /FAIL {2}kanmer-auto preflights identity, delivery target and board health/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects trusting a stale gate and routing around a spent budget", () => {
  const fixture = goalFixture("kanmer-goal-gate-budget-");
  try {
    const auto = skillFile(fixture, "kanmer-auto");
    edit(auto, "### Push the board before trusting a gate", "### Board synchronisation");
    edit(auto, "to get around that refusal", "whenever the lane would otherwise stall");

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-auto pushes the board before it trusts a gate result/);
    assert.match(result.stdout, /FAIL {2}kanmer-auto bounds churn and adds no second route around the budget/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a controller that merges or self-replans past its budget", () => {
  const fixture = goalFixture("kanmer-goal-merge-claim-");
  try {
    const auto = skillFile(fixture, "kanmer-auto");
    writeFileSync(
      auto,
      `${readFileSync(auto, "utf8")}\nThe controller merges the PR once every required check is green.\n` +
        "Once the budget is spent the controller takes another replan on its own authority.\n",
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}no controller performing the merge itself/);
    assert.match(result.stdout, /FAIL {2}no self-authorised replan after an exhausted budget/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a run record that loses its scope or roster freeze", () => {
  const fixture = goalFixture("kanmer-goal-run-record-");
  try {
    const assets = join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", "assets");
    edit(join(assets, "run-state-template.md"), "delivery_target:", "target_branch:");
    edit(join(assets, "run-state-template.md"), "**frozen at", "selected at");
    edit(join(assets, "current-run-template.md"), "\nscope: group\n", "\n");

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}run-state template records delivery_target:/);
    assert.match(result.stdout, /FAIL {2}run-state Selection contract freezes the roster and the ledger tracks the replan/);
    assert.match(result.stdout, /FAIL {2}current-run pointer names the scope it is resuming/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a stale-gate review and an asserted transient verdict", () => {
  const fixture = goalFixture("kanmer-goal-review-verify-");
  try {
    edit(
      skillFile(fixture, "kanmer-review"),
      "does not re-run when the board is pushed",
      "re-runs whenever the board is pushed",
    );
    edit(
      skillFile(fixture, "kanmer-verify"),
      "**`transient` is a conclusion you earn, never one you assert.**",
      "Treat a red run on a known-flaky host as transient.",
    );

    const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /FAIL {2}kanmer-review binds its gate reading to a pushed board/);
    assert.match(result.stdout, /FAIL {2}kanmer-verify earns transient with evidence and reads a proof in full/);
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

/**
 * SKILL-036 remediation round 1. Every assertion added to check 19 by the
 * remediation gets a mutation that deletes exactly the clause it claims to pin,
 * because a check whose clause can be removed without a FAIL is advertising a
 * guarantee it does not provide — the defect the review found in the first
 * round, where five scopes were declared and one was resolved.
 */
const expectFail = (stdout, name) =>
  assert.ok(stdout.includes(`FAIL  ${name}`), `expected FAIL for check: ${name}\n${stdout}`);
const expectPass = (stdout, name) =>
  assert.ok(stdout.includes(`PASS  ${name}`), `expected PASS for check: ${name}\n${stdout}`);
const runOn = (fixture) => spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });

test("protected batch validator independently rejects replacing the automation run_id authority", () => {
  const fixture = goalFixture("kanmer-batch-run-id-contract-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "automation ledger's immutable schema-3 `run_id` as the\nbatch `controller_run`",
      "current controller label as the batch owner",
    );
    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto maps its immutable run_id to every batch controller_run call");
    expectPass(result.stdout, "kanmer-execute binds all batch work authority to actor plus durable controller_run");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("protected batch validator independently rejects allowing every member to create a PR", () => {
  const fixture = goalFixture("kanmer-batch-single-pr-contract-");
  try {
    edit(
      skillFile(fixture, "kanmer-execute"),
      "The first batch member alone is the sole PR creator.",
      "Every batch member may create a PR.",
    );
    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-execute creates or recovers exactly one shared batch PR");
    expectPass(result.stdout, "kanmer-execute emits the complete frozen batch footer roster");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("protected batch validator independently rejects a non-idempotent merged-roster handoff", () => {
  const fixture = goalFixture("kanmer-batch-review-handoff-contract-");
  try {
    edit(
      skillFile(fixture, "kanmer-review"),
      "If it is already Verifying, that is the\nidempotent no-op for an interrupted prior scan.",
      "If it is already Verifying, move it again.",
    );
    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-review advances the complete merged batch roster idempotently");
    expectPass(result.stdout, "kanmer-review writes one member-owned exact-head pass attestation per roster ticket");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

// F1: each declared scope must lose its own named check when its resolution
// step goes, and must not be propped up by a neighbouring scope's step.
const scopeMutations = [
  [
    "ticket",
    '**ticket scope** — `get_item "<TICKET-ID>"`',
    "**ticket scope** — the named ticket",
    "kanmer-auto resolves the roster for ticket scope",
    "kanmer-auto resolves the roster for group scope",
  ],
  [
    "group",
    '**group scope** — `list_items group: "<explicit group>"`',
    "**group scope** — the group members",
    "kanmer-auto resolves the roster for group scope",
    "kanmer-auto resolves the roster for ticket scope",
  ],
  [
    "area",
    '**area scope** — `list_items area: "<area id>"`',
    "**area scope** — the area members",
    "kanmer-auto resolves the roster for area scope",
    "kanmer-auto resolves the roster for board scope",
  ],
  [
    "list",
    "**list scope** — `get_item` for each id the operator named",
    "**list scope** — the ids the operator named",
    "kanmer-auto resolves the roster for list scope",
    "kanmer-auto resolves the roster for area scope",
  ],
  [
    "board",
    "**board scope** — `list_items` with no scope filter",
    "**board scope** — the whole prepared board",
    "kanmer-auto resolves the roster for board scope",
    "kanmer-auto resolves the roster for list scope",
  ],
];

test("goal contract validator rejects a scope advertised with no resolution step", () => {
  for (const [scope, from, to, failed, unaffected] of scopeMutations) {
    const fixture = goalFixture(`kanmer-goal-scope-${scope}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${scope} scope mutation should fail the validator`);
      expectFail(result.stdout, failed);
      expectPass(result.stdout, unaffected);
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

test("goal contract validator rejects a roster that is not frozen and gated the same way for every scope", () => {
  const fixture = goalFixture("kanmer-goal-freeze-");
  try {
    const auto = skillFile(fixture, "kanmer-auto");
    edit(auto, "frozen into `## Selection contract` at that\n   moment and never re-resolved", "recorded for this run");
    edit(auto, "the gates-first readiness rules do not vary by scope", "readiness is judged per ticket");

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto freezes and gates every scope's roster identically");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a controller that rebases onto a hardcoded main", () => {
  const fixture = goalFixture("kanmer-goal-delivery-target-");
  try {
    edit(skillFile(fixture, "kanmer-auto"), "rebase origin/<delivery_target>", "rebase origin/main");

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto rebases onto the recorded delivery target, never a literal main");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a replan with no remediation-budget precondition", () => {
  const fixture = goalFixture("kanmer-goal-replan-budget-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      ", and only while\n  the remediation budget is **still available before it is spent**",
      "",
    );

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto allows its one replan only before the remediation budget is spent");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects an identity preflight a fresh run can never satisfy", () => {
  const fixture = goalFixture("kanmer-goal-identity-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "For a **new** run there is\n  no record yet",
      "For every run the record already exists",
    );

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto's identity preflight covers a new run as well as a resumed one");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects evidence hygiene that leaves an out-of-scope finding undispositionable", () => {
  const fixture = goalFixture("kanmer-goal-deferred-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "**`deferred-to-ticket`** disposition, which is invalid without a linked\n  ticket",
      "ordinary deferral, which needs nothing further",
    );

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto keeps `deferred-to-ticket` legal for an out-of-scope finding");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects a sync check against a hardcoded board branch", () => {
  const fixture = goalFixture("kanmer-goal-board-branch-");
  try {
    edit(skillFile(fixture, "kanmer-auto"), "rev-parse origin/<board-branch>", "rev-parse origin/kanmer-board");

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto pushes the board before it trusts a gate result");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("goal contract validator rejects an active-Review invariant with no up-to-review exemption", () => {
  const fixture = goalFixture("kanmer-goal-up-to-review-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "exemption is the supported **up to review** target point",
      "rule admits no exception",
    );

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto states the active Review and Verifying invariants");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

const schemaContractMutations = [
  [
    "version",
    "The current run-record schema is **`schema: 3`**",
    "The run record carries a schema field",
  ],
  [
    "in-place-rewrite",
    "is **never rewritten in place** with a new schema number or\nschema-3 fields",
    "is rewritten in place after filling the missing schema-3 fields",
  ],
  [
    "successor-identity",
    "Create the distinct schema-3 successor at the exact prepared id if it is\nabsent",
    "Rewrite the legacy record in place as schema 3",
  ],
  [
    "legacy-worker-proof",
    "Every legacy worker must be proven\ninactive; a returned terminal result is evidence, while silence or an unknown\ndispatch state is not",
    "Assume every legacy worker has stopped",
  ],
  [
    "active-or-uncertain",
    "If any legacy worker is still active or its state is uncertain, preserve the\nold ledger and `automation/current.md` pointer byte-for-byte, create no\nsuccessor",
    "If a legacy worker is active or uncertain, close the run and create its successor",
  ],
  [
    "quiescent-only",
    "Only a\nfully quiescent legacy run may be superseded",
    "Any legacy run may be superseded",
  ],
];

test("goal contract validator rejects unsupported schema resume or in-place rewriting", () => {
  for (const [label, from, to] of schemaContractMutations) {
    const fixture = goalFixture(`kanmer-goal-schema-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} schema mutation should fail the validator`);
      expectFail(
        result.stdout,
        "kanmer-auto requires schema 3 and supersedes schema 1/2 without rewriting them",
      );
      expectPass(result.stdout, "run-state template is stamped schema: 3");
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const legacyTransitionMutations = [
  [
    "prepared-intent",
    "Before closing anything, append a `successor-prepared` event under the legacy\nschema and read the ledger back",
    "Close the legacy run before recording successor intent",
  ],
  [
    "intent-fields",
    "successor id,\nproject fingerprint, scope and selector, authority, delivery target, lane and\nretry limits, and the exact ordered roster with every current run disposition",
    "successor id and a summary",
  ],
  [
    "preserve-roster",
    "By default the\nsuccessor preserves that exact legacy roster and those dispositions",
    "The successor selects the current board by default",
  ],
  [
    "fresh-selection-authority",
    "A fresh\nselection is permitted only when explicit operator authority for fresh\nselection is recorded in the prepared intent",
    "A fresh selection is always permitted",
  ],
  [
    "intent-before-close",
    "After the intent is durable, close the legacy run under its own schema",
    "Close the legacy run and then make the intent durable",
  ],
  [
    "exact-id-create-or-validate",
    "Create the distinct schema-3 successor at the exact prepared id if it is\nabsent, or validate an already-present successor against the complete intent",
    "Create any available successor id",
  ],
  [
    "pointer-last",
    "write and read back its complete history record, then update\n`automation/current.md` last",
    "Update `automation/current.md` before writing the successor",
  ],
  [
    "active-or-terminal-resume",
    "Startup rolls this transition forward idempotently whenever the pointer names\nan active or terminal legacy record with a `successor-prepared` event",
    "Startup handles only active legacy records",
  ],
  [
    "both-resume-paths",
    "For an\nactive record, re-prove quiescence before closing it; for a terminal record,\ncreate the exact successor if absent or validate it if present",
    "For any record, select a new successor",
  ],
  [
    "malformed-conflict-no-alternate",
    "If a handoff\nhas begun but the intent is absent or malformed, its id conflicts, or the\npresent successor differs from it, stop without changing the pointer and never\nchoose an alternate id",
    "intent is malformed, choose another id and continue",
  ],
  [
    "field-source-first",
    "Before preparing its intent, resolve every successor value\nthat the legacy schema did not record and make the source of each value\nauditable",
    "Prepare the successor intent before deciding where missing values come from",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "schema1-scope-derivation",
    "Schema 1 was group-only, so derive only `scope: group` and\n`scope_selector: <legacy group>` from that published schema and record\n`schema-1-group-contract` as their source",
    "Choose any convenient scope for schema 1",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "operator-values",
    "For authority and delivery absent\nfrom schema 1, and the retry limit and each per-ticket `Transient` count absent\nfrom schema 1/2, use an exact value already supplied by the operator or obtain\none bounded operator decision before mutation",
    "Default every absent successor field",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "delivery-identity",
    "Resolve delivery against the\nlive project policy and require the operator-authorised target; a project\nfingerprint mismatch is still a stop",
    "Use a hardcoded delivery target even when identity differs",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "retry-fail-closed",
    "When it is not provable, the only fail-closed\nnormalization is the chosen retry limit (budget exhausted)",
    "When it is not provable, initialize the count to zero",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "field-resolution-record",
    "`field_resolution` entry for every successor field that was\nabsent from the legacy record, naming the resolved value, source, evidence or\noperator decision, and reason",
    "summary of missing fields",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
  [
    "field-resolution-conflict",
    "Missing or conflicting field-resolution\nevidence makes the intent malformed and stops the handoff",
    "Missing field-resolution evidence is accepted",
    "kanmer-auto resolves every missing legacy successor field before preparing intent",
  ],
];

test("goal contract validator rejects an unrecoverable or identity-changing legacy handoff", () => {
  for (const [label, from, to, failed = "kanmer-auto durably prepares and idempotently rolls forward a legacy successor"] of legacyTransitionMutations) {
    const fixture = goalFixture(`kanmer-goal-legacy-transition-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} legacy-transition mutation should fail`);
      expectFail(result.stdout, failed);
      expectPass(result.stdout, "run-state template is stamped schema: 3");
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const newRunFieldMutations = [
  [
    "retry-field",
    "`created_at`, `updated_at`, `lane_limit`, `transient_retry_limit`,\n`stop_reason`",
    "`created_at`, `updated_at`, `lane_limit`, `stop_reason`",
  ],
  [
    "malformed-refusal",
    "Refuse creation when any required field is\nabsent or malformed.",
    "Continue with whichever fields are present.",
  ],
];

test("goal contract validator rejects incomplete schema-3 new-run validation", () => {
  for (const [label, from, to] of newRunFieldMutations) {
    const fixture = goalFixture(`kanmer-goal-schema-fields-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} field mutation should fail the validator`);
      expectFail(result.stdout, "kanmer-auto validates every required schema-3 new-run field");
      expectPass(
        result.stdout,
        "kanmer-auto requires schema 3 and supersedes schema 1/2 without rewriting them",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

test("goal contract validator rejects pre-schema-3 run templates", () => {
  for (const [file, failed, unaffected] of [
    ["run-state-template.md", "run-state template is stamped schema: 3", "current-run template is stamped schema: 3"],
    ["current-run-template.md", "current-run template is stamped schema: 3", "run-state template is stamped schema: 3"],
  ]) {
    const fixture = goalFixture(`kanmer-goal-schema-template-${file}-`);
    try {
      const asset = join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", "assets", file);
      edit(asset, "schema: 3", "schema: 2");

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${file} schema mutation should fail the validator`);
      expectFail(result.stdout, failed);
      expectPass(result.stdout, unaffected);
      expectPass(
        result.stdout,
        "kanmer-auto requires schema 3 and supersedes schema 1/2 without rewriting them",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

test("goal contract validator requires target-reached in both exhaustive disposition vocabularies", () => {
  for (const [label, file, from, to] of [
    [
      "skill",
      "SKILL.md",
      "ticket dispositions are exactly `queued`, `active`,\n`waiting`, `blocked`, `target-reached`, `finished`, or `skipped`",
      "ticket dispositions omit the target terminal value",
    ],
    [
      "template",
      "assets/run-state-template.md",
      "Disposition is exactly one of `queued`, `active`, `waiting`, `blocked`,\n`target-reached`, `finished`, or `skipped`; `target-reached` is terminal",
      "Disposition omits target-reached",
    ],
  ]) {
    const fixture = goalFixture(`kanmer-goal-disposition-${label}-`);
    try {
      edit(join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", file), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} disposition mutation should fail`);
      expectFail(
        result.stdout,
        "schema-3 run records declare target-reached in the exhaustive disposition vocabulary",
      );
      expectPass(
        result.stdout,
        "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

// F11: the two forbidden-claim checks are named for a capability, so every
// phrasing that would grant that capability has to fire them — not only the one
// phrasing the first round happened to write.
const forbiddenParaphrases = [
  ["The controller performs the merge itself once every required check is green.", "no controller performing the merge itself"],
  ["kanmer-auto merges the pull request after the final independent pass.", "no controller performing the merge itself"],
  ["The controller runs gh pr merge when the reviewer is unavailable.", "no controller performing the merge itself"],
  ["The controller merges the PR once the delta review clears.", "no controller performing the merge itself"],
  ["A budget-exhausted lane may self-replan.", "no self-authorised replan after an exhausted budget"],
  [
    "After REMEDIATION_BUDGET_EXHAUSTED the controller replans automatically.",
    "no self-authorised replan after an exhausted budget",
  ],
  ["Once the budget is spent the controller takes another replan on its own authority.", "no self-authorised replan after an exhausted budget"],
  ["The controller replans once the remediation budget is exhausted.", "no self-authorised replan after an exhausted budget"],
];

test("goal contract validator catches every phrasing of the two forbidden controller claims", () => {
  for (const [sentence, failed] of forbiddenParaphrases) {
    const fixture = goalFixture("kanmer-goal-forbidden-");
    try {
      const auto = skillFile(fixture, "kanmer-auto");
      writeFileSync(auto, `${readFileSync(auto, "utf8")}\n${sentence}\n`);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `unguarded paraphrase: ${sentence}`);
      expectFail(result.stdout, failed);
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

/**
 * SKILL-038. Three separate defects, one shape: a check whose NAME promises
 * more than its regex holds, and prose whose two halves contradict each other.
 * Every fixture below deletes exactly one clause and asserts two things — that
 * the check named for that clause FAILs, and that a named sibling still
 * PASSes. The second assertion is the one that matters: a clause absorbed by a
 * neighbour's regex is a clause with no guard of its own.
 */

// N-1. The check is named for board *health* and pinned it with a bare
// /get_status\.boardWorktree/, which the push-the-board section also satisfies.
// Deleting the whole preflight bullet used to leave check 19 green.
test("goal contract validator rejects a preflight that has lost its board-worktree health clause", () => {
  const fixture = goalFixture("kanmer-goal-preflight-board-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "- **Board worktree.** `get_status.boardWorktree` must be healthy and on its\n  board branch. `.worktrees/kanmer` is that board worktree: never a lane, a\n  rebase target, a cleanup target, or a working directory.\n",
      "",
    );

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto preflights identity, delivery target and board health");
    // The push-the-board section still names get_status.boardWorktree.expectedBranch,
    // which is exactly why the old anchor could not tell the two apart.
    expectPass(result.stdout, "kanmer-auto pushes the board before it trusts a gate result");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

// The core defect: three distinct claims about what `blocked` means for a
// roster, each of which must fall on its own.
const blockedMutations = [
  [
    "board-wide-flag",
    "**A `blocked` flag is a fact about the board, not about this run.**",
    "A blocked ticket carries a flag.",
    "kanmer-auto judges a blocked flag against the frozen roster, not the whole board",
    "kanmer-auto keeps an acyclic in-roster dependent only for a final-stage target",
  ],
  [
    "in-roster-retain",
    "**Every live blocker is inside the roster being frozen and the requested\n     target reaches the board's final stage** — keep the dependent.",
    "**Every live blocker is inside the roster** — handle it.",
    "kanmer-auto keeps an acyclic in-roster dependent only for a final-stage target",
    "kanmer-auto excludes only a dependent blocked from outside the roster, with its reason",
  ],
  [
    "out-of-roster-exclude",
    "**Any live blocker is outside the roster being frozen** — exclude the\n     dependent during the fixed point above,",
    "**Any live blocker is outside** — handle it during the fixed point,",
    "kanmer-auto excludes only a dependent blocked from outside the roster, with its reason",
    "kanmer-auto judges a blocked flag against the frozen roster, not the whole board",
  ],
];

test("goal contract validator rejects a roster that cannot tell an in-roster blocker from an outside one", () => {
  for (const [label, from, to, failed, unaffected] of blockedMutations) {
    const fixture = goalFixture(`kanmer-goal-blocked-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} mutation should fail the validator`);
      expectFail(result.stdout, failed);
      expectPass(result.stdout, unaffected);
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const selectionOrderMutations = [
  [
    "target-first",
    "Parse the requested target **before resolving dependency feasibility**",
    "Parse the requested target after resolving dependency feasibility",
  ],
  [
    "target-satisfaction-before-pruning",
    "After all ordinary exclusions and expired-claim classification, but before\n   outside-roster closure or any dependency pruning, determine exact target\n   satisfaction for every surviving candidate",
    "Before ordinary exclusions, determine target satisfaction for every candidate",
  ],
  [
    "ordinary-first",
    "**Before resolving any dependency\n   edge, apply every ordinary exclusion.**",
    "**After resolving dependencies, apply ordinary exclusions.**",
  ],
  [
    "claims-first",
    "Claim classification is part of those ordinary exclusions and therefore\n   happens before outside-blocker closure or cycle detection.",
    "Claim classification happens after outside-blocker closure and cycle detection.",
  ],
  [
    "external-fixed-point",
    "Resolve outside-roster exclusions to a fixed point **after** all ordinary\n   exclusions and target classification.",
    "Resolve outside-roster exclusions before ordinary exclusions.",
  ],
  [
    "foreign-claimed-cycle",
    "With `A -> B -> A` and A live-foreign-claimed, exclude A for its\n   claim before graph construction, then exclude B with A named during the\n   fixed point; record no cycle for that excluded pair.",
    "Treat a foreign-claimed member as part of the cycle graph.",
  ],
];

test("goal contract validator rejects cycle analysis before ordinary and external exclusions", () => {
  for (const [label, from, to] of selectionOrderMutations) {
    const fixture = goalFixture(`kanmer-goal-selection-order-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} selection-order mutation should fail`);
      expectFail(
        result.stdout,
        "kanmer-auto orders claims and external-blocker closure before cycle analysis",
      );
      expectPass(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const dependencyCycleMutations = [
  [
    "ordering",
    "Only after ordinary exclusions and that external-blocker fixed point,\n   **before retaining any dependent under the in-roster rule below**",
    "Before the external-blocker fixed point, retain internal dependents",
  ],
  [
    "self-loop",
    "including a\n   one-ticket self-loop",
    "when at least two tickets are involved",
  ],
  [
    "named-members",
    "exact ordered witness\n   path (`A -> B -> A`) and\n   its complete member set",
    "general description of the cycle",
  ],
  [
    "downstream-propagation",
    "**cycle-affected set** is every cycle member (necessarily\n   nonterminal and needing advancement) plus every transitive nonterminal\n   dependent",
    "**cycle-affected set** contains only cycle members",
  ],
  [
    "terminal-disposition",
    "Give every affected ticket a terminal\n   run-ledger disposition of `blocked`",
    "Leave every affected ticket queued for a later scheduling pass",
  ],
  [
    "multiple-components",
    "Record every component\n   separately, including multiple components and self-loops",
    "Record only the first cyclic component",
  ],
];

test("goal contract validator rejects dependency cycles without a bounded named disposition", () => {
  for (const [label, from, to] of dependencyCycleMutations) {
    const fixture = goalFixture(`kanmer-goal-cycle-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} cycle mutation should fail the validator`);
      expectFail(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
      expectPass(
        result.stdout,
        "kanmer-auto keeps an acyclic in-roster dependent only for a final-stage target",
      );
      expectPass(
        result.stdout,
        "kanmer-auto excludes only a dependent blocked from outside the roster, with its reason",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const targetFeasibilityMutations = [
  [
    "stage-record",
    "record both the requested target and the\n   board's final stage in the Selection contract",
    "record the requested target in the Selection contract",
  ],
  [
    "closeout-predicate",
    "the target **reaches the board's final stage**\n   when it is `closeout` or resolves to that final stage itself",
    "the target reaches the final stage only when its literal name is a stage id",
  ],
  [
    "no-literal-closeout-comparison",
    "Do not compare the literal word `closeout` with a stage id",
    "Compare the literal word `closeout` with the final stage id",
  ],
  [
    "capture-exclusion-first",
    "An archived or unpromoted quick capture never receives `target-reached`;\n   mandatory exclusions removed it first",
    "An unpromoted quick capture may receive target-reached before exclusion",
  ],
  [
    "live-provider-facts",
    "determine exact target\n   satisfaction for every surviving candidate from its current item, gates and\n   every live provider fact that target requires",
    "determine target satisfaction from stored item metadata alone",
  ],
  [
    "open-current-review-pr",
    "For **up to review**, require\n   the ticket to be in Review and fetch the ticket's linked current PR: it must\n   be open against the recorded delivery target, and its current head SHA must\n   be known",
    "For up to review, trust any recorded PR reference",
  ],
  [
    "target-evidence-binding",
    "Record the PR number, target branch, exact head and observation\n   time with the `target-reached` disposition",
    "Record only that review was reached",
  ],
  [
    "provider-inconclusive",
    "Stored `prs` metadata, the item\n   and gates alone never prove that target; unavailable or contradictory\n   provider evidence leaves the member nonterminal and `waiting`, not\n   target-reached",
    "Stored PR metadata is sufficient and unavailable provider state passes",
  ],
  [
    "already-target-terminal",
    "already at the requested\n   target remains in the frozen roster with a terminal `target-reached` run\n   disposition",
    "already at the requested target is removed from the roster",
  ],
  [
    "already-target-not-pruned",
    "remove it only from the set that still needs advancement,\n   never exclude or dependency-block it",
    "remove it from the roster before dependency pruning",
  ],
  [
    "already-target-outgoing-edge",
    "Target satisfaction does not erase\n   outgoing blocker evidence: that member remains a live blocker for\n   unsatisfied members until its actual board state clears the edge",
    "Target satisfaction clears every outgoing blocker edge",
  ],
  [
    "already-target-claim-not-transferred",
    "target-reached member whose expired claim was classified is never\n   transferred",
    "target-reached member with an expired claim is transferred",
  ],
  [
    "final-stage-clears",
    "**Only a target that reaches the board's final stage clears a live blocker\n   edge.**",
    "Any requested target clears a live blocker edge.",
  ],
  [
    "shallow-downstream",
    "the requested target does not reach that final stage, terminally\n   block each dependent on a remaining acyclic live edge and every transitive downstream\n   dependent",
    "the requested target does not reach that final stage, leave each dependent queued",
  ],
  [
    "shallow-disposition",
    "keep all of them in the frozen roster, name the\n   blocker, requested target and final stage in the reason, and dispatch none",
    "drop the affected dependents from the roster without a reason",
  ],
  [
    "safe-lanes",
    "blocker and every unrelated safe lane still\n   proceed to the requested target",
    "block the blocker and every unrelated safe lane",
  ],
  [
    "review-example",
    "For up-to-review `A -> B`, A reaches Review\n   while B and B's downstream dependents are terminally blocked",
    "For up-to-review `A -> B`, queue B behind A forever",
  ],
  [
    "closeout-example",
    "For closeout `A -> B`, retain and serially order\n   both because closeout reaches the final stage and can clear A's edge",
    "For closeout `A -> B`, exclude B",
  ],
  [
    "explicit-final-stage",
    "explicit Done target has the same result",
    "explicit Done target shallow-blocks the dependent",
  ],
  [
    "done-blocker",
    "An already-Done A creates no live\n   edge and therefore does not affect B",
    "An already-Done A still blocks B",
  ],
  [
    "no-false-complete",
    "run with any cycle-affected or target-affected ticket is never reported\n   `completed`",
    "run with target-affected tickets may be reported completed",
  ],
];

test("goal contract validator rejects a shallow target that cannot clear its dependency chain", () => {
  for (const [label, from, to] of targetFeasibilityMutations) {
    const fixture = goalFixture(`kanmer-goal-target-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} target-feasibility mutation should fail`);
      expectFail(
        result.stdout,
        "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
      );
      expectPass(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
      expectPass(
        result.stdout,
        "kanmer-auto keeps an acyclic in-roster dependent only for a final-stage target",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const targetReachedPruningMutations = [
  [
    "needs-advancement-only",
    "Apply that fixed point only to\n   nonterminal members in the set that still needs advancement",
    "Apply that fixed point to every candidate, including terminal members",
  ],
  [
    "terminal-dependent-exemption",
    "A terminal\n   `target-reached` member is never an exclusion candidate or the dependent\n   receiving a dependency disposition",
    "A terminal target-reached member may receive a dependency disposition",
  ],
  [
    "outgoing-edge-evidence",
    "although its outgoing live edges remain\n   blocker evidence for unsatisfied members",
    "and its outgoing blocker evidence is discarded",
  ],
  [
    "cycle-dependent-filter",
    "admit an edge\n   only when its dependent is a nonterminal member in the needs-advancement\n   set",
    "admit every live edge regardless of the dependent's terminal disposition",
  ],
  [
    "cycle-source-only",
    "a terminal\n   `target-reached` member may remain a blocker source, but no incoming\n   dependency edge is admitted for it",
    "a terminal target-reached member may receive an incoming dependency edge",
  ],
  [
    "cycle-terminal-example",
    "If A is already terminal\n   `target-reached` in the apparent `A -> B -> A`, omit `B -> A` because A is\n   not an eligible dependent",
    "If A is target-reached in A -> B -> A, block A and B as a cycle",
  ],
];

test("goal contract validator exempts target-reached members from dependency pruning", () => {
  for (const [label, from, to] of targetReachedPruningMutations) {
    const fixture = goalFixture(`kanmer-goal-target-pruning-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} target-pruning mutation should fail`);
      expectFail(result.stdout, "kanmer-auto exempts target-reached members from dependency pruning");
      expectPass(
        result.stdout,
        "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const targetEvidenceRevalidationMutations = [
  [
    "before-dependency-feasibility",
    "Target binding has one revalidation procedure and it runs before dependency\n   feasibility",
    "Target binding is checked after dependency feasibility",
  ],
  [
    "changed-terminal-source",
    "When a snapshot comparison observes any changed target fact or\n   outgoing blocker liveness for a `target-reached` member, first revalidate\n   that terminal blocker source even though it is outside the\n   needs-advancement set",
    "Ignore changed evidence for terminal blocker sources",
  ],
  [
    "final-truth-boundary",
    "Immediately before any terminal run-status transition\n   or final report, run the same procedure for every `target-reached` member",
    "Trust the original target observation in every final report",
  ],
  [
    "live-fact-comparison",
    "Re-gather the current item, gates and target-specific live provider facts\n   and compare them with the recorded target binding",
    "Compare only the stored item with the target binding",
  ],
  [
    "dependent-waits-for-durable-result",
    "No dependent that relies\n   on that source is assigned until this pass has a durable result",
    "Dependents may be assigned while revalidation is pending",
  ],
  [
    "valid-binding-refresh",
    "Refresh the exact binding and observation time, then continue\n     dependency feasibility",
    "Retain the stale observation time and continue dependency feasibility",
  ],
  [
    "available-disproof-wins",
    "Any available required fact\n     that disproves the binding makes this outcome authoritative even when\n     some other provider is unavailable",
    "Provider unavailability hides every available contradiction",
  ],
  [
    "stale-binding-correction",
    "Preserve the old binding and every\n     current fact, then replace `target-reached` with a terminal `blocked`\n     disposition whose reason starts `target evidence stale:`",
    "Discard the old binding and continue reporting target-reached",
  ],
  [
    "no-stale-success",
    "terminal-to-terminal correction: never reopen or dispatch the member, and\n     propagate its terminal non-success before dependency feasibility. Never\n     report the run `completed` or the member at target from stale evidence",
    "reopen the member and still report the run completed",
  ],
  [
    "unavailable-only-without-disproof",
    "Only the absence of a required live fact, with\n     no available fact disproving the binding, earns this outcome",
    "Any unavailable provider earns this outcome even when another fact disproves the binding",
  ],
  [
    "unavailable-preserves-binding",
    "Preserve\n     `target-reached` and its last valid binding",
    "Replace target-reached when a provider is unavailable",
  ],
  [
    "unavailable-resume-evidence",
    "record the unavailable fact,\n     provider, observation time and exact resume action in the run",
    "record only that some evidence was unavailable",
  ],
  [
    "unavailable-dependent-wait",
    "keep every\n     dependent relying on it `waiting`, and dispatch none of those dependents",
    "dispatch dependents while evidence is unavailable",
  ],
  [
    "unavailable-pauses-after-safe-lanes",
    "Unrelated safe lanes continue. When none remains ready, set the run\n     `paused` with a stop reason starting `target evidence unavailable:`",
    "Block the whole run immediately when evidence is unavailable",
  ],
  [
    "unavailable-resume-trigger",
    "Resume only after provider capability changes or an explicit resume, then\n     run this same revalidation again",
    "Resume automatically without revalidating",
  ],
  [
    "unavailable-is-recoverable",
    "Unavailability never consumes the\n     verification retry budget, becomes terminal `blocked`, or permits\n     `completed`",
    "Unavailability consumes the retry budget and becomes terminal blocked",
  ],
];

test("goal contract validator revalidates target evidence before terminal reporting", () => {
  for (const [label, from, to] of targetEvidenceRevalidationMutations) {
    const fixture = goalFixture(`kanmer-goal-target-evidence-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} target-evidence mutation should fail`);
      expectFail(result.stdout, "kanmer-auto revalidates target-reached evidence before terminal reporting");
      expectPass(
        result.stdout,
        "kanmer-auto revalidates frozen dependency safety before dispatch and after results",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const expiredClaimTransferMutations = [
  [
    "selection-is-read-only",
    "is inspected and recorded as assignment-eligible without mutation",
    "is transferred during selection",
  ],
  [
    "no-selection-write",
    "do not append scratch,\n      transfer or otherwise write during selection",
    "append scratch and transfer during selection",
  ],
  [
    "assignment-ready-only",
    "transfer\nonly now, immediately before the member's first assignment and only after it\nsurvived feasibility",
    "transfer as soon as the expired claim is found",
  ],
  [
    "fresh-claim-and-work-preservation",
    "re-read the claim and collect the branch, worktree and\ndirty-work evidence into the run record, then call `take_ticket action: \"transfer\"` directly",
    "reuse the selection-time claim state and discard the old workspace",
  ],
  [
    "no-pre-transfer-ticket-write",
    "Do not append ticket scratch before transfer",
    "Append ticket scratch before transfer",
  ],
  [
    "atomic-transfer-evidence",
    "The transfer\npath re-collects recovery evidence and rechecks lease liveness under the write\nlock; only a successful transfer records its preserved-work summary in ticket\nscratch",
    "The controller writes recovery evidence before checking liveness",
  ],
  [
    "never-transfer-terminal",
    "Never transfer a terminal, excluded, target-reached or otherwise no-longer-advancing member",
    "Transfer every expired claim whether or not its member can advance",
  ],
  [
    "renewed-claim",
    "`CLAIM_LIVE` refusal means it was renewed and the\nticket remains byte-for-byte unchanged; retain the frozen member with a\nterminal `blocked` live-claim disposition and dispatch nothing for it",
    "force the renewed claim and dispatch",
  ],
];

test("goal contract validator rejects expired-claim mutation before assignment readiness", () => {
  for (const [label, from, to] of expiredClaimTransferMutations) {
    const fixture = goalFixture(`kanmer-goal-claim-transfer-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} claim-transfer mutation should fail`);
      expectFail(
        result.stdout,
        "kanmer-auto defers expired claim transfer until an assignment-ready re-read",
      );
      expectPass(
        result.stdout,
        "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const dependencyRevalidationMutations = [
  [
    "snapshot-evidence",
    "Freeze a dependency-safety snapshot with the roster: exact live blocker\n   edges, blocker liveness, target bindings, claim classification, and the\n   relevant run dispositions",
    "Remember that dependencies were checked",
  ],
  [
    "pre-dispatch-revalidation",
    "Before every assignment and after every worker\n   result or timeout, compare live state with that snapshot",
    "After the run completes, compare live state with the old snapshot",
  ],
  [
    "immutable-membership",
    "A change never changes membership",
    "A graph change may add or remove roster members",
  ],
  [
    "rerun-safety-rules",
    "does a changed snapshot re-run outside-roster closure,\n   cyclic-component and target-feasibility rules",
    "keep using the original dependency decision",
  ],
  [
    "only-nonterminal-needing-advancement",
    "for nonterminal frozen members\n   that still need advancement",
    "for every member including terminal members",
  ],
  [
    "terminal-source-first",
    "Only after every implicated terminal source is valid or affirmatively\n   corrected",
    "Before revalidating implicated terminal sources",
  ],
  [
    "post-freeze-disposition",
    "Map a\n   post-freeze exclusion to a terminal `blocked` disposition instead of dropping\n   the member",
    "Drop a post-freeze exclusion from the roster",
  ],
  [
    "persist-before-dispatch",
    "Persist and read back the replacement snapshot and every target\n   revalidation result or resulting disposition before any next dispatch",
    "Dispatch before persisting the replacement snapshot",
  ],
  [
    "terminal-blocker-propagation",
    "terminal non-success disposition\n   while its edge is still live",
    "terminal successful disposition regardless of edge liveness",
  ],
  [
    "transitive-propagation",
    "every\n   transitive unsatisfied dependent a terminal `blocked` disposition naming the\n   blocker and failure",
    "only the direct dependent a waiting disposition",
  ],
  [
    "safe-lanes-continue",
    "blocker and failure; unrelated safe lanes continue",
    "blocker and failure; stop all safe lanes",
  ],
  [
    "terminal-never-reopens",
    "no graph change reopens a\n   terminal run disposition",
    "a graph change reopens terminal dispositions",
  ],
  [
    "assignment-hook",
    "then perform the\ndependency-snapshot comparison above",
    "then use the selection-time dependency decision",
  ],
  [
    "result-hook",
    "post-result revalidation and downstream-failure propagation above",
    "selection-time dependency decision above",
  ],
];

test("goal contract validator rejects stale frozen dependency decisions", () => {
  for (const [label, from, to] of dependencyRevalidationMutations) {
    const fixture = goalFixture(`kanmer-goal-dependency-revalidation-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} dependency-revalidation mutation should fail`);
      expectFail(
        result.stdout,
        "kanmer-auto revalidates frozen dependency safety before dispatch and after results",
      );
      expectPass(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const independentLaneMutations = [
  [
    "continue-safe",
    "Keep the run `running` while any unaffected safe lane can proceed",
    "Set the run `blocked` as soon as any cycle appears",
  ],
  [
    "block-after-terminal",
    "Only after every safe lane has a terminal disposition and no lane is\n   active or waiting, set the run to `blocked`",
    "Set the run blocked before safe lanes have terminal dispositions",
  ],
  [
    "independent-example",
    "For `A -> B -> A`\n   plus independent D, D reaches its target before the run becomes blocked",
    "For `A -> B -> A` plus independent D, block D immediately",
  ],
];

test("goal contract validator rejects a cycle that stops safe independent lanes", () => {
  for (const [label, from, to] of independentLaneMutations) {
    const fixture = goalFixture(`kanmer-goal-independent-cycle-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} independent-lane mutation should fail`);
      expectFail(
        result.stdout,
        "kanmer-auto lets independent lanes finish before a cyclic run blocks",
      );
      expectPass(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

const agentsControllerMutations = [
  [
    "inventory",
    "kanmer-auto/      # schema-3 /goal controller: dependency-safe roster, bounded lanes/retries, review+verify",
    "kanmer-auto/      # durable goal automation",
  ],
  [
    "blocker-types",
    "A ticket's `blocked` flag is board-wide",
    "A ticket's blocked flag is sufficient for roster selection",
  ],
  [
    "target-order",
    "Parse and record the requested target before resolving dependency feasibility",
    "Resolve dependencies before recording the requested target",
  ],
  [
    "target-reaches-final",
    "a target reaches the board's final stage when it is `closeout` or resolves to that final stage itself",
    "only a literal final-stage target reaches the board's final stage",
  ],
  [
    "target-satisfaction-before-pruning",
    "After those ordinary exclusions but before outside-roster closure or any dependency pruning, determine exact target satisfaction for every surviving candidate",
    "Determine target satisfaction before ordinary exclusions",
  ],
  [
    "target-provider-evidence",
    "from the current item, gates, and every live provider fact the target requires",
    "from stored item metadata only",
  ],
  [
    "target-open-current-pr",
    "Up to review requires the ticket in Review plus a live linked PR that is open against the recorded delivery target with its current head SHA known",
    "Up to review trusts a recorded PR number",
  ],
  [
    "target-evidence-binding",
    "record the PR, target, exact head and observation time, because stored `prs`, item and gates alone are not proof",
    "record only that Review was reached",
  ],
  [
    "target-provider-inconclusive",
    "Unavailable or contradictory provider evidence leaves the member nonterminal and `waiting`",
    "Unavailable provider evidence passes",
  ],
  [
    "capture-exclusion-first",
    "An archived or unpromoted quick capture never receives `target-reached`; mandatory exclusions removed it first",
    "An unpromoted quick capture may receive target-reached",
  ],
  [
    "target-reached-retained",
    "An already-target member stays in the frozen roster with terminal `target-reached`, leaves only the needs-advancement set, and is never dependency-blocked",
    "An already-target member is removed from the roster",
  ],
  [
    "target-reached-live-edge",
    "its outgoing edge remains live for unsatisfied members until actual board state clears it",
    "target satisfaction clears every outgoing edge",
  ],
  [
    "target-reached-claim",
    "A target-reached member whose expired claim was classified is never transferred",
    "A target-reached member with an expired claim is transferred",
  ],
  [
    "target-reached-pruning-set",
    "Outside-roster closure and every dependency disposition apply only to nonterminal members in the needs-advancement set",
    "Outside-roster closure and every dependency disposition apply to every candidate",
  ],
  [
    "target-reached-never-pruned",
    "target-reached members remain frozen terminal evidence and may supply outgoing live edges, but are never candidates for pruning or replacement by dependency analysis",
    "target-reached members may be pruned or replaced by dependency analysis",
  ],
  [
    "target-reached-cycle-source-only",
    "Build the cycle graph only from live edges whose dependent is a nonterminal needs-advancement member: a target-reached member may be a blocker source, but no incoming edge is admitted for it, so it can never be a cycle member or cycle-affected recipient",
    "Build the cycle graph from every live edge, including incoming edges to target-reached members",
  ],
  [
    "selection-order",
    "Apply ordinary exclusions first: unpromoted quick captures and live foreign claims are excluded, while expired foreign claims are classified without mutation",
    "Resolve dependency cycles before applying exclusions",
  ],
  [
    "expired-claim-deferral",
    "Transfer an expired foreign claim only immediately before first assignment after feasibility and a fresh claim read",
    "Transfer an expired claim during selection",
  ],
  [
    "expired-claim-preservation",
    "Preserve its branch, worktree and dirty work, and never transfer a terminal, excluded or target-reached member",
    "discard its workspace and transfer every expired claim",
  ],
  [
    "expired-claim-atomic-transfer",
    "Record its branch, worktree and dirty-work evidence in the run ledger, then call `take_ticket transfer` directly; never append ticket scratch before transfer",
    "Append ticket scratch before calling transfer",
  ],
  [
    "expired-claim-live-refusal",
    "transfer path re-collects evidence, rechecks liveness under the write lock, and writes its preserved-work summary only after success, so `CLAIM_LIVE` leaves the ticket byte-for-byte unchanged",
    "Transfer writes scratch before rechecking liveness",
  ],
  [
    "outside-roster",
    "An outside-roster blocker excludes the dependent with named evidence",
    "An outside-roster blocker is ignored",
  ],
  [
    "in-roster-final-target",
    "a safe acyclic in-roster blocker stays queued behind that blocker only when the requested target reaches the board's final stage",
    "a safe acyclic in-roster blocker always stays queued",
  ],
  [
    "cycles",
    "directed blocker graph for cyclic components, including self-loops",
    "dependency list for ordering",
  ],
  [
    "cycle-witness",
    "name each cycle's ordered path and complete members",
    "mention that a cycle exists",
  ],
  [
    "cycle-downstream",
    "give its members and all transitive nonterminal needs-advancement downstream dependents a terminal `blocked` run disposition and dispatch none",
    "block only direct cycle members",
  ],
  [
    "shallow-target",
    "For a target that does not reach the final stage, terminally block each dependent on a remaining live edge and all transitive downstream dependents",
    "For a target before the final stage, leave dependents queued",
  ],
  [
    "shallow-disposition",
    "naming its blocker, requested target and final stage; keep those members in the frozen ledger and dispatch none",
    "drop those members without a reason",
  ],
  [
    "closeout-and-final-target",
    "Closeout and an explicit final-stage target both retain and serially order the acyclic chain",
    "Only a literal final-stage target retains the chain",
  ],
  [
    "done-blocker",
    "an already-Done blocker creates no live edge",
    "an already-Done blocker remains live",
  ],
  [
    "dependency-snapshot",
    "Freeze exact blocker edges, liveness, target bindings, claim classifications and relevant dispositions as a dependency-safety snapshot",
    "Freeze only the initial roster ids",
  ],
  [
    "dependency-revalidation",
    "Before every assignment and after every result, compare live state",
    "Use the original dependency graph for every assignment and result",
  ],
  [
    "dynamic-terminal-source-recheck",
    "When any target fact or outgoing blocker liveness changes, first revalidate each implicated terminal target-reached source even though it is outside the needs-advancement set",
    "Ignore changed evidence for terminal target-reached sources",
  ],
  [
    "target-evidence-final-recheck",
    "run that same procedure for every target-reached member immediately before a terminal run status or final report",
    "Trust the original target evidence in the final report",
  ],
  [
    "target-evidence-live-facts",
    "Each pass re-gathers the current item, gates and target-specific live provider evidence and compares them with the recorded target binding",
    "Each pass trusts the recorded target binding",
  ],
  [
    "target-dependent-durable-result",
    "assign no dependent relying on it until the result is durable",
    "assign dependents while target evidence is unresolved",
  ],
  [
    "target-valid-refresh",
    "Valid evidence refreshes the exact binding and observation time",
    "Valid evidence retains its stale observation time",
  ],
  [
    "target-available-disproof-wins",
    "Any available required fact that disproves the binding is affirmatively stale or contradictory even if another provider is unavailable",
    "An unavailable provider hides every available contradiction",
  ],
  [
    "target-stale-correction",
    "preserve old and current facts, replace `target-reached` with terminal `blocked` reason `target evidence stale:` without reopening or dispatch, and propagate that terminal non-success before dependency feasibility",
    "continue reporting target-reached after affirmative contradiction",
  ],
  [
    "target-unavailable-preserves",
    "Mere unavailable or unknown provider evidence, with no available fact disproving the binding, preserves `target-reached` and its last valid binding",
    "Unavailable provider evidence permanently blocks the target-reached member",
  ],
  [
    "target-unavailable-evidence-and-pause",
    "record the provider, fact, observation time and exact resume action, keep every dependent relying on it `waiting` and undispatched, let unrelated safe lanes continue, then set the run `paused` with reason `target evidence unavailable:` when none remains ready",
    "block all lanes without recording a resume action",
  ],
  [
    "target-unavailable-resume",
    "Resume only after capability state changes or an explicit resume and run the same revalidation again",
    "Resume automatically without revalidating",
  ],
  [
    "target-unavailable-recoverable",
    "unavailability never consumes the verification retry budget, becomes terminal `blocked`, or permits `completed`",
    "unavailability consumes the retry budget and becomes terminal blocked",
  ],
  [
    "terminal-source-before-graph",
    "Only after implicated terminal sources are valid or affirmatively corrected may graph changes re-run outside-roster closure, cycle detection and target feasibility for nonterminal members still needing advancement",
    "Graph feasibility runs before terminal source revalidation",
  ],
  [
    "dependency-readback",
    "membership remains frozen, and persist/read back every target result and disposition before dispatch",
    "membership may change and dispatch may precede persistence",
  ],
  [
    "terminal-blocker-propagation",
    "A terminal non-success blocker whose edge stays live terminally blocks every transitive unsatisfied dependent with its reason",
    "A failed blocker leaves every dependent queued",
  ],
  [
    "terminal-disposition-stability",
    "unrelated safe lanes continue and terminal dispositions never reopen",
    "all lanes stop and terminal dispositions may reopen",
  ],
  [
    "independent-lanes",
    "Set the run `blocked` only after every safe lane is terminal, and never complete a run with a cycle-affected or target-affected member",
    "A cycle blocks the whole run immediately",
  ],
  [
    "numeric-budget",
    "`transient_retry_limit` (default 2 per ticket per run)",
    "a retry budget chosen by the controller",
  ],
  [
    "direct-verification-retry",
    "A failed verification command is never rerun directly by the controller or by the same verifier",
    "A failed verification command may be rerun directly by the controller",
  ],
  [
    "one-budget",
    "Exactly two authorization paths share that one budget",
    "Each verification route has its own uncounted budget",
  ],
  [
    "bootstrap-once",
    "the evidence-bootstrap path may admit at most one evidence-establishing logical attempt per ticket per run",
    "the evidence-bootstrap path may admit repeated attempts",
  ],
  [
    "classified-capacity",
    "the classified-transient path may admit another fresh independent logical attempt whenever durable room remains",
    "the classified-transient path may admit only one attempt",
  ],
  [
    "reserve-every-attempt",
    "Every admitted attempt reserves one durable count before its first dispatch",
    "Only the first admitted attempt reserves a durable count",
  ],
  [
    "bootstrap-result",
    "An evidence-bootstrap attempt requires an authoritative proof with `result: FAIL` or `result: INCONCLUSIVE`",
    "an evidence-bootstrap entry accepts a proof with no result",
  ],
  [
    "bootstrap-class",
    "`failure_class: inconclusive`",
    "`failure_class: transient`",
  ],
  [
    "bootstrap-request",
    "an explicit request for the same failing job at the same SHA",
    "a request for any verification command",
  ],
  [
    "bootstrap-retains-fail",
    "`FAIL` also retains its non-zero failing attempt",
    "`FAIL` may discard its failing attempt",
  ],
  [
    "bootstrap-evidence",
    "an untouched failing path and a concrete environmental mechanism hypothesis without controller self-classification",
    "a controller assertion that the failure is transient",
  ],
  [
    "classified-transient",
    "a classified-transient attempt requires an authoritative exact-SHA `failure_class: transient`",
    "a later entry requires no proof classification",
  ],
  [
    "raised-limit-no-third-path",
    "Raising the limit adds classified-transient-path capacity, never a third authorization path",
    "Raising the limit creates another authorization path",
  ],
  [
    "logical-reservation",
    "Each logical attempt increments once; a confirmed pre-mutation launch retry reuses that reservation without increment, decrement or reset, while unknown launch status dispatches no replacement",
    "Each launch increments again and unknown status may dispatch a replacement",
  ],
  [
    "unclassified-and-code-failures",
    "Any proof lacking an allowed bootstrap result, the exact class, explicit request or required retained attempt, and every implementation or plan failure, cannot enter the corresponding route",
    "Unclassified, implementation and plan failures may enter either route",
  ],
  [
    "classification-counter",
    "classification never resets the count",
    "classification resets the count",
  ],
  [
    "schema-transition",
    "Active schema-1/schema-2 records are never restamped or supplemented in place with schema-3 frontmatter or counters",
    "Older active records may be stamped schema 3 before resuming",
  ],
  [
    "legacy-quiescence",
    "first reconcile every legacy worker and require all to be proven inactive",
    "assume legacy workers are inactive",
  ],
  [
    "legacy-uncertain",
    "An active or uncertain worker preserves the old ledger and pointer and permits no successor",
    "An uncertain worker permits immediate successor creation",
  ],
  [
    "legacy-prepared-intent",
    "append and read back a legacy-schema `successor-prepared` intent containing one deterministic successor id, project, scope, authority, delivery, limits and the exact ordered roster with dispositions",
    "close the legacy run before recording successor intent",
  ],
  [
    "legacy-field-resolution",
    "resolve every successor value missing from the legacy schema before mutation",
    "invent missing successor values while writing the intent",
  ],
  [
    "legacy-resolution-sources",
    "copy recorded values; derive schema-1 `scope: group` and its selector only from the group-only schema contract; obtain exact operator values for absent authority, delivery and retry limits; reconstruct transient counts from retained attempts or fail closed at the chosen exhausted limit",
    "default every missing legacy field",
  ],
  [
    "legacy-resolution-record",
    "record every value, source, evidence or operator decision and reason",
    "record only the chosen values",
  ],
  [
    "legacy-event-not-restamp",
    "complete `field_resolution`; this legacy-valid event append does not change the old schema",
    "restamp the old record as schema 3",
  ],
  [
    "legacy-roster-authority",
    "Preserve that roster by default and allow fresh selection only with explicit operator authority in the intent",
    "always select the current board for the successor",
  ],
  [
    "legacy-close-order",
    "Only then may the legacy run close under its own schema",
    "Close the legacy run before preparing successor intent",
  ],
  [
    "legacy-exact-successor",
    "Startup rolls an active or terminal prepared handoff forward by creating the exact successor if absent or validating it if present, and updates the pointer last",
    "Startup chooses any available successor and updates the pointer first",
  ],
  [
    "legacy-conflict",
    "missing, malformed or conflicting intent stops without an alternate id",
    "malformed intent chooses an alternate id",
  ],
];

test("goal contract validator rejects an incomplete AGENTS controller contract", () => {
  for (const [label, from, to] of agentsControllerMutations) {
    const fixture = goalFixture(`kanmer-goal-agents-${label}-`);
    try {
      edit(join(fixture, "AGENTS.md"), from, to);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} AGENTS mutation should fail the validator`);
      expectFail(result.stdout, "AGENTS documents the schema-3 dependency and retry controller contract");
      expectPass(
        result.stdout,
        "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
      );
      expectPass(
        result.stdout,
        "kanmer-auto requires schema 3 and supersedes schema 1/2 without rewriting them",
      );
      expectPass(
        result.stdout,
        "kanmer-auto permits exactly two verification authorization paths under one counted budget",
      );
      expectPass(
        result.stdout,
        "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
      );
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

// The negative half. The board-wide drop is one clause inside a numbered step,
// so it is exactly the kind of sentence that comes back while someone tidies —
// under any wording, not only the one it shipped in.
const boardWideDropPhrasings = [
  "Drop archived or blocked tickets, and drop quick captures.",
  "Drop blocked tickets before freezing the roster.",
  "Blocked tickets are excluded from the roster.",
  "A blocked ticket is dropped from the roster.",
];

test("goal contract validator rejects every phrasing of a board-wide blocked drop", () => {
  for (const sentence of boardWideDropPhrasings) {
    const fixture = goalFixture("kanmer-goal-blocked-drop-");
    try {
      const auto = skillFile(fixture, "kanmer-auto");
      writeFileSync(auto, `${readFileSync(auto, "utf8")}\n${sentence}\n`);

      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `unguarded phrasing: ${sentence}`);
      expectFail(result.stdout, "no roster that drops every blocked ticket board-wide");
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

// F-005. The budget has to be a number, it has to be counted, and the refusal
// has to be quotable — a paraphrased refusal is a refusal nobody can grep for.
const transientMutations = [
  [
    "heading",
    "### The transient retry budget",
    "### Reruns",
    "kanmer-auto pushes the board before it trusts a gate result",
  ],
  [
    "number",
    "**`transient_retry_limit`**, defaulting to **2** re-runs per ticket per\nrun",
    "`transient_retry_limit`, set by the controller's judgement per ticket per\nrun",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "refusal",
    "transient budget exhausted: <ticket> spent <n>/<transient_retry_limit> re-runs at <SHA>; last failing check <check>. Not retried again without an operator decision.",
    "the lane is blocked with a note about the flaky check.",
    "kanmer-auto bounds churn and adds no second route around the budget",
  ],
  [
    "one-budget",
    "Both permitted fresh-verifier authorization paths in section 9 spend this one\nbudget",
    "Each permitted verifier entry spends a separate budget",
    "kanmer-auto pushes the board before it trusts a gate result",
  ],
  [
    "logical-attempt",
    "Every dispatch admitted by either path is one\n**logical verifier attempt**",
    "Each physical launch spends another retry",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "bootstrap-once",
    "The bootstrap path may admit at most one\nevidence-establishing attempt per ticket per run",
    "The bootstrap path may admit repeated evidence-establishing attempts",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "classified-budget-capacity",
    "the classified-transient path\nmay admit another fresh independent attempt whenever durable budget remains",
    "the classified-transient path may admit only one attempt",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "reserve-before-dispatch",
    "Immediately before its first dispatch, reserve that attempt by incrementing the\nticket's durable `Transient` count, writing the run record and reading it back",
    "Increment the counter after the verifier returns",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "reuse-launch-reservation",
    "A launch proven to have failed before mutation may use section 9's one logged\ntransport retry against the same reservation: do not increment it again,\ndecrement it or reset it",
    "Every failed launch spends a new counter slot",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "unknown-launch-no-dispatch",
    "Unknown launch status dispatches nothing",
    "Unknown launch status may dispatch a replacement",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
  [
    "default-explained",
    "The default\nof 2 deliberately leaves room for one evidence-bootstrap and one\nclassified-transient attempt",
    "The default of 2 is arbitrary",
    "kanmer-auto pushes the board before it trusts a gate result",
  ],
  [
    "raised-limit-capacity",
    "Raising the limit adds classified-transient-path\ncapacity; it never adds a third authorization path",
    "Raising the limit adds a third authorization path",
    "kanmer-auto pushes the board before it trusts a gate result",
  ],
  [
    "counter-not-reset",
    "classification never resets the count",
    "classification resets the count",
    "kanmer-auto states the active Review and Verifying invariants",
  ],
];

test("goal contract validator rejects an unbounded or unquotable transient retry budget", () => {
  for (const [label, from, to, unaffected] of transientMutations) {
    const fixture = goalFixture(`kanmer-goal-transient-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} mutation should fail the validator`);
      expectFail(
        result.stdout,
        "kanmer-auto bounds transient re-runs with a number and blocks with the exact refusal",
      );
      expectPass(result.stdout, unaffected);
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

// F-009/F-010/F-013/F-014/F-015. A failed command is not rerun in place. Both
// authorization paths use fresh verifiers and one durable counter: an
// explicitly requested FAIL-or-INCONCLUSIVE evidence bootstrap may establish
// the facts needed for classification, while the later route requires an
// authoritative transient proof. A confirmed pre-mutation launch retry reuses
// its logical attempt's reservation.
const transientRouteMutations = [
  [
    "two-paths",
    "There are exactly two authorization paths\nthat may admit logical verification attempts to fresh independent verifiers",
    "There are any number of authorization paths",
  ],
  [
    "one-counter",
    "Every admitted attempt requires room below `transient_retry_limit` and one\ndurable `Transient` reservation before its first dispatch",
    "each route has its own uncounted retry allowance",
  ],
  [
    "bootstrap-result",
    "`result: FAIL` or `result: INCONCLUSIVE`",
    "`result: INCONCLUSIVE`",
  ],
  [
    "bootstrap-class",
    "`failure_class: inconclusive`",
    "`failure_class: transient`",
  ],
  [
    "bootstrap-request",
    "requests a re-run of the same\n   failing job at the same SHA",
    "allows the controller to request any verification command",
  ],
  [
    "bootstrap-retains-fail",
    "A `FAIL` proof also retains the non-zero failing\n   attempt",
    "A `FAIL` proof may discard the failing attempt",
  ],
  [
    "untouched-path",
    "confirm that the failing path is untouched by the\n   diff",
    "ignore whether the failing path changed",
  ],
  [
    "mechanism",
    "record a concrete environmental mechanism hypothesis",
    "record that the host might be flaky",
  ],
  [
    "fresh-verifier",
    "A fresh\n   independent verifier performs the re-run",
    "The controller directly performs the re-run",
  ],
  [
    "bootstrap-at-most-once",
    "This path may admit at most one\n   evidence-establishing logical attempt per ticket per run",
    "This path may admit repeated evidence-establishing logical attempts",
  ],
  [
    "no-self-classification",
    "never lets the controller self-classify the failure\n   as transient",
    "lets the controller self-classify the failure as transient",
  ],
  [
    "classified-transient",
    "**Classified transient.** An authoritative exact-SHA proof already records\n   `failure_class: transient`",
    "**Classified transient.** The controller judges the run transient",
  ],
  [
    "classified-repeats-with-budget",
    "a fresh independent verifier may perform another\n   bounded re-run whenever the durable budget still has room",
    "a fresh independent verifier may perform only one bounded re-run",
  ],
  [
    "raised-limit-no-third-path",
    "Raising the limit\n   adds capacity only to this path and never creates a third authorization path",
    "Raising the limit creates a third authorization path",
  ],
  [
    "logical-reservation",
    "Reserve the count once per logical attempt immediately before its first\ndispatch",
    "Reserve the count once per physical launch",
  ],
  [
    "launch-reuses-reservation",
    "single logged transport retry permitted above reuses the same reservation and\ndoes not increment, decrement or reset it",
    "single logged transport retry increments the counter again",
  ],
  [
    "unknown-launch-no-replacement",
    "Unknown launch status dispatches no\nreplacement",
    "Unknown launch status dispatches a replacement",
  ],
  [
    "malformed-bootstrap-refused",
    "Any proof lacking the allowed result, the exact class, the\nexplicit evidence-bootstrap request or, for `FAIL`, the retained non-zero\nattempt never enters the bootstrap route",
    "A proof lacking the allowed result, class, request or retained attempt may enter the bootstrap route",
  ],
  [
    "code-failures-refused",
    "Implementation or plan failures never\nenter either route",
    "Implementation and plan failures may enter either route",
  ],
];

test("goal contract validator rejects an unproven or uncounted verification rerun", () => {
  for (const [label, from, to] of transientRouteMutations) {
    const fixture = goalFixture(`kanmer-goal-transient-route-${label}-`);
    try {
      edit(skillFile(fixture, "kanmer-auto"), from, to);
      const result = runOn(fixture);
      assert.notEqual(result.status, 0, `${label} mutation should fail the validator`);
      expectFail(
        result.stdout,
        "kanmer-auto permits exactly two verification authorization paths under one counted budget",
      );
      expectPass(result.stdout, "retry and force rules are bounded");
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});

test("goal contract validator rejects a run record that records no transient budget", () => {
  const fixture = goalFixture("kanmer-goal-transient-record-");
  try {
    const runState = join(
      fixture,
      "plugins",
      "kanmer",
      "skills",
      "kanmer-auto",
      "assets",
      "run-state-template.md",
    );
    edit(runState, "transient_retry_limit: 2", "retry_limit: 2");
    edit(runState, "| Transient |", "| Flake |");

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "run-state template records transient_retry_limit:");
    expectFail(result.stdout, "run-state ledger counts transient re-runs per ticket");
    expectPass(result.stdout, "run-state template records delivery_target:");
  } finally {
    removeTreeWithRetrySync(fixture);
  }
});

test("constrained-step prose validator rejects weakened authority, path and reconciliation contracts", () => {
  const mutations = [
    {
      label: "path-syntax",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "canonical repository-relative POSIX path",
      to: "convenient project path",
      failure: "constrained plans pin canonical repository-relative path syntax",
    },
    {
      label: "backslash-direction",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "Benign declaration backslashes are\n   normalized to `/`",
      to: "Declaration and observed backslashes are accepted without normalization",
      failure: "constrained plans pin canonical repository-relative path syntax",
    },
    {
      label: "packet-auth",
      file: (fixture) => skillFile(fixture, "kanmer-auto"),
      from: "Its `packetId` is tamper-evident identity, not authentication",
      to: "Its `packetId` authenticates the worker result",
      failure: "the controller retains the exact packet and treats packetId as non-authenticating",
    },
    {
      label: "caller-paths",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "caller-supplied changed-path summaries are not proof",
      to: "caller-supplied changed-path summaries are sufficient proof",
      failure: "packet-aware reconciliation derives actual Git changes and fails closed",
    },
    {
      label: "mapped-marker",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "at least one mapped unchecked checklist\n   marker",
      to: "an optional prose note",
      failure: "constrained issuance requires a mapped unchecked checklist marker",
    },
    {
      label: "checklist-terminators",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "CRLF/CR/LF terminator",
      to: "normalized line terminator",
      failure: "path matching and checklist bytes fail closed at explicit bounds",
    },
    {
      label: "group-census",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "one lexical, de-duplicated group census",
      to: "one unbounded group list",
      failure: "packet issuance bounds one canonical group census before group I/O",
    },
    {
      label: "board-snapshot-handles",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "identity-bound capped handles",
      to: "ordinary path reads",
      failure: "packet issuance binds a metadata-first capped board snapshot",
    },
    {
      label: "board-snapshot-junctions",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "Physical confinement is anchored at the configured project root",
      to: "Physical confinement trusts every board-internal junction",
      failure: "packet issuance binds a metadata-first capped board snapshot",
    },
    {
      label: "symbol-fail-closed",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "`STEP_SYMBOL_SCOPE_INCONCLUSIVE`; forbidden or undeclared path FAIL takes\nprecedence",
      to: "`STEP_SYMBOL_SCOPE_PASS`; symbol text authorizes every change",
      failure: "free-form symbol authority fails closed on actual changes",
    },
    {
      label: "glob-proof-context",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "Plan-time glob containment and intersection use one aggregate proof context",
      to: "Plan-time glob proof is unbounded",
      failure: "plan glob proof work shares one aggregate bounded context",
    },
    {
      label: "matcher-charging",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "budget is charged before\n   raw path parsing and before every literal or wildcard comparison",
      to: "budget is consulted after matching completes",
      failure: "path matching charges parsing and each comparison to one shared budget",
    },
    {
      label: "handle-bound-read",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "read once through one capped handle",
      to: "read through any convenient path",
      failure: "dirty file bytes stay bound to one capped verified handle",
    },
    {
      label: "hidden-index-flags",
      file: (fixture) => skillFile(fixture, "kanmer-auto"),
      from: "`git ls-files -v -s -z` index census",
      to: "`git status` note",
      failure: "workspace samples bind complete index and tracked-link authority",
    },
    {
      label: "tracked-link-bom",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "Tracked-link target bytes retain a leading UTF-8 BOM",
      to: "Tracked-link target bytes discard a leading UTF-8 BOM",
      failure: "workspace samples bind complete index and tracked-link authority",
    },
    {
      label: "tracked-link-indexed-target",
      file: (fixture) => skillFile(fixture, "kanmer-auto"),
      from: "indexed tracked\nregular file inside the worktree",
      to: "arbitrary in-worktree\nregular file",
      failure: "workspace samples bind complete index and tracked-link authority",
    },
    {
      label: "tracked-link-untracked-target",
      file: (fixture) => join(fixture, "plugins", "kanmer", "skills", "kanmer-tickets", "references", "tool-reference.md"),
      from: "Ignored or untracked link targets refuse",
      to: "Ignored or untracked link targets are accepted",
      failure: "workspace samples bind complete index and tracked-link authority",
    },
    {
      label: "workspace-object-format",
      file: (fixture) => join(fixture, "plugins", "kanmer", "skills", "kanmer-tickets", "references", "tool-reference.md"),
      from: "full 40- or 64-character\nGit object ID",
      to: "short hexadecimal\nGit object ID",
      failure: "packet workspace HEAD supports full SHA-1 and SHA-256 object ids",
    },
    {
      label: "complete-commit-history",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "bounded complete union\nof every path touched by every intervening commit",
      to: "endpoint-only union\nof paths visible in the final tree",
      failure: "constrained reconciliation binds complete history, executable mode and unique ticket authority",
    },
    {
      label: "physical-executable-mode",
      file: (fixture) => skillFile(fixture, "kanmer-auto"),
      from: "owner-executable bit, every clean tracked regular\npath must agree with its indexed `100644`/`100755` executable class",
      to: "owner-executable bit is ignored for clean tracked paths",
      failure: "constrained reconciliation binds complete history, executable mode and unique ticket authority",
    },
    {
      label: "unique-ticket-authority",
      file: (fixture) => join(fixture, "plugins", "kanmer", "skills", "kanmer-tickets", "references", "tool-reference.md"),
      from: "exactly\none selected ticket endpoint across v2 areas and legacy v1 storage",
      to: "the first\nselected ticket endpoint returned by storage",
      failure: "constrained reconciliation binds complete history, executable mode and unique ticket authority",
    },
    {
      label: "checklist-frontier",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "derive every marker state from those bytes",
      to: "trust the packet's stored marker summary",
      failure: "exact checklist bytes enforce one contiguous packet frontier",
    },
    {
      label: "ignored-boundary",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "Ignored paths and `.git` / common-directory metadata are",
      to: "Ignored paths and Git metadata are fully observed and",
      failure: "constrained workers stop at the ignored and Git-metadata observation boundary",
    },
    {
      label: "successor-pass",
      file: (fixture) => skillFile(fixture, "kanmer-execute"),
      from: "Only PASS may authorize the next step",
      to: "Any terminal result may authorize the next step",
      failure: "successor steps require the complete exact prior PASS packet",
    },
    {
      label: "schema-version",
      file: (fixture) => skillFile(fixture, "kanmer-plan"),
      from: "`step-packet/2`",
      to: "`step-packet/1`",
      failure: "canonical docs describe only step-packet/2",
    },
  ];
  for (const mutation of mutations) {
    const fixture = goalFixture(`kanmer-constrained-step-${mutation.label}-`);
    try {
      edit(mutation.file(fixture), mutation.from, mutation.to);
      const result = spawnSync(process.execPath, [script, fixture], { encoding: "utf8" });
      assert.notEqual(result.status, 0, `${mutation.label} mutation should fail the validator`);
      expectFail(result.stdout, mutation.failure);
    } finally {
      removeTreeWithRetrySync(fixture);
    }
  }
});
