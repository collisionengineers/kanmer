// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, useDismissOnOutside } from "./ContextMenu.js";

afterEach(cleanup);

function DismissHarness({ onClose }: { onClose: () => void }): JSX.Element {
  useDismissOnOutside(onClose, true);
  return (
    <>
      <div className="ctx-menu">
        <button type="button">inside menu</button>
      </div>
      <div data-testid="outside">outside</div>
    </>
  );
}

describe("context-menu dismissal", () => {
  it("keeps the bounded menu open while scrolling inside it", () => {
    const onClose = vi.fn();
    render(<DismissHarness onClose={onClose} />);

    fireEvent.wheel(screen.getByRole("button", { name: "inside menu" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.wheel(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("returns focus to the parent item when ArrowLeft closes a submenu", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu
        x={10}
        y={10}
        onClose={onClose}
        items={[
          {
            id: "move",
            label: "Move to",
            items: [{ id: "review", label: "Review", onSelect: vi.fn() }],
          },
          { id: "copy", label: "Copy ID", onSelect: vi.fn() },
        ]}
      />,
    );

    const root = screen.getByRole("menu", { name: "Actions" });
    const parent = screen.getByRole("menuitem", { name: /Move to/ });
    fireEvent.keyDown(root, { key: "ArrowDown" });
    fireEvent.keyDown(root, { key: "ArrowRight" });

    const submenu = screen.getByRole("menu", { name: "Move to" });
    expect(parent.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(submenu, { key: "ArrowLeft" });

    expect(screen.queryByRole("menu", { name: "Move to" })).toBeNull();
    expect(parent.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(parent);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Escape on the root menu as whole-menu dismissal", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu
        x={10}
        y={10}
        onClose={onClose}
        items={[{ id: "copy", label: "Copy ID", onSelect: vi.fn() }]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("menu", { name: "Actions" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
