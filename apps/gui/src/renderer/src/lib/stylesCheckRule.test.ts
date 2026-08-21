/**
 * A RULE-PRESENCE assertion over `styles.css` — deliberately NOT a layout test.
 *
 * It reads the stylesheet as text and checks that the selectors GUI-072 added
 * are still there. It does **not** render anything, does not cascade, and
 * cannot tell you that a checkbox is 13px wide rather than 866px — that
 * measurement needs a real browser, and `apps/gui` intentionally has no
 * browser test dependency (vitest here runs in the `node` environment over
 * pure logic; see GUI-072 open-questions O2).
 *
 * So: this catches someone deleting or renaming the audited rules. It does not
 * catch a layout regression arriving by some other route. Do not upgrade the
 * claim in this comment without also upgrading the mechanism.
 *
 * The layout evidence for GUI-072 lives in its proof.md: headless-Chromium
 * renders of every `.check` call site, before and after, measured and viewed.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

/** Body of the first rule whose selector list is exactly `selector`. */
function ruleBody(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  return match ? match[1] : null;
}

describe("styles.css checkbox-row rules (presence only — not a layout assertion)", () => {
  it("declares a bare `.check` rule that lays the row out as a flex line", () => {
    const body = ruleBody(".check");
    expect(body, "no bare `.check` rule — checkbox rows fall back to `display:inline` (GUI-072)").not.toBeNull();
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/align-items:\s*center/);
  });

  it("gives the checkbox its intrinsic width back", () => {
    // Without this the global `input, select, textarea { width: 100% }` rule
    // stretches the box across the whole row. This is the actual bug.
    const body = ruleBody(".check input");
    expect(body, "no `.check input` rule — the global full-width input rule still applies").not.toBeNull();
    expect(body).toMatch(/width:\s*auto/);
  });

  it("uses the shared checkbox rule in TicketCreate while preserving its local spacing and type", () => {
    expect(ruleBody(".check-row")).toBeNull();
    expect(ruleBody(".check-row input")).toBeNull();
    const body = ruleBody(".modal.ticket-create .check");
    expect(body).not.toBeNull();
    expect(body).toMatch(/margin-top:\s*6px/);
    expect(body).toMatch(/font-size:\s*12px/);
  });

  it("no longer scopes checkbox rows to the filter bar", () => {
    // `.filterbar .check` was dead CSS: FilterBar has had no checkbox since the
    // initial commit, and its existence is what made `.check` look styled.
    expect(css).not.toMatch(/\.filterbar\s+\.check\b/);
  });

  it("keeps dynamic selector families while removing the audited dead rules", () => {
    expect(css).toMatch(/\.card\.drop-before::before/);
    expect(css).toMatch(/\.card\.drop-after::after/);
    expect(css).toMatch(/\.chip\.dispatch-state\.timed-out/);

    for (const selector of [
      ".pri",
      ".pri-high",
      ".pri-urgent",
      ".list-updated",
      ".list-quickadd",
      ".chip.overdue",
      ".editor-resize",
      ".settings-grid",
      ".section-head",
      ".doc-type-row",
      ".doc-requires",
      ".gate-row",
      ".env-editor",
      ".env-add",
    ]) {
      expect(ruleBody(selector), `${selector} should remain removed by GUI-082`).toBeNull();
    }
  });
});
