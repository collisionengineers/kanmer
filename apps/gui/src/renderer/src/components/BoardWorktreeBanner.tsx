import type { BoardWorktreeHealth } from "../../../shared/ipc.js";

/** The persistent warning is for unsafe board state, never ordinary non-Git use. */
export function shouldShowBoardWorktreeBanner(health: BoardWorktreeHealth | null): boolean {
  return health !== null && (!health.onBoardBranch || (health.boardSource === "default" && health.ticketCount > 0));
}

interface BoardWorktreeBannerProps {
  health: BoardWorktreeHealth | null;
  /** Opens the existing Settings dialog; it deliberately does not repair Git. */
  onOpenSettings: () => void;
}

export function BoardWorktreeBanner({ health, onOpenSettings }: BoardWorktreeBannerProps): JSX.Element | null {
  if (!shouldShowBoardWorktreeBanner(health) || health === null) return null;
  return (
    <div className="banner warn board-worktree-banner" role="alert">
      <div>
        <strong>Board worktree needs attention.</strong>
        <dl>
          <div><dt>Path</dt><dd><code>{health.path}</code></dd></div>
          <div><dt>Branch</dt><dd><code>{health.actualBranch ?? "unavailable or detached"}</code> (expected <code>{health.expectedBranch}</code>)</dd></div>
          <div><dt>Board configuration</dt><dd>{health.boardSource}; {health.ticketCount} active ticket{health.ticketCount === 1 ? "" : "s"}</dd></div>
        </dl>
        <p>{health.repair}</p>
      </div>
      <div className="conflict-actions">
        <button className="ghost xs" onClick={onOpenSettings}>Open settings</button>
      </div>
    </div>
  );
}
