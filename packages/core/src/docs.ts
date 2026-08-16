import type { BoardConfig, DocType, GateRule } from "./types.js";

/**
 * The default per-area document set: the pipeline every ticket gets unless its
 * board (or area) overrides it. ORDER is the hierarchy; `requires` names the
 * docs that must exist before this one may be written. This is also the
 * fallback when a board carries no `docs.default.types`.
 *
 * `TICKET_DOCS` used to be a fixed const of five names; the doc set is now
 * data, per area, so this array is the shipped starting point, not a law.
 */
export const DEFAULT_DOC_TYPES: DocType[] = [
  { id: "research", name: "Research" },
  { id: "impact", name: "Impact" },
  { id: "open-questions", name: "Open questions" },
  { id: "plan", name: "Plan", requires: ["research", "impact"] },
  { id: "checklist", name: "Checklist", requires: ["plan"], progress: true },
  { id: "post-implementation-report", name: "Post-implementation report" },
  { id: "proof", name: "Proof" },
];

/**
 * The default hard gates: doc-before-stage requirements enforced on
 * transitions. Threshold semantics live in {@link evaluateGates}. A gate whose
 * boundary stage is absent on a board is inert, so this same set is safe on
 * custom and backfilled boards. This is the fallback when a board carries no
 * `docs.default.gates`.
 *
 * The last rule (`proof` before entering `done`) preserves today's
 * proof-before-final-stage behaviour exactly. The first (`needsRepoDoc` before
 * leaving `backlog`) is the standard PRD/FRD/ADR requirement, satisfied by a
 * governing-doc `refs` link or the `docs_todo` escape.
 */
export const DEFAULT_GATES: GateRule[] = [
  { needsRepoDoc: ["prd", "frd", "adr"], before: { leave: "backlog" } },
  { needs: "research", before: { leave: "researching" } },
  { needs: "impact", before: { leave: "researching" } },
  { needs: "plan", before: { leave: "planning" } },
  { needs: "checklist", before: { leave: "planning" } },
  { needs: "post-implementation-report", before: { enter: "review" } },
  { needs: "proof", before: { enter: "done" } },
];

/** Default map of governing-doc kind → repo-relative glob. */
export const DEFAULT_REPO_DOCS: Record<string, string> = {
  prd: "docs/prd/**",
  frd: "docs/frd/**",
  adr: "docs/adr/**",
};

/**
 * The doc types for one area: the area's own override, else the board default,
 * else the shipped {@link DEFAULT_DOC_TYPES}. Pure — takes an already-read board.
 */
export function resolveDocTypes(board: BoardConfig, areaId: string | undefined): DocType[] {
  const areaOverride = areaId ? board.docs?.areas?.[areaId]?.types : undefined;
  return areaOverride ?? board.docs?.default?.types ?? DEFAULT_DOC_TYPES;
}

/**
 * The gate rules for one area: the area's own override, else the board default,
 * else the shipped {@link DEFAULT_GATES}. Types and gates resolve independently,
 * so an area may override its doc set while inheriting the default gates.
 */
export function resolveGates(board: BoardConfig, areaId: string | undefined): GateRule[] {
  const areaOverride = areaId ? board.docs?.areas?.[areaId]?.gates : undefined;
  return areaOverride ?? board.docs?.default?.gates ?? DEFAULT_GATES;
}

/** The repoDocs map for a board (explicit config, else the shipped default). */
export function repoDocsMap(board: BoardConfig): Record<string, string> {
  // Format 3 lifts this to the top level; the v2 `docs.repoDocs` is still read
  // so an unmigrated board classifies its governing docs correctly.
  return board.repoDocs ?? board.docs?.repoDocs ?? DEFAULT_REPO_DOCS;
}

/**
 * The governing-doc kind (`prd`/`frd`/`adr`/…) a repo-relative path resolves
 * to, or null when it matches no configured glob. Paths are POSIX-normalised
 * first, so a Windows `\` separator still matches a `/` glob.
 */
export function repoDocKindOf(board: BoardConfig, relPath: string): string | null {
  const norm = relPath.replace(/\\/g, "/");
  for (const [kind, glob] of Object.entries(repoDocsMap(board))) {
    if (globToRegExp(glob).test(norm)) return kind;
  }
  return null;
}

/** Minimal glob → RegExp: `**` spans path segments, `*` stays within one, `?` one char. */
function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if (".+^${}()|[]\\".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/** A gate that was not satisfied for a transition. */
export interface GateViolation {
  gate: GateRule;
  /** Human-readable reason (the missing doc/repo-doc). */
  reason: string;
}

/** The inputs {@link evaluateGates} needs, kept pure so it is trivially testable. */
export interface GateContext {
  /** Ordered status ids of the board. */
  statuses: string[];
  from: string;
  to: string;
  /** Does the ticket already have this pipeline doc? */
  hasDoc: (docId: string) => boolean;
  /** Is at least one of these governing-doc kinds satisfied (a ref of that kind, or docs_todo)? */
  repoDocSatisfied: (kinds: string[]) => boolean;
}

/**
 * Which gates a transition violates. Pure and total.
 *
 * Threshold semantics: `leave: X` → `T = idx(X)+1`; `enter: Y` → `T = idx(Y)`.
 * A gate fires when the move crosses `T` upward — `idx(to) >= T && idx(from) < T`
 * — so multi-stage jumps can't skip a gate. A gate whose boundary stage is not
 * on the board (`idx = -1`) is inert. Moving to a status the board doesn't
 * define is not gated here (the caller rejects the unknown status separately).
 */
export function evaluateGates(gates: GateRule[], ctx: GateContext): GateViolation[] {
  const idxOf = (s: string) => ctx.statuses.indexOf(s);
  const toIdx = idxOf(ctx.to);
  if (toIdx === -1) return [];
  const fromIdx = idxOf(ctx.from);
  const violations: GateViolation[] = [];
  for (const gate of gates) {
    const boundary = gate.before.leave ?? gate.before.enter;
    if (boundary === undefined) continue;
    const stageIdx = idxOf(boundary);
    if (stageIdx === -1) continue; // gate stage absent → inert
    const threshold = gate.before.leave !== undefined ? stageIdx + 1 : stageIdx;
    if (!(toIdx >= threshold && fromIdx < threshold)) continue;
    if (gate.needs !== undefined) {
      if (!ctx.hasDoc(gate.needs)) {
        violations.push({ gate, reason: `${gate.needs}.md is missing` });
      }
    } else if (gate.needsRepoDoc !== undefined) {
      if (!ctx.repoDocSatisfied(gate.needsRepoDoc)) {
        violations.push({
          gate,
          reason: `a governing document (${gate.needsRepoDoc.join("/")}) must be linked in refs, or docs_todo set`,
        });
      }
    }
  }
  return violations;
}
