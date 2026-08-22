// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDismissOnOutside } from "./ContextMenu.js";

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
});
