// The `kanmer-setup` skill's AGENTS.md managed block, as code rather than as
// instructions to a model.
//
// The skill (plugins/kanmer/skills/kanmer-setup/SKILL.md) tells the agent to
// call this script; the four rules it used to state in prose are implemented
// below and verified end-to-end by scripts/verify-agents-block.mjs.
//
// KEEP IN STEP: the block body is defined once, in ./agents-block-body.mjs, and
// re-exported here. The GUI's Connect flow imports the same module, so those two
// cannot drift. The one copy that still must be kept in step by hand is the
// fenced block in kanmer-setup/SKILL.md — prose, which cannot import — and
// scripts/verify-agents-block.mjs asserts it matches byte for byte. The skill is
// the fallback for plugin users who do not have this repo checked out.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export { START, END, BLOCK_BODY } from "./agents-block-body.mjs";
import { BLOCK_BODY, START, END } from "./agents-block-body.mjs";

/** The one-line CLAUDE.md pointer, added when CLAUDE.md exists without one. */
export const CLAUDE_POINTER = "See [AGENTS.md](AGENTS.md) for how to work on this repo.";

/**
 * Insert or refresh the managed block in an AGENTS.md.
 *
 * Pure: takes the file's current text (`null` when the file is absent) and
 * returns the text it should have. The four rules, and nothing else:
 *
 * - Both markers present, START before END → replace *only* the span between
 *   them. Every byte outside is preserved, and the block stays where it
 *   already is (moving it would modify content outside the markers).
 * - Absent, no file → the block plus a stub heading for the repo's own content.
 * - Absent, file present → the block first, the existing content untouched
 *   below it.
 * - Markers malformed (END before START, or only one of the two) → throw. A
 *   half-marked file is a human's problem; guessing would destroy content.
 *
 * @param {string|null} existing Current file text, or null when absent.
 * @param {string} [blockBody] Body to place between the markers.
 * @param {{stubHeading?: string|null}} [opts] Heading used when creating anew.
 * @returns {string} The text the file should have.
 */
export function applyManagedBlock(existing, blockBody = BLOCK_BODY, opts = {}) {
  const block = `${START}\n${blockBody}\n${END}`;
  if (existing === null || existing === undefined) {
    const heading = opts.stubHeading ?? "# Contributor guide";
    return `${block}\n\n${heading}\n`;
  }
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  if (startAt === -1 && endAt === -1) return `${block}\n\n${existing}`;
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    throw new Error(
      "AGENTS.md has a malformed kanmer:instructions block " +
        `(start at ${startAt}, end at ${endAt}). Fix or remove the markers by hand — ` +
        "this script will not guess at a half-marked file.",
    );
  }
  return existing.slice(0, startAt) + block + existing.slice(endAt + END.length);
}

/**
 * Add the AGENTS.md pointer to a CLAUDE.md that lacks one.
 *
 * @param {string} existing Current CLAUDE.md text.
 * @returns {string} The text it should have (unchanged when it already points).
 */
export function applyClaudePointer(existing) {
  if (existing.includes("AGENTS.md")) return existing;
  return `${CLAUDE_POINTER}\n\n${existing}`;
}

/**
 * Write (or refresh) the managed block in `<repoDir>/AGENTS.md`, and add the
 * pointer to `<repoDir>/CLAUDE.md` when that file exists without one.
 *
 * @param {string} repoDir Target repository root.
 * @param {{stubHeading?: string|null}} [opts]
 * @returns {{agents: "created"|"refreshed"|"prepended", claude: "added"|"present"|"absent"}}
 */
export function writeManagedBlock(repoDir, opts = {}) {
  const agentsPath = join(repoDir, "AGENTS.md");
  const existing = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : null;
  const next = applyManagedBlock(existing, BLOCK_BODY, opts);
  const agents =
    existing === null ? "created" : existing.includes(START) ? "refreshed" : "prepended";
  if (existing !== next) writeFileSync(agentsPath, next, "utf8");

  const claudePath = join(repoDir, "CLAUDE.md");
  let claude = "absent";
  if (existsSync(claudePath)) {
    const before = readFileSync(claudePath, "utf8");
    const after = applyClaudePointer(before);
    claude = after === before ? "present" : "added";
    if (after !== before) writeFileSync(claudePath, after, "utf8");
  }
  return { agents, claude };
}

// CLI: node scripts/agents-block.mjs <repoDir> [stubHeading]
// (pathToFileURL, not string concatenation — Windows drive letters make
// `file://` + path produce a two-slash URL that never matches import.meta.url.)
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const repoDir = process.argv[2];
  if (!repoDir) {
    console.error("Usage: node scripts/agents-block.mjs <repoDir> [stubHeading]");
    process.exit(1);
  }
  const dir = resolve(repoDir);
  if (!existsSync(dir)) {
    console.error(`No such directory: ${dir}`);
    process.exit(1);
  }
  try {
    const r = writeManagedBlock(dir, { stubHeading: process.argv[3] ?? null });
    console.log(`AGENTS.md ${r.agents} in ${dir}; CLAUDE.md pointer ${r.claude}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
