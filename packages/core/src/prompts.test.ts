import { describe, expect, it } from "vitest";
import { DISPATCH_TASKS, takeTicketPromptText, taskFeasibility } from "./prompts.js";

describe("takeTicketPromptText", () => {
  it("routes the public take-ticket prompt through the fresh-or-resumed execution packet", () => {
    const text = takeTicketPromptText("API-042");
    expect(text).toContain("API-042");
    expect(text).toContain("get_execution_packet");
    expect(text).toContain("ticket.taken");
    expect(text).toMatch(/take_ticket/);
    expect(text).toContain("without git worktree add or take_ticket");
    expect(text).toMatch(/reference\/.*non-Markdown.*extraDocs/i);
    expect(text).toMatch(/proof is written only after the merge/i);
  });

  it("routes the public execute dispatch through the same fresh-or-resumed lane", () => {
    const text = DISPATCH_TASKS.find((task) => task.id === "execute")?.prompt("API-042") ?? "";
    expect(text).toContain("get_execution_packet");
    expect(text).toContain("ticket.taken");
    expect(text).toContain("without git worktree add or take_ticket");
    expect(text).toMatch(/reference\/.*non-Markdown.*extraDocs/i);
    expect(text).not.toMatch(/Create the worktree and branch first/i);
  });
});

describe("taskFeasibility", () => {
  const at = (stage: string, docs: Record<string, number> = {}) => ({ stage, docCounts: docs });

  it("blocks execute without a plan, and says what to dispatch instead", () => {
    const f = taskFeasibility("execute", at("preparing"));
    expect(f.ok).toBe(false);
    expect(f.reason).toMatch(/no plan yet/);
  });

  it("allows execute with a plan but warns when the checklist is missing", () => {
    const f = taskFeasibility("execute", at("preparing", { plan: 1 }));
    expect(f.ok).toBe(true);
    expect(f.warning).toMatch(/no checklist/);
    expect(taskFeasibility("execute", at("preparing", { plan: 1, checklist: 1 }))).toEqual({
      ok: true,
    });
  });

  it("blocks verify before anything can have merged", () => {
    for (const stage of ["backlog", "preparing", "implementing"]) {
      const f = taskFeasibility("verify", at(stage));
      expect(f.ok, stage).toBe(false);
      expect(f.reason).toMatch(/merged main/);
    }
    for (const stage of ["review", "verifying", "done"]) {
      expect(taskFeasibility("verify", at(stage)).ok, stage).toBe(true);
    }
  });

  it("never blocks the read-only tasks — they are always a coherent thing to run", () => {
    for (const id of ["research-quick", "research-deep", "files", "plan"]) {
      expect(taskFeasibility(id, at("backlog")).ok, id).toBe(true);
    }
  });

  it("warns rather than blocks when a task's input is thin", () => {
    expect(taskFeasibility("plan", at("preparing")).warning).toMatch(/less grounded/);
    expect(taskFeasibility("plan", at("preparing", { research: 1 })).warning).toBeUndefined();
    expect(taskFeasibility("research-deep", at("preparing", { research: 1 })).warning).toMatch(
      /already exists/,
    );
  });

  it("is permissive about anything it does not know", () => {
    expect(taskFeasibility("some-future-task", at("backlog"))).toEqual({ ok: true });
  });

  it("covers every shipped task id", () => {
    // A task added to DISPATCH_TASKS without a thought about feasibility gets
    // the permissive default — this asserts that is a decision, not an oversight.
    for (const t of DISPATCH_TASKS) {
      expect(taskFeasibility(t.id, at("review", { plan: 1, checklist: 1 })).ok, t.id).toBe(true);
    }
  });
});
