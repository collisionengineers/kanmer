// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BoardWorktreeBanner, shouldShowBoardWorktreeBanner } from "./BoardWorktreeBanner.js";
import type { BoardWorktreeHealth } from "../../../shared/ipc.js";

const healthy: BoardWorktreeHealth = {
  path: "C:/project/.worktrees/kanmer",
  expectedBranch: "kanmer-board",
  actualBranch: "kanmer-board",
  onBoardBranch: true,
  boardSource: "file",
  ticketCount: 2,
  repair: "No repair required.",
};

describe("shouldShowBoardWorktreeBanner", () => {
  it("warns only for unhealthy branch state or a default board with tickets", () => {
    expect(shouldShowBoardWorktreeBanner(null)).toBe(false);
    expect(shouldShowBoardWorktreeBanner(healthy)).toBe(false);
    expect(shouldShowBoardWorktreeBanner({ ...healthy, boardSource: "default", ticketCount: 0 })).toBe(false);
    expect(shouldShowBoardWorktreeBanner({ ...healthy, actualBranch: "main", onBoardBranch: false })).toBe(true);
    expect(shouldShowBoardWorktreeBanner({ ...healthy, boardSource: "default" })).toBe(true);
  });
});

describe("BoardWorktreeBanner", () => {
  it("renders actionable observed details and opens existing settings", () => {
    const onOpenSettings = vi.fn();
    render(
      <BoardWorktreeBanner
        health={{ ...healthy, actualBranch: "main", onBoardBranch: false, boardSource: "default", repair: "Repair this board." }}
        onOpenSettings={onOpenSettings}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Board worktree needs attention.")).toBeTruthy();
    expect(screen.getByText("C:/project/.worktrees/kanmer")).toBeTruthy();
    expect(screen.getByText("main")).toBeTruthy();
    expect(screen.getByText(/default; 2 active tickets/)).toBeTruthy();
    expect(screen.getByText("Repair this board.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
    cleanup();
  });

  it("renders nothing for healthy and empty-default boards", () => {
    for (const health of [healthy, { ...healthy, boardSource: "default" as const, ticketCount: 0 }]) {
      const { container, unmount } = render(<BoardWorktreeBanner health={health} onOpenSettings={vi.fn()} />);
      expect(container.innerHTML).toBe("");
      unmount();
    }
    cleanup();
  });
});
