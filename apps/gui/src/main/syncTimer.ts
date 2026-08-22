export interface SyncTimerState {
  syncTimer?: ReturnType<typeof setInterval>;
}

/**
 * Replace the automatic sync interval for one open project.
 *
 * Keeping this lifecycle in one place matters when a project recovers from a
 * paused Git state: the retry may have no timer left to fire the next sync.
 */
export function armAutomaticSync(
  state: SyncTimerState,
  enabled: boolean,
  minutes: number,
  callback: () => void,
): void {
  if (state.syncTimer !== undefined) clearInterval(state.syncTimer);
  state.syncTimer = undefined;
  if (enabled && minutes > 0) state.syncTimer = setInterval(callback, minutes * 60_000);
}
