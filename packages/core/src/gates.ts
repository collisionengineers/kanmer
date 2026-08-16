/**
 * The format-3 gate engine (FRD-002 G1–G5, FRD-006 R4).
 *
 * One function decides what a ticket owes: `evaluateGates`. The MCP server's
 * `get_doc_gates`, the GUI's readiness panel and every skill read the same
 * answer, so none of them restates a rule (ADR-0009). Skills that describe
 * gates in prose go stale per-ticket the moment profiles make requirements
 * vary; a call cannot.
 */

import {
  BOUNDARIES,
  STAGE_IDS,
  type Boundary,
  boundaryLabel,
  boundaryThreshold,
  stageIndex,
} from "./stages.js";
import {
  GOVERNING_DOC,
  type ProfileMap,
  type Requirement,
  requirementsFor,
} from "./profiles.js";

/** One requirement and whether it is currently met. */
export interface RequirementStatus {
  requirement: string;
  type: string;
  satisfied: boolean;
  /** Soft advice — a declared proof type whose evidence looks absent. */
  warning?: string;
}

/** One boundary's requirements. */
export interface BoundaryStatus {
  boundary: Boundary;
  /** Human phrasing: "leaving Backlog". */
  label: string;
  requirements: RequirementStatus[];
  /** True when nothing unmet remains. */
  passable: boolean;
}

export interface GateReport {
  profile: string;
  stage: string;
  boundaries: BoundaryStatus[];
  /** Non-blocking advisories, surfaced by both MCP and the GUI. */
  warnings: string[];
  /** Stage ids reachable from the current stage right now. */
  reachable: string[];
  /** Per stage id, why it cannot be reached — empty when it can. */
  blockedBy: Record<string, string[]>;
}

/** What the engine needs to know about the ticket's evidence on disk. */
export interface EvidenceProbe {
  /** ≥1 markdown anywhere under the type's folder. */
  hasType(type: string): Promise<boolean>;
  /** A specifically named document under the type's folder. */
  hasNamed(type: string, named: string): Promise<boolean>;
  /** Non-empty `refs` or `docs_todo` (FRD-002 P4). */
  hasGoverningDoc(): boolean;
  /** ≥1 image beneath `proof/` — drives the visual-proof soft warning. */
  hasProofImages(): Promise<boolean>;
}

export interface EvaluateInput {
  profiles: Record<string, ProfileMap>;
  profileId: string;
  /** The ticket's inline `requires`, used when the profile is `custom`. */
  inlineRequires?: ProfileMap;
  stage: string;
  evidence: EvidenceProbe;
}

async function statusOf(req: Requirement, ev: EvidenceProbe): Promise<RequirementStatus> {
  if (req.type === GOVERNING_DOC) {
    return { requirement: req.raw, type: req.type, satisfied: ev.hasGoverningDoc() };
  }

  const satisfied = req.named
    ? await ev.hasNamed(req.type, req.named)
    : await ev.hasType(req.type);

  const out: RequirementStatus = { requirement: req.raw, type: req.type, satisfied };

  // Soft validation (FRD-006 R4): a declared flavour of proof whose evidence
  // looks missing is a warning, never a block. Warnings keep the human judging
  // what machines judge badly — an "image" check cannot tell a screenshot from
  // a decorative logo, so it must not be allowed to stop a move.
  if (satisfied && req.type === "proof" && req.proofType === "visual") {
    if (!(await ev.hasProofImages())) {
      out.warning = `\`${req.raw}\` expects a screenshot, but no image files were found under proof/. Move allowed — check this yourself.`;
    }
  }
  return out;
}

/** Evaluate every boundary for a ticket, plus which stages it can reach. */
export async function evaluateGateReport(input: EvaluateInput): Promise<GateReport> {
  const { profiles, profileId, inlineRequires, stage, evidence } = input;
  const from = stageIndex(stage);

  const boundaries: BoundaryStatus[] = [];
  const warnings: string[] = [];

  for (const boundary of BOUNDARIES) {
    const reqs = requirementsFor(profiles, profileId, boundary, inlineRequires);
    if (!reqs.length) continue;

    const requirements = await Promise.all(reqs.map((r) => statusOf(r, evidence)));
    for (const r of requirements) if (r.warning) warnings.push(r.warning);

    boundaries.push({
      boundary,
      label: boundaryLabel(boundary),
      requirements,
      passable: requirements.every((r) => r.satisfied),
    });
  }

  // A move to index `to` crosses every boundary whose threshold sits in
  // (from, to]. Checking the whole span — not just the next step — is what
  // stops a multi-stage jump from skipping a gate (FRD-002 G2).
  const reachable: string[] = [];
  const blockedBy: Record<string, string[]> = {};
  for (const [idx, target] of STAGE_IDS.entries()) {
    if (idx === from) continue;
    const unmet = boundariesCrossed(boundaries, from, idx)
      .filter((b) => !b.passable)
      .map((b) => `${b.label}: needs ${b.requirements.filter((r) => !r.satisfied).map((r) => r.requirement).join(", ")}`);
    if (unmet.length) blockedBy[target] = unmet;
    else reachable.push(target);
  }

  return { profile: profileId, stage, boundaries, warnings, reachable, blockedBy };
}

/** Boundaries a move from → to crosses. Backwards moves cross nothing. */
export function boundariesCrossed(
  boundaries: BoundaryStatus[],
  from: number,
  to: number,
): BoundaryStatus[] {
  if (to <= from) return [];
  return boundaries.filter((b) => {
    const t = boundaryThreshold(b.boundary);
    return to >= t && from < t;
  });
}

/**
 * The first unmet boundary for a move, or null. This is what `move_item`
 * rejects on — "blocked by the first unmet one" (FRD-002 G2), so the error
 * names one concrete next action rather than a wall of everything missing.
 */
export function firstBlocking(
  report: GateReport,
  fromStage: string,
  toStage: string,
): BoundaryStatus | null {
  const from = stageIndex(fromStage);
  const to = stageIndex(toStage);
  return boundariesCrossed(report.boundaries, from, to).find((b) => !b.passable) ?? null;
}
