import { describe, expect, it } from "vitest";
import { parseItem, serialiseItem } from "./frontmatter.js";

const SAMPLE = `---
id: TICK-001
type: ticket
title: Wire up create_item tool
status: implementing
priority: medium
assignee: ""
labels:
  - mcp
  - tooling
links:
  - PLAN-002
  - RES-004
created: 2026-08-12T10:00:00.000Z
updated: 2026-08-12T11:30:00.000Z
---
Description body with a [[RES-004]] wiki-link.
`;

describe("frontmatter", () => {
  it("parses frontmatter and body", () => {
    const item = parseItem(SAMPLE);
    expect(item.id).toBe("TICK-001");
    expect(item.type).toBe("ticket");
    expect(item.labels).toEqual(["mcp", "tooling"]);
    expect(item.links).toEqual(["PLAN-002", "RES-004"]);
    expect(item.body).toContain("[[RES-004]]");
  });

  it("round-trips stably (parse → serialise → parse)", () => {
    const first = parseItem(SAMPLE);
    const text = serialiseItem(first);
    const second = parseItem(text);
    expect(second).toEqual(first);
    // Serialising again is idempotent.
    expect(serialiseItem(second)).toBe(text);
  });

  it("preserves unknown hand-added frontmatter keys", () => {
    const withExtra = SAMPLE.replace("updated:", "sprint: q3\nupdated:");
    const item = parseItem(withExtra);
    expect((item as Record<string, unknown>).sprint).toBe("q3");
    expect(serialiseItem(item)).toContain("sprint: q3");
  });

  it("round-trips a legacy file that still carries phase:", () => {
    // Boards written before status/phase were consolidated have a phase key.
    // It should ride along untouched rather than break the parse.
    const legacy = SAMPLE.replace("status: implementing", "phase: build\nstatus: implementing");
    const item = parseItem(legacy);
    expect(item.status).toBe("implementing");
    expect((item as Record<string, unknown>).phase).toBe("build");
    expect(parseItem(serialiseItem(item))).toEqual(item);
  });
});
