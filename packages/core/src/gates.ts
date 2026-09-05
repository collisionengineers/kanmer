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
  QUESTIONS_RESOLVED,
  type ProfileMap,
  type Requirement,
  requirementsFor,
} from "./profiles.js";
import type { ProofRecordState } from "./proof-record.js";

/** One requirement and whether it is currently met. */
export interface RequirementStatus {
  requirement: string;
  type: string;
  satisfied: boolean;
  /** Soft advice — a declared proof type whose evidence looks absent. */
  warning?: string;
  /**
   * Why a requirement stands where it does, when the requirement's own name
   * does not say (CORE-129). Deliberately not `warning`: warnings are the
   * report's *non-blocking* channel, and a strict proof refusal is a block —
   * putting its explanation there would make "warnings" mean two things. The
   * move refusal quotes this so an agent is told "the proof is legacy", not
   * merely "needs proof" about a file it can see on disk.
   */
  detail?: string;
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
  /**
   * Unticked `- [ ]` lines above the parked heading in `open-questions/`
   * (ADR-0011). 0 when there is no document — raising no questions is not a
   * failure state. The only evidence in this interface read from a document's
   * *content* rather than its existence.
   */
  unresolvedQuestions(): Promise<number>;
  /**
   * The parsed state of the canonical `proof/proof.md`, or `null` when that
   * exact document does not exist (CORE-129). The *second* content reader in
   * this interface, and the last: ADR-0011 bounds it explicitly.
   *
   * Only the canonical path counts. A ticket may keep any number of markdown
   * files under `proof/` and they satisfy the existence gate as they always
   * have, but machine authority comes from one document at one path — otherwise
   * "which file is the proof?" becomes a question the gate has to guess at.
   *
   * Optional so that an older `EvidenceProbe` implementation still compiles;
   * an absent probe behaves as `report` mode, which is what it always did.
   */
  proofState?(): Promise<ProofGateEvidence | null>;
}

/** What the gate engine is told about the canonical proof document. */
export interface ProofGateEvidence {
  state: ProofRecordState;
  /** Deterministic parser diagnostics, surfaced verbatim. */
  diagnostics: string[];
}

export interface EvaluateInput {
  profiles: Record<string, ProfileMap>;
  profileId: string;
  /** The ticket's inline `requires`, used when the profile is `custom`. */
  inlineRequires?: ProfileMap;
  stage: string;
  evidence: EvidenceProbe;
  /**
   * The board's proof-validation policy (CORE-129). Absent ⇒ `report`, which
   * is the historical existence-only behaviour, so every caller that has not
   * been taught about the policy keeps the semantics it had.
   */
  proofValidation?: "report" | "strict";
}

/** Human phrasing for a parsed proof state, used in both channels. */
function describeProofState(proof: ProofGateEvidence | null): string {
  if (!proof) return "there is no canonical `proof/proof.md`";
  switch (proof.state) {
    case "valid-pass":
      return "`proof/proof.md` is a valid PASS record";
    case "valid-fail":
      return "`proof/proof.md` is a valid FAIL record";
    case "valid-inconclusive":
      return "`proof/proof.md` is a valid INCONCLUSIVE record";
    case "legacy":
      return "`proof/proof.md` predates the typed `proof-record/2` contract and has never been validated";
    default:
      return "`proof/proof.md` declares the typed proof contract and breaks it";
  }
}

