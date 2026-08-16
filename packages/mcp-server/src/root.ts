import path from "node:path";

/**
 * Resolve the project root (the folder containing `.kanmer`) in priority order:
 *   1. `--root <path>` / `--root=<path>` CLI argument
 *   2. `KANMER_ROOT` environment variable
 *   3. the current working directory
 *
 * codex points a project-scoped `.codex/config.toml` at the right folder via
 * `cwd`, so the cwd fallback is the common case.
 */
export function resolveProjectRoot(argv: string[], env: NodeJS.ProcessEnv): string {
  const flag = readFlag(argv, "--root");
  if (flag) return flag;
  if (env.KANMER_ROOT) return path.resolve(env.KANMER_ROOT);
  return process.cwd();
}

/**
 * Resolve the *source checkout* — what governing-doc `refs` resolve against —
 * in priority order: `--repo-root` → `KANMER_REPO_ROOT` → undefined.
 *
 * Undefined is the normal case and is not a failure: core then derives it from
 * a `.worktrees/<name>` board path and otherwise uses the project root, so a
 * colocated board and a server registered before this flag existed both behave
 * correctly.
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
