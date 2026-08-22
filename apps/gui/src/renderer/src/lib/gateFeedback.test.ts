import { describe, expect, it } from "vitest";
import { editorDocumentType, gateRequirementLabel, parseGateFeedback } from "./gateFeedback.js";

describe("parseGateFeedback", () => {
  it("names the boundary and opens the missing document type", () => {
    expect(parseGateFeedback("done", ["entering Done: needs proof"])).toEqual({
      targetStatus: "done",
      boundary: "entering Done",
      requirements: [{ requirement: "proof", documentType: "proof" }],
    });
  });

  it("maps questions-resolved to its existing open-questions tab", () => {
    const result = parseGateFeedback("implementing", [
      "leaving Preparing: needs questions-resolved",
    ]);
    expect(result?.requirements).toEqual([
      { requirement: "questions-resolved", documentType: "open-questions" },
    ]);
  });

  it("keeps multiple boundary requirements and named document types", () => {
    const result = parseGateFeedback("done", [
      "leaving Preparing: needs files, plan",
      "entering Review: needs post-implementation-report",
    ]);
    expect(result?.boundary).toBe("leaving Preparing; entering Review");
    expect(result?.requirements).toEqual([
      { requirement: "files", documentType: "files" },
      { requirement: "plan", documentType: "plan" },
      { requirement: "post-implementation-report", documentType: "post-implementation-report" },
    ]);
    expect(editorDocumentType("research/auth")).toBe("research");
    expect(editorDocumentType("proof:visual")).toBe("proof");
    expect(editorDocumentType("governing-doc")).toBeNull();
  });

  it("returns null for non-gate and multi-stage refusal text", () => {
    expect(parseGateFeedback("done", [
      "a single move may cross one; the next is preparing",
    ])).toBeNull();
    expect(parseGateFeedback("done", [])).toBeNull();
  });

  it("removes presentation quotes from requirement labels", () => {
    expect(gateRequirementLabel('"questions-resolved"')).toBe("questions-resolved");
  });
});
