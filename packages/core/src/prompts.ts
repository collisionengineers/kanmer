import type { Item, TicketDocsInfo } from "./types.js";

/**
 * Prompt texts, in core so the MCP prompt and the GUI's dispatch picker share
 * one source and cannot drift (FRD-010 R2, ADR-0009).
 *
 * `takeTicketPromptText` is the whole-ticket brief. The task prompts below are
 * the granular ones dispatch fires at a **single deliverable** — the point of
 * FRD-010 is that a background agent finishes one thing and stops, rather than
 * running a whole ticket unattended.
 */

/** The headless safety and stopping clauses every dispatched task carries. */
const HEADLESS_DELIVERY = [
  // FRD-009 R3 — the headless rule.
  "No user is available. If you hit a decision only the user can make, take the " +
    "most reasonable option, record the question and the assumption you made in " +
    "the ticket's open-questions, and continue — never guess forward across a " +
    "second decision that depends on the first.",
  "Stop when the deliverable exists. Do not carry on into the next stage's work.",
].join(" ");

const COMMON = [
  // FRD-003 T9 — the read-everything duty. Stated here because a dispatched
  // agent may never load a skill; the prompt is the layer that always arrives.
  "Before anything else, read the whole ticket: get_item, then get_doc_gates, " +
    "then every existing document in the ticket folder including reference/ " +
    "(human-supplied inputs) and the shared context of any group it belongs to.",
  HEADLESS_DELIVERY,
].join(" ");

/** The execution lane must receive its packet before any ticket reconstruction. */
const EXECUTION_COMMON = [
  "Call get_status, then make get_execution_packet the first ticket-specific call. " +
    "If an occupancy refusal names an existing branch and worktree, retry only that call " +
    "with those exact values in resume; stop on every other refusal.",
  "A ready packet with ticket.taken is resumed work: validate and reuse its exact " +
    "branch/worktree without git worktree add or take_ticket. Only a packet without " +
    "ticket.taken may create a fresh worktree and call take_ticket.",
  "After the packet is ready, read its listed documents and group contexts, then discover and read every human-supplied file in the ticket's reference/ directory before editing — including non-Markdown inputs omitted from extraDocs.",
  HEADLESS_DELIVERY,
].join(" ");

export function takeTicketPromptText(id: string): string {
  return (
    `Execute Kanmer ticket ${id}. ${EXECUTION_COMMON} Follow the packet's resolved ` +
    `gates at each boundary — requirements vary by profile — and stop at Review ` +
    `for independent review; proof is written only after the merge.`
  );
}

/** One dispatchable task: a granular deliverable with an unambiguous done-condition. */
export interface DispatchTask {
  id: DispatchTaskId;
  label: string;
  /** What must exist for this task to be finished. */
  deliverable: string;
  /**
   * `verificationTarget` is the branch whose exact merge SHA verification must
   * prove — the project's configured integration branch (FRD-031), which is
   * `main` only because that is most projects' default. Callers that have a
   * board pass it; those that do not (a settings preview) get the neutral
   * phrase rather than a wrong branch name.
   */
  prompt: (ticketId: string, verificationTarget?: string) => string;
}

/** What a prompt says when the caller has no board to resolve a target from. */
export const NEUTRAL_VERIFICATION_TARGET = "the merged integration branch";

export type DispatchTaskId =
  | "research-quick"
  | "research-deep"
  | "files"
  | "plan"
  | "execute"
  | "verify";

export const DISPATCH_PROMPT_SUFFIX_MAX = 4000;
const SUFFIX_HEADER = "Additional operator instructions for this provider:";

/** Compose an append-only operator suffix without forking the built-in prompt. */
export function composeDispatchPrompt(builtIn: string, suffix = ""): string {
  if (suffix.length > DISPATCH_PROMPT_SUFFIX_MAX || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(suffix)) {
    throw new Error(`dispatch prompt suffix must be at most ${DISPATCH_PROMPT_SUFFIX_MAX} characters and contain no control characters`);
  }
  const normalized = suffix.trim();
  return normalized ? `${builtIn}\n\n${SUFFIX_HEADER}\n${normalized}` : builtIn;
}

/**
 * The dispatch task menu (FRD-010 R1). Each maps to one skill's deliverable,
 * and each done-condition is a thing that either exists on disk or does not —
 * "the documents exist", not "the research is good enough".
 */
