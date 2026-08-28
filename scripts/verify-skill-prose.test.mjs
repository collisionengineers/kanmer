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
  writeFileSync(join(fixture, "AGENTS.md"), "Contract fixture.\n");
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

test("goal contract validator rejects a run record that resumes at the pre-scope schema", () => {
  const fixture = goalFixture("kanmer-goal-schema-");
  try {
    edit(
      skillFile(fixture, "kanmer-auto"),
      "The current run-record schema is **`schema: 2`**",
      "The run record carries a schema field",
    );
    const assets = join(fixture, "plugins", "kanmer", "skills", "kanmer-auto", "assets");
    edit(join(assets, "run-state-template.md"), "schema: 2", "schema: 1");
    edit(join(assets, "current-run-template.md"), "schema: 2", "schema: 1");

    const result = runOn(fixture);
    assert.notEqual(result.status, 0);
    expectFail(result.stdout, "kanmer-auto requires run-record schema 2 and refuses to resume a schema-1 record");
    expectFail(result.stdout, "run-state template is stamped schema: 2");
    expectFail(result.stdout, "current-run template is stamped schema: 2");
  } finally {
    removeTreeWithRetrySync(fixture);
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
