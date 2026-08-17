// @vitest-environment jsdom
/**
 * The repo's first React-rendering test (GUI-065). It exists because
 * `npm test` and `npm run typecheck` are BOTH green on the bug this ticket
 * fixes: the updater's decision logic was already correct and already tested
 * (`lib/update.test.ts`), and the bug was purely that the resulting JSX sat
 * below `App.tsx`'s `if (!root || !board)` early return.
 *
 * WHAT THIS PROVES: a real `downloaded` UpdateStatusEvent, run through the
 * real `updateSurface()`, renders a banner naming the version with working
 * "Restart now" and "Later" affordances — and that nothing renders when there
 * is no update or the banner was dismissed. That is a genuine headless
 * regression guard for the banner itself.
 *
 * WHAT THIS DOES NOT PROVE: that `App.tsx` mounts `<UpdateBanner/>` above the
 * early return, which is the actual bug. No component test can — the mounting
 * is the thing under test and it lives in the caller. That half is evidenced
 * by the screenshot in `proof.md`, taken from the real Electron app on the
 * welcome screen against a local update feed. Do not read a green run here as
 * covering the welcome screen.
 *
 * The jsdom environment is enabled per-file, on purpose: the other 21 test
 * files in `apps/gui` cover pure and main-process modules and have no business
 * running under a DOM (AGENTS.md §7).
 */
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { UpdateBanner } from "./UpdateBanner.js";
import { updateSurface } from "../lib/update.js";
import type { UpdateStatusEvent } from "../../../shared/ipc.js";

const downloaded: UpdateStatusEvent = {
  status: { phase: "downloaded", version: "9.9.9" },
  source: "auto",
};

describe("UpdateBanner", () => {
  it("renders the banner for a downloaded update, with both affordances", () => {
    const onRestart = vi.fn();
    const onDismiss = vi.fn();
    render(
      <UpdateBanner
        view={updateSurface(downloaded, false)}
        onRestart={onRestart}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Kanmer 9.9.9 is ready to install.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Restart now" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // The restart gate must not fire a second time from the dismiss path.
    expect(onRestart).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("renders nothing once the banner has been dismissed for this session", () => {
    const { container } = render(
      <UpdateBanner view={updateSurface(downloaded, true)} onRestart={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
    cleanup();
  });

  it("renders nothing when there is no update", () => {
    const { container } = render(
      <UpdateBanner view={updateSurface(null, false)} onRestart={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
    cleanup();
  });

  it("renders nothing while a download is still in flight (that is a toast, not a banner)", () => {
    const downloading: UpdateStatusEvent = {
      status: { phase: "downloading", version: "9.9.9", percent: 42 },
      source: "auto",
    };
    const { container } = render(
      <UpdateBanner
        view={updateSurface(downloading, false)}
        onRestart={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
    cleanup();
  });
});
