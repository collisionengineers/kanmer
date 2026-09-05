// End-to-end check of the kanmer-setup AGENTS.md managed block.
//
// The four rules the skill states (top of file, never touch outside the
// markers, idempotent refresh, CLAUDE.md pointer) used to be prose an agent
// was asked to follow. scripts/agents-block.mjs implements them; this script
// is their test. Same conventions as packages/mcp-server/src/smoke.mjs:
// check(name, cond, detail), PASS/FAIL lines, exit 1 on any failure.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { START, END, BLOCK_BODY, applyManagedBlock, writeManagedBlock } from "./agents-block.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-agents-block-"));

/** A fresh sub-directory inside the sandbox, so each case is independent. */
function repo(name) {
  const dir = path.join(sandbox, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const read = (dir, file) => fs.readFileSync(path.join(dir, file), "utf8");

try {
  // 1. AGENTS.md missing → created, block at byte 0.
  {
    const dir = repo("missing");
    const r = writeManagedBlock(dir, { stubHeading: "# Demo contributor guide" });
    const text = read(dir, "AGENTS.md");
    check("missing AGENTS.md is created", r.agents === "created" && fs.existsSync(path.join(dir, "AGENTS.md")));
    check("created file starts with the start marker", text.startsWith(START));
    check("created file carries the block body", text.includes(BLOCK_BODY));
    check("created file gets the stub heading", text.includes("# Demo contributor guide"));
    check("created file carries the Agent conduct section", text.includes("## Agent conduct"));
    const conductRules = [...BLOCK_BODY.matchAll(/^(\d+)\. \*\*/gm)].map((match) => Number(match[1]));
    check(
      "Agent conduct keeps all 24 numbered rules in canonical order",
      conductRules.length === 24 && conductRules.every((rule, index) => rule === index + 1),
      conductRules.join(","),
    );
    check(
      "Agent conduct keeps Scope, Build, Prove, and Conduct groups",
      ["Scope", "Build", "Prove", "Conduct"].every((group) => BLOCK_BODY.includes(`**${group}**`)),
    );
  }

  // 2. AGENTS.md present with content → block at byte 0, original a byte-exact suffix.
  {
    const dir = repo("present");
    const original = "# Their guide\n\nSome existing prose.\n";
    fs.writeFileSync(path.join(dir, "AGENTS.md"), original, "utf8");
    const r = writeManagedBlock(dir);
    const text = read(dir, "AGENTS.md");
    check("existing AGENTS.md is prepended to", r.agents === "prepended");
    check("block lands at byte 0", text.startsWith(START));
    check("original content survives byte-exact as a suffix", text.endsWith(original));
  }

  // 3. Run twice → byte-identical output (the "idempotent" claim, mechanical).
  {
    const dir = repo("idempotent");
    fs.writeFileSync(path.join(dir, "AGENTS.md"), "# Their guide\n\nProse.\n", "utf8");
    writeManagedBlock(dir);
    const once = read(dir, "AGENTS.md");
    writeManagedBlock(dir);
    const twice = read(dir, "AGENTS.md");
    check("a second run changes nothing", once === twice, `${once.length} vs ${twice.length} bytes`);
    check("the second run did not duplicate the marker", twice.split(START).length === 2);
  }

  // 4. Stale body → only the span between the markers changes.
  {
    const dir = repo("stale");
    const before = "PREAMBLE\n";
    const after = "\n\n# Their guide\n\nProse.\n";
    fs.writeFileSync(
      path.join(dir, "AGENTS.md"),
      `${before}${START}\nstale body from an older kanmer\n${END}${after}`,
      "utf8",
    );
    const r = writeManagedBlock(dir);
    const text = read(dir, "AGENTS.md");
    check("a present block is refreshed, not re-inserted", r.agents === "refreshed");
    check("bytes before the start marker are untouched", text.startsWith(before));
    check("bytes after the end marker are untouched", text.endsWith(after));
    check("the stale body is gone", !text.includes("stale body from an older kanmer"));
    check("the current body is in", text.includes(BLOCK_BODY));
    check("the block stayed where it was, not moved to the top", !text.startsWith(START));
    check("still exactly one block", text.split(START).length === 2);
  }

  // 5. CLAUDE.md without a pointer → pointer added once, not twice.
  {
    const dir = repo("claude");
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "# Project notes\n", "utf8");
    const first = writeManagedBlock(dir);
    const once = read(dir, "CLAUDE.md");
    check("CLAUDE.md pointer is added", first.claude === "added" && once.includes("AGENTS.md"));
    check("original CLAUDE.md content survives", once.endsWith("# Project notes\n"));
    const second = writeManagedBlock(dir);
    const twice = read(dir, "CLAUDE.md");
    check("the pointer is not added twice", second.claude === "present" && once === twice);
  }

  // 5b. No CLAUDE.md → none is invented.
  {
    const dir = repo("no-claude");
    const r = writeManagedBlock(dir);
    check(
      "no CLAUDE.md is created when none exists",
      r.claude === "absent" && !fs.existsSync(path.join(dir, "CLAUDE.md")),
    );
  }

  // 6. Negative: END before START → throws, file unmodified.
  {
    const dir = repo("malformed");
    const broken = `${END}\nsomething\n${START}\n`;
    fs.writeFileSync(path.join(dir, "AGENTS.md"), broken, "utf8");
    let threw = false;
    try {
      writeManagedBlock(dir);
    } catch {
      threw = true;
    }
    check("END before START throws", threw);
    check("the malformed file is left byte-identical", read(dir, "AGENTS.md") === broken);
  }

  // 6b. Negative: a lone marker is malformed too.
  {
    let threw = false;
    try {
      applyManagedBlock(`${START}\nno end marker\n`);
    } catch {
      threw = true;
    }
    check("a lone start marker throws", threw);
    threw = false;
    try {
      applyManagedBlock(`${END}\nno start marker\n`);
    } catch {
      threw = true;
    }
    check("a lone end marker throws", threw);
  }

  // 7. The block body matches the skill's fenced copy — it is prose and cannot
  //    import, so it is kept in step by hand and drift is what this is for.
  {
    const skill = fs.readFileSync(
      path.join(repoRoot, "plugins/kanmer/skills/kanmer-setup/SKILL.md"),
      "utf8",
    );
    check("SKILL.md still carries the same markers", skill.includes(START) && skill.includes(END));

    // Equality of the fenced region, not `skill.includes(BLOCK_BODY)`. A
    // substring test passes on a fence that carries the whole body *plus* extra
    // text — which is the drift direction nobody would notice by eye, since the
    // part you look for is all still there.
    const at = skill.indexOf(START);
    const to = skill.indexOf(END);
    const fenced = at >= 0 && to > at ? skill.slice(at + START.length, to).replace(/^\n|\n$/g, "") : null;
    check(
      "SKILL.md's fenced block body is exactly this script's",
      fenced === BLOCK_BODY,
      fenced === null
        ? "markers not found"
        : fenced === BLOCK_BODY
          ? ""
          : `fenced ${fenced.length} bytes vs canonical ${BLOCK_BODY.length}`,
    );
  }

  // 8. This repo's own AGENTS.md carries the current body.
  //
  //    Nothing asserted this before, and the gap was not theoretical: the GUI's
  //    Connect flow held a third, stale copy of the body and wrote it over this
  //    file. It was caught by reading a diff. A repo that ships the block should
  //    be running the block (SKILL-013).
  {
    const own = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
    check(
      "this repo's AGENTS.md carries the current body",
      own.includes(BLOCK_BODY),
      own.includes(BLOCK_BODY) ? "" : "run `node scripts/agents-block.mjs .`",
    );
  }

  // 9. The GUI's copy is the canonical one, not a copy of it.
  //
  //    apps/gui/src/main/agentsBlock.ts re-exports from agents-block-body.mjs.
  //    Asserted structurally rather than by comparing strings, because a string
  //    comparison would still pass on a duplicated literal that happened to be
  //    current today — which is exactly the state that shipped the regression.
  {
    const gui = fs.readFileSync(
      path.join(repoRoot, "apps/gui/src/main/agentsBlock.ts"),
      "utf8",
    );
    const imports = /from "\.\.\/\.\.\/\.\.\/\.\.\/scripts\/agents-block-body\.mjs"/.test(gui);
    const declaresOwn = /^export const BLOCK_BODY\s*=/m.test(gui);
    check(
      "the GUI imports the canonical body instead of declaring one",
      imports && !declaresOwn,
      !imports ? "no import of agents-block-body.mjs" : declaresOwn ? "declares its own BLOCK_BODY" : "",
    );
  }

  // 10-13. DOC-028: the block routes work by purpose and names the configured
  // integration branch instead of a literal `main`. These four checks are
  // string-presence checks on the one canonical BLOCK_BODY, same as checks
  // 10/11/12/13 are meant to be lightweight tripwires against regressing the
  // specific wording this ticket introduced — not a restatement of check 1's
  // structural rule-count assertion.
  {
    check(
      "BLOCK_BODY no longer claims proof is written on merged main",
      !BLOCK_BODY.includes("Proof is written on merged"),
    );
    check(
      "BLOCK_BODY names delivery.integrationBranch instead of a literal branch",
      BLOCK_BODY.includes("delivery.integrationBranch"),
    );
    check(
      "BLOCK_BODY routes direct work before starting a workflow and names one heavy verifier per host",
      BLOCK_BODY.includes("Resolve the request before starting a workflow") &&
        BLOCK_BODY.includes("One heavy verification owner per host"),
    );
    check(
      "BLOCK_BODY separates deployment from ordinary Done",
      BLOCK_BODY.includes("Deployment belongs to a release"),
    );
  }
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
