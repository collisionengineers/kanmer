// The `kanmer-setup` skill's AGENTS.md managed block, as code rather than as
// instructions to a model.
//
// The skill (plugins/kanmer/skills/kanmer-setup/SKILL.md) tells the agent to
// call this script; the four rules it used to state in prose are implemented
// below and verified end-to-end by scripts/verify-agents-block.mjs.
//
// KEEP IN STEP: BLOCK_BODY below is the literal text of the fenced block in
// kanmer-setup/SKILL.md ("The AGENTS.md operating instructions"). Change one,
// change the other — the skill is the fallback for plugin users who do not
// have this repo checked out.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
export const END = "<!-- kanmer:instructions:end -->";

/** The managed block's body — everything between the two markers. */
export const BLOCK_BODY = `# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in \`.kanmer/\`. In a Git repo set up
through the GUI the board lives in its own worktree, \`.worktrees/kanmer\`, on the
board branch, and MCP is already rooted there — never create, switch or push that
branch yourself. Your own ticket worktree is a separate thing, recorded by
\`take_ticket\`.

- Start every session with \`get_status\`, then \`list_board\` / \`list_items\` to find your ticket.
- **Which documents a ticket needs depends on its profile, not on a fixed pipeline.** A \`feature\` owes research, files, plan, checklist, a report and proof; a \`chore\` owes a plan and proof; a \`spike\` may owe only research. Call \`get_doc_gates <id>\` before every move — never assume.
- Stages: backlog → preparing → implementing → review → verifying → done. **A move crosses at most one gated boundary**, so walk the stages one at a time; a jump is refused even when every document exists.
- Read the whole ticket folder before starting — documents are folders (\`research/\`, \`plan/\`, …), so there may be several files per type. If the ticket is in a group, read the group's \`context.md\` too: the constraint binding the batch is written once, there.
- Work each ticket on its own branch and worktree: worktree \`.worktrees/<id>\`, branch \`<id>-<slug>\`; \`take_ticket\` records both and moves the stage.
- Write pipeline documents with \`set_ticket_doc\`. Running notes go to \`append_scratch\` — scratch is the notepad and is never gated, and neither is anything under \`reference/\` or \`assets/\`.
- Proof is written on merged \`main\`, after review and the merge, not before.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask \`get_doc_gates\` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
- Each skill ends by naming what comes next — read that line before improvising a hand-off.`;

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
