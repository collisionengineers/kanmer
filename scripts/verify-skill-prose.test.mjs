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
