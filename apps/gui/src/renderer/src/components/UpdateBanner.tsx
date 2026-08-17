import type { UpdateSurface } from "../lib/update.js";

interface UpdateBannerProps {
  /** The already-decided surface, from `updateSurface()` in `lib/update.ts`. */
  view: UpdateSurface;
  /** Start the restart-to-update flow. Must be the gated `onRestartToUpdate`. */
  onRestart: () => void;
  /** Dismiss for this session only; the update installs on the next quit. */
  onDismiss: () => void;
}

/**
 * The "an update is ready" banner.
 *
 * Extracted from `App.tsx` (GUI-065) for two reasons, in this order:
 *
 * 1. `App.tsx` renders it from BOTH branches of the `if (!root || !board)`
 *    early return — the project view and the welcome screen. One component
 *    rendered from one JSX value keeps exactly one instance of the banner,
 *    which is what preserves the single-`installUpdate()`-call-site invariant
 *    documented in `App.tsx`. Duplicating this markup into the welcome branch
 *    would break it.
 * 2. It is renderable headlessly, so `UpdateBanner.test.tsx` can prove a
 *    `downloaded` event actually produces a banner with working affordances.
 *
 * NO DECISION LOGIC LIVES HERE. Whether there is a banner at all is
 * `updateSurface()`'s call (`lib/update.ts`), which is pure and separately
 * tested; this component only draws the result. Keep it that way — see
 * AGENTS.md §7.
 */
export function UpdateBanner({ view, onRestart, onDismiss }: UpdateBannerProps): JSX.Element | null {
  if (view.kind !== "banner") return null;
  return (
    <div className="banner info">
      <span>Kanmer {view.version} is ready to install.</span>
      <div className="conflict-actions">
        <button className="primary xs" onClick={onRestart}>
          Restart now
        </button>
        <button
          className="ghost xs"
          title="Installs the next time you quit Kanmer."
          onClick={onDismiss}
        >
          Later
        </button>
      </div>
    </div>
  );
}
