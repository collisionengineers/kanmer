import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * The skill asset is the target-neutral source for the repository's descriptive
 * document-model mirror. The mirror resolves repoDocs for its own board, so
 * this check validates the shared model plus the effective board map when one
 * is available. Keep it pure so stale-fixture tests do not touch a checkout.
 */
export function parseRepoDocs(text) {
  const lines = text.split(/\r?\n/);
  const result = {};
  let inRepoDocs = false;
  for (const line of lines) {
    if (/^repoDocs:\s*$/.test(line)) {
      inRepoDocs = true;
      continue;
    }
    if (inRepoDocs && /^\S/.test(line)) break;
    if (!inRepoDocs) continue;
    const match = line.match(/^\s+([A-Za-z0-9_-]+):\s*(\S.*)\s*$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return Object.keys(result).length ? result : null;
}

function boardCandidates(root) {
  const candidates = [];
  const add = (candidate) => {
    const boardFile = join(candidate, ".kanmer", "data", "board.yml");
    if (existsSync(boardFile)) candidates.push(resolve(boardFile));
  };
  const explicitRoot = process.env.KANMER_BOARD_ROOT ?? process.env.KANMER_ROOT;
  if (explicitRoot) {
    add(resolve(explicitRoot));
    return [...new Set(candidates)];
  }
  add(root);
  const parent = dirname(root);
  if (basename(parent) === ".worktrees" && existsSync(parent)) {
    for (const name of readdirSync(parent)) {
      const candidate = join(parent, name);
      try {
        if (statSync(candidate).isDirectory()) add(candidate);
      } catch {
        // A concurrently removed worktree is simply not a candidate.
      }
    }
  }
  const worktrees = join(root, ".worktrees");
  if (existsSync(worktrees)) {
    for (const name of readdirSync(worktrees)) {
      const candidate = join(worktrees, name);
      try {
        if (statSync(candidate).isDirectory()) add(candidate);
      } catch {
        // A concurrently removed worktree is simply not a candidate.
      }
    }
  }
  return [...new Set(candidates)];
}

export function resolveRepoDocs({ root, boardRoot = null }) {
  const candidates = boardRoot
    ? [resolve(join(boardRoot, ".kanmer", "data", "board.yml"))].filter(existsSync)
    : boardCandidates(root);
  if (candidates.length !== 1) return null;
  return parseRepoDocs(readFileSync(candidates[0], "utf8"));
}

function mirrorRepoDocs(mirror) {
  const result = {};
  const row = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm;
  for (const match of mirror.matchAll(row)) result[match[1]] = match[2];
  return result;
}

export function checkDocStructure({ canonical, mirror, repoDocs = null }) {
  const problems = [];
  for (const marker of ["six fixed stages", "files/*.md", "scratch/<slug>.md", "profile-resolved"]) {
    if (!canonical.includes(marker)) problems.push(`canonical document model is missing ${marker}`);
    if (!mirror.includes(marker)) problems.push(`repository mirror is missing ${marker}`);
  }
  const kinds = [...canonical.matchAll(/<board repoDocs\.([A-Za-z0-9_-]+)>/g)].map((match) => match[1]);
  const mirrorDocs = mirrorRepoDocs(mirror);
  for (const kind of kinds) {
    if (!canonical.includes(`<board repoDocs.${kind}>`)) {
      problems.push(`canonical asset is missing target-neutral repoDocs.${kind}`);
    }
    if (!mirrorDocs[kind] || mirrorDocs[kind].startsWith("<board repoDocs.")) {
      problems.push(`repository mirror is missing resolved repoDocs.${kind}`);
    }
  }
  if (repoDocs) {
    for (const [kind, glob] of Object.entries(repoDocs)) {
      if (mirrorDocs[kind] !== glob) {
        problems.push(`repository mirror repoDocs.${kind} is ${mirrorDocs[kind] ?? "missing"}; expected ${glob}`);
      }
    }
  }
  for (const sourceOnly of ["plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md", "npm run verify:docs"]) {
    if (mirror.includes(sourceOnly)) problems.push(`repository mirror contains source-only instruction ${sourceOnly}`);
  }

  for (const retired of [
    /storage format 2/i,
    /seven stages/i,
    /\bimpact\.md\b/i,
    /scratch-<slug>\.md/i,
  ]) {
    if (canonical.match(retired)) problems.push(`canonical document model contains retired marker ${retired}`);
    if (mirror.match(retired)) problems.push(`repository mirror contains retired marker ${retired}`);
  }

  return problems;
}

export function checkDocStructureFiles({ root }) {
  const canonical = readFileSync(
    join(root, "plugins", "kanmer", "skills", "kanmer-docs", "assets", "doc-structure.md"),
    "utf8",
  );
  const mirror = readFileSync(join(root, "docs", "contributing", "doc-structure.md"), "utf8");
  return checkDocStructure({ canonical, mirror, repoDocs: resolveRepoDocs({ root }) });
}