async function statusOf(
  req: Requirement,
  ev: EvidenceProbe,
  proofValidation: "report" | "strict",
): Promise<RequirementStatus> {
  if (req.type === GOVERNING_DOC) {
    return { requirement: req.raw, type: req.type, satisfied: ev.hasGoverningDoc() };
  }

  if (req.type === QUESTIONS_RESOLVED) {
    // Blocks rather than warns, unlike the visual-proof check below. That check
    // asks a machine to judge whether an image is really a screenshot, which it
    // does badly; this one counts unticked boxes, which it does exactly. The
    // failure mode is a stuck ticket — visible and one edit from clear — where
    // an existence gate fails invisibly (ADR-0011).
    // No `warning` is set even when unsatisfied: warnings are the report's
    // non-blocking channel, and putting a hard block's explanation there would
    // make "warnings" mean two things. The actionable advice lives in the
    // move refusal instead, beside the governing-doc clause.
    return {
      requirement: req.raw,
      type: req.type,
      satisfied: (await ev.unresolvedQuestions()) === 0,
    };
  }

  const satisfied = req.named
    ? await ev.hasNamed(req.type, req.named)
    : await ev.hasType(req.type);

  const out: RequirementStatus = { requirement: req.raw, type: req.type, satisfied };

  // Typed proof authority (CORE-129, FRD-006). Only reached once existence is
  // satisfied, so an absent proof still fails for the reason it always did.
  //
  // `report` and `strict` deliberately use different channels rather than
  // different severities of the same one. In `report` the move is allowed and
  // the finding is advice, which is a warning by this module's own definition.
  // In `strict` the move is refused and the finding is the *reason* for the
  // refusal, which is `detail`. Collapsing them would either turn today's
  // boards into stuck ones or turn a hard gate into text nobody has to read.
  if (satisfied && req.type === "proof") {
    const proof = ev.proofState ? await ev.proofState() : null;
    if (proofValidation === "strict") {
      if (!proof || proof.state !== "valid-pass") {
        out.satisfied = false;
        out.detail =
          `${describeProofState(proof)}. This board's proof policy is "strict", so entering Done ` +
          `needs a valid \`proof-record/2\` PASS at the exact merge SHA` +
          (proof && proof.diagnostics.length > 0 ? ` — ${proof.diagnostics.join("; ")}` : "") +
          `.`;
      }
    } else if (proof && proof.state !== "valid-pass") {
      out.warning =
        `${describeProofState(proof)}. This board's proof policy is "report", so the move is ` +
        `allowed — read the whole document yourself` +
        (proof.diagnostics.length > 0 ? ` (${proof.diagnostics.join("; ")})` : "") +
        `.`;
    }
  }

  // Soft validation (FRD-006 R4): a declared flavour of proof whose evidence
  // looks missing is a warning, never a block. Warnings keep the human judging
  // what machines judge badly — an "image" check cannot tell a screenshot from
  // a decorative logo, so it must not be allowed to stop a move.
  if (satisfied && req.type === "proof" && req.proofType === "visual") {
    if (!(await ev.hasProofImages())) {
      const advisory = `\`${req.raw}\` expects a screenshot, but no image files were found under proof/. Move allowed — check this yourself.`;
      // Appended, never assigned: the typed-proof reading above may already
      // have written here, and one warning silently replacing another is how a
      // finding goes missing.
      out.warning = out.warning ? `${out.warning} ${advisory}` : advisory;
    }
  }
  return out;
}

/** Evaluate every boundary for a ticket, plus which stages it can reach. */
export async function evaluateGateReport(input: EvaluateInput): Promise<GateReport> {
  const { profiles, profileId, inlineRequires, stage, evidence } = input;
  const proofValidation = input.proofValidation ?? "report";
  const from = stageIndex(stage);

  const boundaries: BoundaryStatus[] = [];
  const warnings: string[] = [];

  for (const boundary of BOUNDARIES) {
    const reqs = requirementsFor(profiles, profileId, boundary, inlineRequires);
    if (!reqs.length) continue;

    const requirements = await Promise.all(reqs.map((r) => statusOf(r, evidence, proofValidation)));
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
 * The boundaries a move crosses that actually ask for a document.
 *
 * A profile may declare a boundary with an empty requirement list; that is
 * vacuous and must not count, or `custom: {}` would behave differently from a
 * profile that simply omits the key.
 */
export function gatedBoundariesCrossed(
  boundaries: BoundaryStatus[],
  from: number,
  to: number,
): BoundaryStatus[] {
  return boundariesCrossed(boundaries, from, to).filter((b) => b.requirements.length > 0);
}

/**
 * Whether a move collapses the pipeline: more than one gated boundary in a
 * single step (FRD-002 G2, amended).
 *
 * The gates check that a document exists, never that it existed before the work
 * it gates — so writing all six documents and moving Backlog → Done in one call
 * produced a ticket that looked fully worked with no pipeline behind it. This
 * refuses the collapse structurally, which needs no timestamps and so has
 * nothing to be wrong about.
 *
 * It counts *gated* boundaries, not stages, and that distinction is the whole
 * design: `chore`'s one-jump from Backlog to Implementing crosses two stages but
 * only one gated boundary, and `spike` goes Backlog → Done across one. Counting
 * stages would break both shipped acceptance cases.
 *
 * Backwards moves cross nothing, so re-opening a ticket is unaffected.
 */
export function collapsesPipeline(
  boundaries: BoundaryStatus[],
  from: number,
  to: number,
): BoundaryStatus[] | null {
  const crossed = gatedBoundariesCrossed(boundaries, from, to);
  return crossed.length > 1 ? crossed : null;
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
