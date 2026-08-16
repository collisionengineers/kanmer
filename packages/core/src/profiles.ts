/**
 * Requirement profiles (FRD-002, ADR-0003) and typed proof (FRD-006).
 *
 * A profile maps each stage boundary to the document types a ticket must have
 * before it may cross. v2 attached one doc-set to an area, which meant a
 * one-line chore faced the same pipeline as a feature — so trivial tickets
 * either stalled at gates or taught agents to write junk documents. Profiles
 * make the requirements a property of the *work*, not of where it happens to
 * live.
 */

import { BOUNDARIES, type Boundary, isBoundary } from "./stages.js";

/** Doc types a profile may require. `reference`/`scratch`/`assets` never gate. */
export const DOC_TYPES = [
  "research",
  "files",
  "plan",
  "checklist",
  "open-questions",
  "post-implementation-report",
  "proof",
] as const;

export type DocTypeId = (typeof DOC_TYPES)[number];

/** Folders that exist but can never satisfy a gate (FRD-003 T5). */
export const GATE_EXEMPT_DIRS = ["reference", "scratch", "assets"] as const;

/** Every folder legal at the top level of a ticket directory. */
export const TICKET_DIRS = [...DOC_TYPES, ...GATE_EXEMPT_DIRS] as const;

const DOC_TYPE_SET: ReadonlySet<string> = new Set(DOC_TYPES);
const TICKET_DIR_SET: ReadonlySet<string> = new Set(TICKET_DIRS);

export function isDocType(v: string): v is DocTypeId {
  return DOC_TYPE_SET.has(v);
}
export function isTicketDir(v: string): boolean {
  return TICKET_DIR_SET.has(v);
}

/**
 * The pseudo-type satisfied by a governing-doc link rather than a ticket
 * document — a non-empty `refs` or `docs_todo: true` (FRD-002 P4).
 */
export const GOVERNING_DOC = "governing-doc";

/**
 * The pseudo-type satisfied when the ticket has no **unresolved** open question
 * — no unticked `- [ ]` above the parked heading in `open-questions/`
 * (ADR-0011, FRD-009).
 *
 * Deliberately not the `open-questions` doc type. Requirements are satisfied by
 * a document *existing*, so requiring the document would be satisfied by a file
 * of four unanswered questions: it would enforce the paperwork and not the rule.
 * This is the only requirement permitted to read inside a document, and
 * ADR-0011 states the three properties that keep it from generalising.
 */
export const QUESTIONS_RESOLVED = "questions-resolved";

/** Shipped proof types (FRD-006 R1); boards may add their own. */
export const DEFAULT_PROOF_TYPES = ["visual", "test-output", "command-log"] as const;

/**
 * One parsed requirement.
 *
 * The wire form is a string so `board.yml` stays readable:
 *   `plan` · `governing-doc` · `proof` · `proof:visual` · `proof:visual@staging`
 *   · `research/auth` (a *named* document, custom profiles only)
 */
export interface Requirement {
  /** `governing-doc`, a doc type, or a doc type carrying a named path. */
  type: string;
  /** For `proof:<t>` — the evidence flavour. Soft-validated, never blocking. */
  proofType?: string;
  /** For `proof:<t>@<env>` — a board-declared deployment environment. */
  env?: string;
  /** For `research/auth` — the specific document that must exist. */
  named?: string;
  /** The original string, for error messages that echo what was configured. */
  raw: string;
}

/**
 * Parse a requirement string.
 *
 * Order matters: the `@env` suffix is split first so a path containing `@`
 * cannot be mistaken for an environment, then `:` for the proof type, then
 * `/` for a named document.
 */
export function parseRequirement(raw: string): Requirement {
  const trimmed = raw.trim();
  let rest = trimmed;
  let env: string | undefined;
  let proofType: string | undefined;
  let named: string | undefined;

  const at = rest.indexOf("@");
  if (at >= 0) {
    env = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }
  const colon = rest.indexOf(":");
  if (colon >= 0) {
    proofType = rest.slice(colon + 1);
    rest = rest.slice(0, colon);
  }
  const slash = rest.indexOf("/");
  if (slash >= 0) {
    named = rest.slice(slash + 1);
    rest = rest.slice(0, slash);
  }
  return { type: rest, proofType, env, named, raw: trimmed };
}

/** A profile: boundary → the requirements to cross it. Absent boundary = free. */
export type ProfileMap = Partial<Record<Boundary, string[]>>;

