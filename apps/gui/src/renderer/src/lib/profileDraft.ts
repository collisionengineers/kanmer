import type { BoardConfig } from "@kanmer/core";

/**
 * The renderer's mirror of core's requirement validation.
 *
 * The renderer may only `import type` from core (AGENTS.md §7), so
 * `validateProfileMap` and `parseRequirement` cannot be called here and their
 * rules are restated. This is the repo's **third** deliberate core↔renderer
 * duplication, after `lib/board.ts blockedIds` and `Settings.tsx
 * validateDraft()`; the pairing is recorded in AGENTS.md §7 so it stays
 * maintainable.
 *
 * The vocabulary is passed in rather than hardcoded. A test that states the
 * document types explicitly fails when core's list changes, instead of agreeing
 * with it by coincidence.
 */

export interface Vocabulary {
  docTypes: readonly string[];
  proofTypes: readonly string[];
  environments: readonly string[];
  boundaries: readonly string[];
}

/** The pseudo-type satisfied by a governing-doc link rather than a document. */
export const GOVERNING_DOC = "governing-doc";

export interface ParsedRequirement {
  raw: string;
  type: string;
  /** The `:suffix`, legal only on `proof`. */
  proofType?: string;
  /** The `@env`. */
  env?: string;
  /** The `/named/path` under the type's folder. */
  named?: string;
}

/**
 * Split a requirement the way core does: `@` first, then `:`, then `/`.
 *
 * The order is the whole point. A named path containing `@` splits as an
 * environment under any other order, so a differently-ordered mirror accepts
 * strings core rejects — and the result is a board saved with a requirement no
 * gate can ever satisfy.
 */
export function parseRequirementLike(raw: string): ParsedRequirement {
  const trimmed = raw.trim();
  let rest = trimmed;
  let env: string | undefined;
  const at = rest.indexOf("@");
  if (at !== -1) {
    env = rest.slice(at + 1);
    rest = rest.slice(0, at);
  }
  let proofType: string | undefined;
  const colon = rest.indexOf(":");
  if (colon !== -1) {
    proofType = rest.slice(colon + 1);
    rest = rest.slice(0, colon);
  }
  let named: string | undefined;
  const slash = rest.indexOf("/");
  if (slash !== -1) {
    named = rest.slice(slash + 1);
    rest = rest.slice(0, slash);
  }
  return { raw: trimmed, type: rest, ...(proofType ? { proofType } : {}), ...(env ? { env } : {}), ...(named ? { named } : {}) };
}

/** One requirement's error, or null. Mirrors `validateProfileMap`'s per-requirement rules. */
export function validateRequirement(raw: string, vocab: Vocabulary): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "empty requirement";
  const req = parseRequirementLike(trimmed);
  if (req.type !== GOVERNING_DOC && !vocab.docTypes.includes(req.type)) {
    return `unknown document type "${req.type}" — valid: ${[...vocab.docTypes, GOVERNING_DOC].join(", ")}`;
  }
  if (req.proofType && req.type !== "proof") return `only \`proof\` takes a type suffix`;
  if (req.proofType && !vocab.proofTypes.includes(req.proofType)) {
    return `unknown proof type "${req.proofType}" — valid: ${vocab.proofTypes.join(", ") || "none declared"}`;
  }
  if (req.env && !vocab.environments.includes(req.env)) {
    return vocab.environments.length
      ? `unknown environment "${req.env}" — valid: ${vocab.environments.join(", ")}`
      : `names an environment but the board declares none`;
  }
  return null;
}

/** Parse a comma-separated field into requirement strings, dropping blanks. */
export function splitRequirements(field: string): string[] {
  return field.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Every error in a profile map, keyed `"<profile>.<boundary>"` so the UI can
 * put each message beside the field that produced it.
 */
export function validateProfiles(
  profiles: Record<string, Record<string, string[]>>,
  vocab: Vocabulary,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [name, map] of Object.entries(profiles)) {
    for (const [boundary, reqs] of Object.entries(map ?? {})) {
      const errors: string[] = [];
      if (!vocab.boundaries.includes(boundary)) {
        errors.push(`unknown boundary "${boundary}" — valid: ${vocab.boundaries.join(", ")}`);
      }
      for (const raw of reqs ?? []) {
        const e = validateRequirement(raw, vocab);
        if (e) errors.push(`"${raw}": ${e}`);
      }
      if (errors.length) out[`${name}.${boundary}`] = errors;
    }
  }
  return out;
}

/**
 * A board with one boundary's requirements replaced.
 *
 * Cloned, never mutated, and an empty list removes the boundary rather than
 * storing `[]` — an empty requirement list is vacuous, and leaving it behind
 * would make `custom: {}` and `custom: { "leave-backlog": [] }` differ on disk
 * while behaving identically.
 */
export function applyProfileEdit(
  board: BoardConfig,
  profile: string,
  boundary: string,
  requirements: string[],
): BoardConfig {
  const next = structuredClone(board) as BoardConfig & {
    profiles?: Record<string, Record<string, string[]>>;
  };
  next.profiles ??= {};
  next.profiles[profile] ??= {};
  if (requirements.length === 0) delete next.profiles[profile][boundary];
  else next.profiles[profile][boundary] = requirements;
  return next;
}

/**
 * How many tickets a set of profile changes re-gates.
 *
 * Core rejects an *invalid* board; nothing warns about a valid one that
 * re-blocks half the board, which is the likelier mistake. Counting resolves a
 * ticket's profile the way core does — explicit, else its area's default, else
 * the board's.
 */
export function ticketsAffected(
  items: readonly { profile?: string; area?: string }[],
  board: BoardConfig,
  changedProfiles: readonly string[],
): number {
  if (changedProfiles.length === 0) return 0;
  const areaDefault = new Map(
    (board.areas ?? []).map((a) => [a.id, (a as { defaultProfile?: string }).defaultProfile]),
  );
  const boardDefault = (board as { defaultProfile?: string }).defaultProfile;
  const changed = new Set(changedProfiles);
  return items.filter((i) => {
    const resolved = i.profile || areaDefault.get(i.area ?? "") || boardDefault;
    return resolved !== undefined && changed.has(resolved);
  }).length;
}

/** Which profiles differ between two boards. */
export function changedProfiles(a: BoardConfig, b: BoardConfig): string[] {
  const pa = (a as { profiles?: Record<string, unknown> }).profiles ?? {};
  const pb = (b as { profiles?: Record<string, unknown> }).profiles ?? {};
  const names = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  return [...names].filter((n) => JSON.stringify(pa[n]) !== JSON.stringify(pb[n])).sort();
}
