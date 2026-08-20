// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Welcome } from "./Welcome.js";

describe("Welcome", () => {
  it("shows the product logo without replacing the primary project picker", () => {
    render(<Welcome recentProjects={[]} onPick={vi.fn()} onOpen={vi.fn()} error={null} />);

    expect(screen.getByRole("img", { name: "Kanmer logo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open project folder…" })).toBeTruthy();
    cleanup();
  });
});
