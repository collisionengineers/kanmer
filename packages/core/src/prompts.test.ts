import { describe, expect, it } from "vitest";
import { takeTicketPromptText } from "./prompts.js";

describe("takeTicketPromptText", () => {
  it("names the ticket id and mentions the pipeline + gate self-check", () => {
    const text = takeTicketPromptText("API-042");
    expect(text).toContain("API-042");
    expect(text).toMatch(/take_ticket/);
    expect(text).toMatch(/proof/);
    // The dispatch runner (Phase 7) and the MCP take-ticket prompt (Phase 2)
    // both build from this one function — a drift guard for that SSOT.
    expect(text).toContain("get_doc_gates");
  });
});
