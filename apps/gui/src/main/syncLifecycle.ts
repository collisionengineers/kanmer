/** State shared by operations that must not overlap for one project. */
export interface SyncLifecycleState {
  lifecycle?: Promise<void>;
}

/** Acquire one or more project lifecycle locks in a stable order. */
export async function withSyncLifecycles<T>(
  states: readonly SyncLifecycleState[],
  operation: () => Promise<T>,
): Promise<T> {
  const unique = [...new Set(states)];
  const releases: Array<() => void> = [];
  try {
    for (const state of unique) {
      const previous = state.lifecycle ?? Promise.resolve();
      let release!: () => void;
      state.lifecycle = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      releases.push(release);
    }
    return await operation();
  } finally {
    for (const release of releases.reverse()) release();
  }
}