export const DISPATCH_TASKS: readonly DispatchTask[] = Object.freeze([
  {
    id: "research-quick",
    label: "Research (quick)",
    deliverable: "at least one document under research/",
    prompt: (id) =>
      `Research Kanmer ticket ${id} — quick mode. ${COMMON} Answer the ticket's ` +
      `question from whatever sources actually hold the answer (the codebase, ` +
      `vendor documentation, read-only inspection of the live estate) and record ` +
      `the findings under research/. Every finding cites its source — a file and ` +
      `line, a URL, or the exact command you ran. An unsourced claim is not a ` +
      `finding. Write nothing outside the ticket folder; create no branch.`,
  },
  {
    id: "research-deep",
    label: "Deep research",
    deliverable: "research/ subfolders plus research/summary.md",
    prompt: (id) =>
      `Research Kanmer ticket ${id} — deep mode. ${COMMON} First write the ` +
      `questions you need answered. Then work them one per topic, fanning out ` +
      `across source classes: web and vendor documentation, the codebase itself, ` +
      `read-only inspection of the live estate, and the ticket's own reference ` +
      `files. One document per topic under research/<topic>/. Finish with ` +
      `research/summary.md — the synthesis planning will read, every finding ` +
      `carrying its source. Read-only throughout: no branch, no worktree, no ` +
      `writes outside the ticket folder.`,
  },
  {
    id: "files",
    label: "Map files",
    deliverable: "at least one document under files/",
    prompt: (id) =>
      `Map where the change for Kanmer ticket ${id} lands. ${COMMON} Write it ` +
      `under files/ in two sections: **Files to change** (path, why, risk) and ` +
      `**Context files** (path, what it tells the implementer). This is not ` +
      `research — research is what you learned, this is where the change lands. ` +
      `Paths only, no findings.`,
  },
  {
    id: "plan",
    label: "Write plan + checklist",
    deliverable: "documents under plan/ and checklist/",
    prompt: (id) =>
      `Plan Kanmer ticket ${id}. ${COMMON} Start from research/summary.md when it ` +
      `exists, otherwise from research/ and files/. Write the approach under ` +
      `plan/ — including the alternatives you rejected and why — and derive an ` +
      `executable checklist/ from it. Where real alternatives exist and the ` +
      `choice is the user's, record it in open-questions with your recommendation ` +
      `rather than silently picking.`,
  },
  {
    id: "execute",
    label: "Execute checklist",
    deliverable: "the checklist worked, a post-implementation report, a PR open",
    prompt: (id) =>
      `Implement Kanmer ticket ${id}. ${EXECUTION_COMMON} Work the checklist, ` +
      `appending progress as you go, and keep files/ current as you discover things ` +
      `it did not predict. Finish with the post-implementation report and the PR open.`,
  },
  {
    id: "verify",
    label: "Verify + write proof",
    deliverable: "at least one document under proof/",
    prompt: (id, verificationTarget) =>
      `Verify Kanmer ticket ${id} on merged ${verificationTarget ?? NEUTRAL_VERIFICATION_TARGET}. ${COMMON} Run the checks for ` +
      `real — do not reason about what would happen — and record the evidence ` +
      `under proof/. Check what get_doc_gates says the required proof type is: a ` +
      `visual proof wants a screenshot under proof/assets/, test-output wants the ` +
      `actual output, command-log wants the commands and what they printed. ` +
      `Compiling is not evidence.`,
  },
]);

export function dispatchTaskById(id: string): DispatchTask | undefined {
  return DISPATCH_TASKS.find((t) => t.id === id);
}

/**
 * The terminal proof for a dispatched task. Exit 0 is only a process result;
 * this checks the named deliverable the prompt promised before a supervisor
 * can report `done` (FRD-010 R5/R10).
 */
export function dispatchDeliverableProven(
  taskId: string | undefined,
  info: TicketDocsInfo | null,
  item: Pick<Item, "prs"> | null,
): boolean {
  if (!taskId || !info) return false;
  const has = (type: string) => (info.counts[type] ?? 0) > 0;
  const hasPath = (path: string) => info.documentPaths.some((candidate) => candidate.replace(/\\/g, "/") === path);
  switch (taskId) {
    case "research-quick":
      return has("research");
    case "research-deep":
      return has("research") && hasPath("research/summary.md");
    case "files":
      return has("files");
    case "plan":
      return has("plan") && has("checklist");
    case "execute":
      return has("checklist") && info.checklist !== null && info.checklist.total > 0 &&
        info.checklist.checked === info.checklist.total && has("post-implementation-report") &&
        (item?.prs?.length ?? 0) > 0;
    case "verify":
      return has("proof");
    default:
      return false;
  }
}

/** Whether a task is a coherent next step, and why not when it is not. */
export interface TaskFeasibility {
  ok: boolean;
  /** Set when `ok` is false — shown on the disabled menu row. */
  reason?: string;
  /** Set when `ok` is true but an input the task builds on is missing. */
  warning?: string;
}

/**
 * Whether dispatching `taskId` at this ticket makes sense right now.
 *
 * **Deliberately permissive.** It blocks only the two cases where the task's own
 * prompt cannot be followed at all; everything else is enabled with a warning.
 * Disabling on judgement teaches people the menu is wrong and to stop reading
 * it, and a task that produces a document the ticket's profile does not require
 * is still legitimate — profiles decide what is *owed*, not what is allowed.
 *
 * Pure, and here rather than in the renderer because it is a statement about
 * the task menu, which lives here.
 */
export function taskFeasibility(
  taskId: string,
  ctx: { stage: string; docCounts: Readonly<Record<string, number>> },
): TaskFeasibility {
  const has = (type: string): boolean => (ctx.docCounts[type] ?? 0) > 0;

  switch (taskId) {
    case "execute":
      // Its prompt says "work the checklist". There is not one.
      if (!has("plan")) {
        return { ok: false, reason: "no plan yet — dispatch “Write plan + checklist” first" };
      }
      return has("checklist")
        ? { ok: true }
        : { ok: true, warning: "no checklist — the agent will work from the plan alone" };

    case "verify":
      // Its prompt says "on merged <integration branch>". Before review,
      // nothing is merged, whatever that branch is called.
      if (ctx.stage === "backlog" || ctx.stage === "preparing" || ctx.stage === "implementing") {
        return { ok: false, reason: `nothing is merged yet — verify runs on ${NEUTRAL_VERIFICATION_TARGET}` };
      }
      return { ok: true };

    case "plan":
      return has("research") || has("files")
        ? { ok: true }
        : { ok: true, warning: "no research or files yet — the plan will be less grounded" };

    case "research-deep":
      return has("research")
        ? { ok: true, warning: "research already exists — deep mode will add to it" }
        : { ok: true };

    default:
      return { ok: true };
  }
}