/**
 * The four shipped profiles (FRD-002 P2). Editable per board; `custom` is
 * always available and carries its requirements inline on the ticket.
 *
 * Read the table as "what evidence does this kind of work owe?":
 *   feature — the full pipeline, because a feature changes what the product is
 *   fix     — where it lands and what the change is, a report, then proof
 *   chore   — a plan and a proof; no research ceremony for a rename
 *   spike   — research *is* the deliverable; nothing else is owed
 *
 * `fix` carries an `enter-review` (ADR-0013): a fix that opened a PR should not
 * merge unreviewed. `chore` and `spike` deliberately do not — a rename going
 * straight to Done is the point of having profiles at all. Editing this table
 * reaches **new boards only**; `resolveProfiles` in board.ts is what reaches
 * boards that already carry their own `profiles:` block.
 */
export const DEFAULT_PROFILES: Readonly<Record<string, ProfileMap>> = Object.freeze({
  feature: {
    "leave-backlog": [GOVERNING_DOC],
    "leave-preparing": ["research", "files", "plan", "checklist", QUESTIONS_RESOLVED],
    "enter-review": ["post-implementation-report", QUESTIONS_RESOLVED],
    "enter-done": ["proof", QUESTIONS_RESOLVED],
  },
  fix: {
    "leave-preparing": ["files", "plan", QUESTIONS_RESOLVED],
    "enter-review": ["post-implementation-report", QUESTIONS_RESOLVED],
    "enter-done": ["proof", QUESTIONS_RESOLVED],
  },
  chore: {
    "leave-preparing": ["plan", QUESTIONS_RESOLVED],
    "enter-done": ["proof", QUESTIONS_RESOLVED],
  },
  // A spike's deliverable *is* research, and surfacing questions can be the
  // whole point of one — so its single boundary carries the requirement rather
  // than being exempt. GUI-004 was exactly this shape: its question was answered
  // in practice and simply never recorded. Parking remains the honest exit.
  spike: {
    "enter-done": ["research", QUESTIONS_RESOLVED],
  },
  /** Empty by design: historical backfill must nag about nothing. */
  custom: {},
});

/** The board default when a ticket and its area say nothing (FRD-002 P6). */
export const DEFAULT_PROFILE_ID = "fix";

/**
 * Resolve which profile applies (FRD-002 P6): the ticket's explicit `profile`,
 * else its area's `defaultProfile`, else the board default.
 *
 * Changing a ticket's area does **not** override an explicitly set profile —
 * that is why the ticket is checked first.
 */
export function resolveProfileId(
  itemProfile: string | undefined,
  areaDefault: string | undefined,
  boardDefault: string | undefined,
): string {
  return itemProfile || areaDefault || boardDefault || DEFAULT_PROFILE_ID;
}

/**
 * The requirements for one boundary under a resolved profile.
 *
 * `custom` reads the ticket's inline `requires`; everything else reads the
 * board's profile table. An unknown profile id resolves to no requirements
 * rather than throwing — validation rejects it at write time, and a gate check
 * is the wrong place to fail a read.
 */
export function requirementsFor(
  profiles: Record<string, ProfileMap>,
  profileId: string,
  boundary: Boundary,
  inlineRequires?: ProfileMap,
): Requirement[] {
  const map = profileId === "custom" ? (inlineRequires ?? {}) : (profiles[profileId] ?? {});
  return (map[boundary] ?? []).map(parseRequirement);
}

/** Validate a profile map: known boundaries, known types, sane proof envs. */
export function validateProfileMap(
  map: ProfileMap,
  opts: { proofTypes: readonly string[]; environments: readonly string[] },
): string[] {
  const errors: string[] = [];
  for (const [boundary, reqs] of Object.entries(map)) {
    if (!isBoundary(boundary)) {
      errors.push(`unknown boundary "${boundary}" — valid: ${BOUNDARIES.join(", ")}`);
      continue;
    }
    for (const raw of reqs ?? []) {
      const req = parseRequirement(raw);
      if (req.type !== GOVERNING_DOC && req.type !== QUESTIONS_RESOLVED && !isDocType(req.type)) {
        errors.push(`unknown document type "${req.type}" in "${raw}" — valid: ${DOC_TYPES.join(", ")}, ${GOVERNING_DOC}, ${QUESTIONS_RESOLVED}`);
      }
      if (req.proofType && req.type !== "proof") {
        errors.push(`"${raw}" — only \`proof\` takes a type suffix`);
      }
      if (req.proofType && !opts.proofTypes.includes(req.proofType)) {
        errors.push(`unknown proof type "${req.proofType}" in "${raw}" — valid: ${opts.proofTypes.join(", ")}`);
      }
      if (req.env && !opts.environments.includes(req.env)) {
        errors.push(
          opts.environments.length
            ? `unknown environment "${req.env}" in "${raw}" — valid: ${opts.environments.join(", ")}`
            : `"${raw}" names an environment but the board declares none`,
        );
      }
    }
  }
  return errors;
}
