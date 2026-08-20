import { describe, expect, it } from "vitest";
import { friendlyGateError } from "./gateError.js";

describe("friendlyGateError", () => {
  it("translates a current missing-document gate refusal", () => {
    const message =
      'API-003 cannot move from "verifying" to "done": entering Done requires proof (profile "fix"). ' +
      "Write the missing document(s) with set_ticket_doc, then move. Call get_doc_gates for the full picture.";
    const result = friendlyGateError(message);

    expect(result).not.toBe(message);
    expect(result).toContain("ticket's document tabs");
    expect(result).toContain("readiness panel");
    expect(result).not.toContain("set_ticket_doc");
    expect(result).not.toContain("get_doc_gates");
  });

  it("translates questions-resolved recovery without leaking tool names", () => {
    const message =
      'API-003 cannot move from "preparing" to "implementing": leaving Preparing requires questions-resolved (profile "fix"). ' +
      'Write the missing document(s) with set_ticket_doc. "questions-resolved" is not a document: open-questions/ still has unticked "- [ ]" lines. Call get_doc_gates for the full picture.';
    const result = friendlyGateError(message);

    expect(result).toContain("questions-resolved");
    expect(result).toContain("ticket's document tabs");
    expect(result).not.toContain("set_ticket_doc");
    expect(result).not.toContain("get_doc_gates");
  });

  it("translates a current multi-boundary refusal", () => {
    const message =
      'API-003 cannot move from "backlog" to "done" in one step: that crosses 3 document gates (leaving Backlog, leaving Preparing, entering Review). A single move may cross one. Move one stage at a time — the next is "preparing". Call get_doc_gates for the full picture.';
    const result = friendlyGateError(message);

    expect(result).not.toBe(message);
    expect(result).toContain("readiness panel");
    expect(result).toContain("one stage at a time");
    expect(result).not.toContain("get_doc_gates");
  });

  it("leaves non-gate errors unchanged", () => {
    expect(friendlyGateError("Disk write failed.")).toBe("Disk write failed.");
  });
});
