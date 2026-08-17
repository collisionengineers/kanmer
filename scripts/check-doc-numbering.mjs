// Fail if two governing docs of the same kind (ADR/FRD/PRD) share a number.
//
// Numbers are allocated by "read the directory, take the next free one" —
// correct for any single agent working alone, and wrong the moment two agents
// do it in parallel: both read the same directory, both see the same highest
// number, both take "next". This happened twice in one day on this repo
// (`26c8960` renumbered a duplicate ADR-0012; CORE-023 then collided on the
// ADR-0013 that renumbering produced — see ADR-0014's own history). Patching
// the second collision without a check that catches the third would repeat
// the mistake with better prose.
//
// This is deliberately NOT a number allocator (no locking, no reservation,
// no coordination between agents) — that is a much bigger mechanism for a
// problem that a five-line duplicate check already solves: agents keep
// allocating optimistically, and this is the net that catches the rare
// collision before it merges, the same way `check-plugin-sync.mjs` catches
// tool-name drift instead of preventing it structurally.
//
// Wired into `npm run test:scripts` via check-doc-numbering.test.mjs (that
// runner is `node --test scripts/*.test.mjs` — dependency-free, no root
// devDependency, matches how GUI-066 already wired scripts/ checks into a
// rail). Deliberately NOT folded into check-plugin-sync.mjs: that script's
// whole subject is the MCP plugin (tool names, bundle bytes, plugin
// manifests) and it refuses outright inside a linked worktree for reasons
// specific to that (node_modules resolution) — reasons a docs-filename check
// has no need to inherit. Keeping this standalone also means it runs
// (correctly) inside a worktree, which is where a governing-doc rename like
// ADR-0014's actually happens.
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Each governing-doc kind: its directory and its filename prefix. FRD and PRD
// share the exact convention ADR does (`<PREFIX>-<number>-<slug>.md`), so one
// pass over three directories costs nothing extra.
const KINDS = [
  { kind: "ADR", dir: join(root, "docs/architecture/adr") },
  { kind: "FRD", dir: join(root, "docs/functional/frd") },
  { kind: "PRD", dir: join(root, "docs/product/prd") },
];

/**
 * Group a kind's filenames by their leading number. Returns a Map of
 * number -> [filenames], for every number that has a file at all (including
 * the common case of exactly one).
 */
export function groupByNumber(dir, kind) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return new Map(); // directory doesn't exist yet — nothing to check
  }
  const re = new RegExp(`^${kind}-(\\d+)-.*\\.md$`);
  const groups = new Map();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const m = entry.name.match(re);
    if (!m) continue;
    const number = m[1];
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push(entry.name);
  }
  return groups;
}

/**
 * Check every configured kind for a duplicate number. Returns an array of
 * problem strings — empty means clean. Pure and side-effect-free so the test
 * file can call it directly against a fixture directory.
 */
export function findDuplicates(kinds = KINDS) {
  const problems = [];
  for (const { kind, dir } of kinds) {
    const groups = groupByNumber(dir, kind);
    for (const [number, files] of groups) {
      if (files.length > 1) {
        problems.push(
          `${kind}-${number} has ${files.length} files: ${files.sort().join(", ")} (in ${dir})`,
        );
      }
    }
  }
  return problems;
}

// Only run as a check when invoked directly — the test file imports the
// functions above instead, against a temporary fixture directory.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const problems = findDuplicates();
  if (problems.length) {
    console.error("Duplicate governing-doc numbers found:");
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      "\nEach number belongs to exactly one doc. Renumber the one that merged " +
        "second to the next free number in its kind, fix its own heading and " +
        "self-references, add a one-line note that it was renumbered, and update " +
        "every reference to it (repo + board) — leaving references to the OTHER " +
        "doc under the shared number untouched.",
    );
    process.exit(1);
  }
  console.log(
    `doc-numbering OK — ${KINDS.map((k) => k.kind).join(", ")} each have exactly one file per number`,
  );
}
