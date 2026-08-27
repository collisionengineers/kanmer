import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
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
    rmSync(fixture, { recursive: true, force: true });
  }
});
