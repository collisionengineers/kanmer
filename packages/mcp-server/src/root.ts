import path from "node:path";
import { discoverBoardRoot, type RootSource } from "@kanmer/core";

/** Where the board is, and how that was arrived at. See ADR-0012 §Decision 8. */
export interface ResolvedRoot {
  /** The folder containing (or, under `--init`, about to contain) `.kanmer`. */
  root: string;
  /** Which step produced it — surfaced by `get_status` as `rootSource`. */
  how: RootSource;
  /** Every path probed, in order. Empty when a root was asserted outright. */
  tried: string[];
}

/**
 * Resolve the project root (the folder containing `.kanmer`) in priority order:
 *   1. `--root <path>` / `--root=<path>` CLI argument   → how: "flag"
 *   2. `KANMER_ROOT` environment variable               → how: "env"
 *   3. **discovery**, walking up from the working directory
 *      → how: "cwd" | "cwd-worktree" | "ancestor" | "ancestor-worktree"
 *   4. `--init` / `KANMER_INIT=1`, board to be created at cwd → how: "init"
 *   5. otherwise **throw**, naming every path tried
 *
 * Steps 1 and 2 are *assertions*, not questions, and are deliberately **not**
 * validated: `npm run inspect` and `smoke.mjs` both point `--root` at
 * directories with no `.kanmer` on purpose.
 *
 * There is no bare cwd fallback any more. It used to be called "the common
 * case" here, on the reasoning that a project-scoped codex config points `cwd`
 * at the right folder (ADR-0007) — but the layout Kanmer's own desktop app
 * creates puts the board at `<repo>/.worktrees/kanmer`, where `<cwd>/.kanmer`
 * does not exist. A server rooted there booted clean, reported an empty board
 * and never said it had missed one. Discovery replaces the guess; not finding a
 * board is now fatal rather than silent. See ADR-0012.
 */
export function resolveProjectRoot(
  argv: string[],
  env: NodeJS.ProcessEnv,
  cwd: string = process.cwd(),
): ResolvedRoot {
  const flag = readFlag(argv, "--root");
  if (flag) return { root: flag, how: "flag", tried: [] };
  if (env.KANMER_ROOT) return { root: path.resolve(env.KANMER_ROOT), how: "env", tried: [] };

  const found = discoverBoardRoot(cwd);
  if (found.found) return { root: found.root, how: found.how, tried: found.tried };

  if (readSwitch(argv, "--init") || env.KANMER_INIT === "1") {
    return { root: path.resolve(cwd), how: "init", tried: found.tried };
  }
  throw new Error(noBoardMessage(found.tried));
}

/**
 * The not-found diagnostic: every path tried, in the order tried, then all
 * three recoveries. This list is the same `tried` the provenance carries — one
 * source, two surfaces — and it is deliberately not truncated. Losing the
 * detail is how the original defect stayed invisible.
 */
export function noBoardMessage(tried: string[]): string {
  const lines = tried.map((p) => `  ${p}`).join("\n");
  return [
    "no Kanmer board found. Tried:",
    lines,
    " Pass --root <board>, set KANMER_ROOT,",
    " or pass --init to create one here.",
  ].join("\n");
}

/**
 * Resolve the *source checkout* — what governing-doc `refs` resolve against —
 * in priority order: `--repo-root` → `KANMER_REPO_ROOT` → undefined.
 *
 * Undefined is the normal case and is not a failure: core then derives it from
 * a `.worktrees/<name>` board path and otherwise uses the project root, so a
 * colocated board and a server registered before this flag existed both behave
 * correctly. A *discovered* board gets this for free — discovery returns the
 * board root, and `deriveRepoRoot` recovers `<repo>` from it.
 */
export function resolveRepoRoot(argv: string[], env: NodeJS.ProcessEnv): string | undefined {
  const flag = readFlag(argv, "--repo-root");
  if (flag) return flag;
  if (env.KANMER_REPO_ROOT) return path.resolve(env.KANMER_REPO_ROOT);
  return undefined;
}

function readFlag(argv: string[], name: string): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === name && argv[i + 1]) return path.resolve(argv[i + 1]);
    if (arg.startsWith(`${name}=`)) return path.resolve(arg.slice(name.length + 1));
  }
  return undefined;
}

/** A valueless flag, e.g. `--init`. */
function readSwitch(argv: string[], name: string): boolean {
  return argv.includes(name);
}
