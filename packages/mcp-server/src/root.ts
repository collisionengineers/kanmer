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
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" && argv[i + 1]) return path.resolve(argv[i + 1]);
    if (arg.startsWith("--root=")) return path.resolve(arg.slice("--root=".length));
  }
  if (env.KANMER_ROOT) return path.resolve(env.KANMER_ROOT);
  return process.cwd();
}
