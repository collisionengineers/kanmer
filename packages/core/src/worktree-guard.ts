import path from "node:path";

export interface WorktreeGuardPaths {
  boardRoot: string;
  repoRoot: string;
  /** Test hook: production callers use the host platform. */
  platform?: NodeJS.Platform;
}

function pathApi(platform: NodeJS.Platform): typeof path {
  return platform === "win32" ? path.win32 : path;
}

/**
 * Resolve a user-supplied worktree path for equality comparison only.
 *
 * Ticket worktrees are repo-relative.  Normalize both separator styles before
 * resolving so an MCP client can use either slash style on Windows.  This
 * module deliberately has no filesystem or Git dependency.
 */
export function normalizeWorktreePath(
  input: string,
  base: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const api = pathApi(platform);
  const normalized = input.replace(/[\\\\/]+/g, api.sep);
  const resolved = api.resolve(base.replace(/[\\\\/]+/g, api.sep), normalized);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

/** Reject the board workspace when it is offered as a ticket worktree. */
export function assertNotBoardWorktree(worktree: string, paths: WorktreeGuardPaths): void {
  const platform = paths.platform ?? process.platform;
  const supplied = normalizeWorktreePath(worktree, paths.repoRoot, platform);
  const forbidden = [
    normalizeWorktreePath(paths.boardRoot, paths.repoRoot, platform),
    normalizeWorktreePath(pathApi(platform).join(paths.repoRoot, ".worktrees", "kanmer"), paths.repoRoot, platform),
  ];
  if (forbidden.includes(supplied)) {
    throw new Error(
      `Worktree "${worktree}" is the Kanmer board workspace. Use .worktrees/<ticket-id>, or omit worktree.`,
    );
  }
}
