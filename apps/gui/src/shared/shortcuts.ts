/**
 * Every keyboard binding, as data.
 *
 * The manual's shortcuts chapter is generated from this and a test asserts the
 * two match. That test proves **the chapter matches this table** — it does not
 * prove the handler in `App.tsx` matches it, because the handler is still an
 * `if/else` chain. Making it table-driven is a larger change than the manual
 * needed; until then, adding a binding means adding it in both places.
 *
 * The view shortcuts are the exception and are derived from the view list at
 * render time, because a parallel array is exactly what went stale when the
 * Backlog view was added.
 */

export interface Shortcut {
  /** As a user would read it. */
  keys: string;
  label: string;
  /** Where it applies — "Anywhere", or the surface that owns it. */
  context: string;
}

export const SHORTCUTS: readonly Shortcut[] = Object.freeze([
  { keys: "Ctrl+K", label: "Command palette", context: "Anywhere" },
  { keys: "Ctrl+N", label: "New ticket", context: "Anywhere" },
  { keys: "Ctrl+F  /  /", label: "Focus search", context: "Anywhere" },
  { keys: "Ctrl+,", label: "Settings", context: "Anywhere" },
  { keys: "F1", label: "Manual", context: "Anywhere" },
  { keys: "Ctrl+1…4", label: "Switch view (Board, Backlog, Standup, Archived)", context: "Anywhere" },
  { keys: "Ctrl+Tab", label: "Next project tab (Shift for previous)", context: "Anywhere" },
  { keys: "Escape", label: "Close the topmost panel, else deselect", context: "Anywhere" },
  { keys: "↑ / ↓", label: "Move between rows", context: "Backlog" },
  { keys: "Space", label: "Select the focused row", context: "Backlog" },
  { keys: "Enter", label: "Open the focused row", context: "Backlog" },
  { keys: "← / →", label: "Move the selected ticket a stage", context: "Board" },
]);
