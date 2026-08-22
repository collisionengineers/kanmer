import { afterEach, describe, expect, it, vi } from "vitest";
import { armAutomaticSync } from "./syncTimer.js";

describe("armAutomaticSync", () => {
  afterEach(() => vi.useRealTimers());

  it("re-arms the saved interval after a successful retry", () => {
    vi.useFakeTimers();
    const state: { syncTimer?: ReturnType<typeof setInterval> } = {};
    const sync = vi.fn();

    // A failed retry stays paused and does not invent a timer.
    armAutomaticSync(state, false, 5, sync);
    expect(state.syncTimer).toBeUndefined();
    vi.advanceTimersByTime(5 * 60_000);
    expect(sync).not.toHaveBeenCalled();

    // Once the same project is repaired, the saved interval is live again.
    armAutomaticSync(state, true, 5, sync);
    expect(state.syncTimer).toBeDefined();
    vi.advanceTimersByTime(5 * 60_000);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("replaces an existing interval without leaving duplicate timers", () => {
    vi.useFakeTimers();
    const state: { syncTimer?: ReturnType<typeof setInterval> } = {};
    const sync = vi.fn();

    armAutomaticSync(state, true, 1, sync);
    armAutomaticSync(state, true, 2, sync);
    vi.advanceTimersByTime(2 * 60_000);

    expect(sync).toHaveBeenCalledTimes(1);
  });
});
