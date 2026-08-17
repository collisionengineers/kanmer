// The kanmer AGENTS.md managed block, as pure functions the Connect flow can
// add, refresh and remove — and unit-test (audit B6, previously enforced by
// skill prose only).
//
// The **body** is not defined here. It is imported from
// `scripts/agents-block-body.mjs` — the single canonical copy, which
// `scripts/agents-block.mjs` (the writer kanmer-setup calls) also re-exports.
//
// This file used to declare its own literal, and it had gone stale: a v2 body
// naming seven stages, `impact.md` and a skill that no longer exists. Connect
// imports these functions, so it wrote that stale body over the current one in
// every repo it touched — observed live on this repository (SKILL-013). Two
// copies of a literal kept in step by a comment is exactly what failed here.
// Do not reintroduce a local BLOCK_BODY.

export { START, END, BLOCK_BODY } from "../../../../scripts/agents-block-body.mjs";
import { START, END, BLOCK_BODY } from "../../../../scripts/agents-block-body.mjs";


/**
 * Insert or refresh the managed block. Pure: takes the file's current text
 * (`null` when absent) and returns what it should have. Same four rules as
 * scripts/agents-block.mjs — block-at-byte-0 when new, replace-span-only when
 * present, throw on a malformed half-marked file.
 */
export function applyManagedBlock(
  existing: string | null,
  blockBody: string = BLOCK_BODY,
  opts: { stubHeading?: string } = {},
): string {
  const block = `${START}\n${blockBody}\n${END}`;
  if (existing === null || existing === undefined) {
    return `${block}\n\n${opts.stubHeading ?? "# Contributor guide"}\n`;
  }
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  if (startAt === -1 && endAt === -1) return `${block}\n\n${existing}`;
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    throw new Error(
      "AGENTS.md has a malformed kanmer:instructions block — fix or remove the markers by hand.",
    );
  }
  return existing.slice(0, startAt) + block + existing.slice(endAt + END.length);
}

/**
 * Remove the managed block, restoring the surrounding text. When the block was
 * the whole file (block + stub heading) the result is `null` (delete the file).
 * A file with no markers is returned unchanged.
 */
export function removeManagedBlock(existing: string): string | null {
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  if (startAt === -1 || endAt === -1 || endAt < startAt) return existing;
  const before = existing.slice(0, startAt);
  const after = existing.slice(endAt + END.length);
  const rest = (before + after).replace(/^\s+/, "").replace(/\s+$/, "");
  return rest.length === 0 ? null : `${(before + after).replace(/^\n+/, "").trimEnd()}\n`;
}
