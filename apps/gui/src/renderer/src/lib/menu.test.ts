import { describe, expect, it } from "vitest";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  menuPosition,
  nextEnabledIndex,
  submenuPosition,
} from "./menu.js";

const VP = { width: 1000, height: 800 };
const SIZE = { width: 200, height: 300 };

describe("menu placement", () => {
  it("opens at the pointer when there is room", () => {
    expect(menuPosition(100, 100, SIZE, VP)).toEqual({ left: 100, top: 100 });
  });

  it("flips across the anchor near the right and bottom edges", () => {
    // Flipping, not sliding: sliding would leave the pointer resting on a menu
    // item, so the press that opened the menu could select something.
    expect(menuPosition(900, 100, SIZE, VP).left).toBe(700);
    expect(menuPosition(100, 700, SIZE, VP).top).toBe(400);
  });

  it("flips both axes in a corner", () => {
    expect(menuPosition(950, 780, SIZE, VP)).toEqual({ left: 750, top: 480 });
  });

  it("pins a menu larger than the viewport inside it", () => {
    const huge = { width: 1200, height: 900 };
    const p = menuPosition(500, 500, huge, VP);
    expect(p.left).toBe(8);
    expect(p.top).toBe(8);
  });

  it("never places a menu off the top or left", () => {
    const p = menuPosition(2, 2, SIZE, VP);
    expect(p.left).toBeGreaterThanOrEqual(8);
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
});

describe("submenu placement", () => {
  it("opens to the right of its parent row", () => {
    expect(submenuPosition({ left: 100, right: 300, top: 200 }, SIZE, VP).left).toBe(300);
  });

  it("opens to the left when the right would overflow", () => {
    // 880 + 200 + 8 > 1000, so it flips to the parent's left edge.
    expect(submenuPosition({ left: 680, right: 880, top: 200 }, SIZE, VP).left).toBe(480);
  });
});

describe("keyboard navigation", () => {
  const items = [
    { disabled: false },
    { disabled: true },
    { disabled: false },
    { disabled: true },
  ];

  it("skips disabled items in both directions", () => {
    expect(nextEnabledIndex(items, 0, 1)).toBe(2);
    expect(nextEnabledIndex(items, 2, -1)).toBe(0);
  });

  it("wraps around the ends", () => {
    expect(nextEnabledIndex(items, 2, 1)).toBe(0);
    expect(nextEnabledIndex(items, 0, -1)).toBe(2);
  });

  it("stays put when every item is disabled, so focus never lands nowhere", () => {
    const allOff = [{ disabled: true }, { disabled: true }];
    expect(nextEnabledIndex(allOff, 0, 1)).toBe(0);
  });

  it("finds the first and last enabled item for Home and End", () => {
    expect(firstEnabledIndex(items)).toBe(0);
    expect(lastEnabledIndex(items)).toBe(2);
    expect(lastEnabledIndex([{ disabled: true }])).toBe(-1);
  });

  it("handles a single enabled item without spinning", () => {
    const one = [{ disabled: true }, { disabled: false }];
    expect(nextEnabledIndex(one, 1, 1)).toBe(1);
    expect(nextEnabledIndex(one, 1, -1)).toBe(1);
  });
});
