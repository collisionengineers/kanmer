import path from "node:path";
import fs from "node:fs";
import { KANMER_DIR, WORKTREES_DIR } from "./paths.js";

/**
 * How a board root was arrived at. `flag`/`env`/`init` are set by the caller
 * that owns those inputs (the MCP server); the four discovery values are set
 * here.
 *
 * Fixed vocabulary — `get_status` surfaces it as `rootSource` and MCP-012
 * reports it. See ADR-0012 §Decision 8.
 */
export type RootSource =
  | "flag"
  | "env"
  | "cwd"
  | "cwd-worktree"
  | "ancestor"
  | "ancestor-worktree"
  | "init";

export type DiscoverResult =
  | { found: true; root: string; how: RootSource; tried: string[] }
  | { found: false; tried: string[] };

/**
 * The filesystem calls `discoverBoardRoot` needs, injected purely as a test
 * seam — the same shape as {@link renameWithRetry}'s `rename` parameter in
 * `io.ts`. Contriving real `.git`-file-vs-directory trees cross-platform is
 * exactly the part that must be proven, so every test passes plain objects.
 *
 * `isDirectory` is a third seam rather than a `statSync` inside the resolver
 * because the file-vs-directory distinction on `.git` is the single most
 * load-bearing detail in the walk (ADR-0012 §Corrected premise) and must be
 * fakeable on its own.
 */
export interface DiscoverIO {
  existsSync(p: string): boolean;
  readdirSync(p: string): string[];
  isDirectory(p: string): boolean;
}

const REAL_IO: DiscoverIO = {
  existsSync: (p) => fs.existsSync(p),
  readdirSync: (p) => fs.readdirSync(p),
  isDirectory: (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false,
};

/**
 * Find the board root — the folder containing `.kanmer` — by walking up from
 * `startDir`. The inverse of {@link deriveRepoRoot}, and the reason a server
 * started without `--root` can find a board that lives on its own branch.
 *
 * At **each** level, in order:
 *   1. `<L>/.kanmer`                  — a colocated board
 *   2. `<L>/.worktrees/<name>/.kanmer` — the layout `ensureBoardWorktree` creates
 *
 * and only **then** the boundary. Probe-before-boundary is not an accident: the
 * repo root is simultaneously the level that holds `.git` and the level that
 * holds `.worktrees/`, so a boundary-first walk skips precisely the level with
 * the board.
 *
 * The hard boundary is a `.git` **directory**. A `.git` **file** is traversed —
 * that is what every git *linked worktree* is (a 66-byte `gitdir: …` pointer),
 * and `kanmer-execute` puts every implementing agent inside one. Stopping there
 * would break discovery for the dominant real case while still, correctly,
 * refusing to cross into an unrelated nested repository, which has a real `.git`
 * directory. See ADR-0012.
 *
 * Returns the **board** root, never the repo root: `resolvePaths` feeds
 * `deriveRepoRoot` to recover `<repo>` from `<repo>/.worktrees/<name>`, and
 * governing-doc `refs` stop resolving if this returns the repo instead.
 *
 * `tried` is every path probed, in order. It is both the body of the caller's
 * not-found error and the diagnostic field on a success — one source, two
 * surfaces.
 */
export function discoverBoardRoot(startDir: string, io: DiscoverIO = REAL_IO): DiscoverResult {
  const tried: string[] = [];
  let level = path.resolve(startDir);
  let first = true;

  for (;;) {
    // 1. A colocated board at this level.
    const colocated = path.join(level, KANMER_DIR);
    tried.push(colocated);
    if (io.existsSync(colocated)) {
      return { found: true, root: level, how: first ? "cwd" : "ancestor", tried };
    }

    // 2. A board parked in a worktree beneath this level.
    const worktrees = path.join(level, WORKTREES_DIR);
    if (io.existsSync(worktrees)) {
      // Every candidate goes into `tried`, so an ambiguous pick is visible
      // rather than silent — `.worktrees/kanmer` is a convention, not an
      // invariant (kanmerGit.ts adopts a board worktree at any path).
      for (const child of orderCandidates(readdirSafe(io, worktrees))) {
        const candidate = path.join(worktrees, child);
        const board = path.join(candidate, KANMER_DIR);
        tried.push(board);
        if (io.existsSync(board)) {
          return {
            found: true,
            root: candidate,
            how: first ? "cwd-worktree" : "ancestor-worktree",
            tried,
          };
        }
      }
    } else {
      // Name the step even when the directory is absent, so the error shows
      // *what was looked for*, not only what happened to exist.
      tried.push(path.join(worktrees, "*", KANMER_DIR));
    }

    // 3. Only now the boundary: a `.git` DIRECTORY stops the walk; a `.git`
    //    FILE does not.
    const dotGit = path.join(level, ".git");
    if (io.existsSync(dotGit) && io.isDirectory(dotGit)) return { found: false, tried };

    const parent = path.dirname(level);
    if (parent === level) return { found: false, tried };
    level = parent;
    first = false;
  }
}

/** A `.worktrees` that cannot be listed is treated as empty, not as an error. */
function readdirSafe(io: DiscoverIO, dir: string): string[] {
  try {
    return io.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Deterministic order for `.worktrees/*` candidates: the exact leaf name
 * `kanmer` — what `ensureBoardWorktree` creates — wins, then lexicographic.
 * `.worktrees/` also holds per-ticket worktrees that may carry a committed
 * `.kanmer` from their branch, so this must never be arbitrary.
 */
function orderCandidates(children: string[]): string[] {
  const rest = children.filter((c) => c !== "kanmer").sort();
  return children.includes("kanmer") ? ["kanmer", ...rest] : rest;
}
