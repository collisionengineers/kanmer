import { describe, expect, it } from "vitest";
import { rangeBetween, windowedRows } from "./windowedRows.js";

const base = { rowHeight: 32, viewportHeight: 640, scrollTop: 0 };

describe("windowedRows", () => {
  it("renders from the top with overscan clamped at zero", () => {
    const w = windowedRows({ ...base, count: 200 });
    expect(w.start).toBe(0); // not -3
    expect(w.padTop).toBe(0);
    // 640/32 = 20 visible, +1 partial, +3 overscan
    expect(w.end).toBe(24);
    expect(w.padBottom).toBe((200 - 24) * 32);
  });

  it("keeps total height constant as it scrolls", () => {
    const total = 200 * 32;
    for (const scrollTop of [0, 100, 1000, 3200, 5760]) {
      const w = windowedRows({ ...base, count: 200, scrollTop });
      const rendered = (w.end - w.start) * 32;
      expect(w.padTop + rendered + w.padBottom, `scrollTop=${scrollTop}`).toBe(total);
    }
  });

  it("renders everything when the list is shorter than the viewport", () => {
    const w = windowedRows({ ...base, count: 5 });
    expect(w).toEqual({ start: 0, end: 5, padTop: 0, padBottom: 0 });
  });

  it("is empty for an empty list", () => {
    expect(windowedRows({ ...base, count: 0 })).toEqual({
      start: 0, end: 0, padTop: 0, padBottom: 0,
    });
  });

  it("clamps a scroll position past the end", () => {
    // A filter tightening can leave the viewport scrolled far beyond the new
    // list; without clamping, start runs past count and nothing renders.
    const w = windowedRows({ ...base, count: 10, scrollTop: 99_999 });
    expect(w.start).toBeLessThan(10);
    expect(w.end).toBe(10);
    expect(w.padTop + (w.end - w.start) * 32 + w.padBottom).toBe(10 * 32);
  });

  it("never returns an end beyond the row count", () => {
    for (const count of [1, 7, 19, 20, 21, 200]) {
      const w = windowedRows({ ...base, count, scrollTop: count * 32 });
      expect(w.end, `count=${count}`).toBeLessThanOrEqual(count);
      expect(w.start).toBeLessThanOrEqual(w.end);
    }
  });

  it("guards a zero row height instead of dividing by it", () => {
    expect(windowedRows({ ...base, rowHeight: 0, count: 50 }).end).toBe(0);
  });

  it("keeps the scrolled band aligned with the offset", () => {
    const w = windowedRows({ ...base, count: 1000, scrollTop: 320 }); // 10 rows down
    expect(w.start).toBe(7); // 10 - 3 overscan
    expect(w.padTop).toBe(7 * 32);
  });
});

describe("rangeBetween", () => {
  const ids = ["A", "B", "C", "D", "E"];

  it("selects inclusive in display order, either direction", () => {
    expect(rangeBetween(ids, "B", "D")).toEqual(["B", "C", "D"]);
    expect(rangeBetween(ids, "D", "B")).toEqual(["B", "C", "D"]);
  });

  it("a single row is just itself", () => {
    expect(rangeBetween(ids, "C", "C")).toEqual(["C"]);
  });

  it("falls back to the clicked row when the anchor has been filtered away", () => {
    expect(rangeBetween(ids, "ZZ", "C")).toEqual(["C"]);
  });
});

describe("scale — the property that makes this a virtualized list", () => {
  it("renders a constant number of rows no matter how long the list is", () => {
    // The 200-row fixture the ticket names, and three orders of magnitude
    // beyond it. If this number grows with `count`, the window is not working
    // and the DOM is the bottleneck again.
    const maxFor = (count: number): number => {
      let max = 0;
      for (let scrollTop = 0; scrollTop <= count * 32; scrollTop += 137) {
        const w = windowedRows({ count, rowHeight: 32, viewportHeight: 640, scrollTop });
        max = Math.max(max, w.end - w.start);
      }
      return max;
    };
    const at200 = maxFor(200);
    expect(at200).toBeLessThanOrEqual(30);
    expect(maxFor(1_000)).toBe(at200);
    expect(maxFor(10_000)).toBe(at200);
  });

  it("keeps the scroll height exact at every offset, at every size", () => {
    // A drifting total means the scrollbar lies and the list jumps as you drag.
    for (const count of [1, 200, 1_000, 10_000]) {
      for (let scrollTop = 0; scrollTop <= count * 32; scrollTop += 137) {
        const w = windowedRows({ count, rowHeight: 32, viewportHeight: 640, scrollTop });
        expect(w.padTop + (w.end - w.start) * 32 + w.padBottom, `${count}@${scrollTop}`).toBe(
          count * 32,
        );
      }
    }
  });
});
