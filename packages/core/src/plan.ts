/**
 * Reading and validating a constrained-worker plan (FRD-033, CORE-118).
 *
 * A plan document is prose a human reads, so nothing here rewrites or scores
 * it. This module answers two questions instead:
 *
 *  1. **What does the plan say?** — {@link parsePlan} turns the Markdown into
 *     the structures a step packet is compiled from: the ATX sections, the
 *     `## Expected files` table, the `## Do not modify` list, the acceptance
 *     checks, the commands, the stop condition, the evidence pins and the
 *     ordered steps.
 *  2. **What is still unresolved?** — {@link validatePlan} reports typed
 *     findings. FRD-033 says validation "rejects **or flags**" unresolved vague
 *     instructions, and the shipped plan template states that the decision-verb
 *     warning "is not a gate or regex score". So vague language and missing
 *     risk-sensitive evidence are always **advisory**, and structural gaps only
 *     become **blockers** when a caller actually selects a step to compile.
 *
 * Pure and total: no filesystem, no Git, no store access, no I/O of any kind.
 */

/** One ATX heading section of a Markdown document. */
export interface AtxSection {
  level: number;
  title: string;
  content: string;
}

/**
 * Split a Markdown document into its ATX heading sections. A section retains
 * nested lower-level headings and stops at the next heading at the same or a
 * higher level.
 */
export function parseAtxSections(markdown: string): AtxSection[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const headings: Array<{ index: number; level: number; title: string }> = [];
  for (const [index, line] of lines.entries()) {
    const match = /^(?: {0,3})(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line);
    if (!match) continue;
    const title = match[2].trim().replace(/[ \t]+#+[ \t]*$/, "").trim();
    headings.push({ index, level: match[1].length, title });
  }

  return headings.map((heading, position) => {
    const end = headings.slice(position + 1).find((candidate) => candidate.level <= heading.level)?.index ?? lines.length;
    return {
      level: heading.level,
      title: heading.title,
      content: lines.slice(heading.index + 1, end).join("\n"),
    };
  });
}

/**
 * Read one ATX heading section by title, case-insensitively. Returns null when
 * the section is absent or empty.
 */
export function extractAtxSection(markdown: string, requestedTitle: string): string | null {
  const sections = parseAtxSections(markdown);
  const wanted = requestedTitle.trim().toLocaleLowerCase();
  const section = sections.find((candidate) => candidate.title.toLocaleLowerCase() === wanted);
  if (!section) return null;
  const content = section.content.trim();
  return content || null;
}

/** The section headings the shipped plan template asks a plan to carry. */
export const PLAN_SECTIONS = [
  "Objective",
  "Starting state",
  "Governing docs",
  "Required changes",
  "Expected files",
  "Do not modify",
  "Constraints",
  "Ordered steps",
  "Acceptance checks",
  "Commands",
  "Failure and deviation rules",
  "Stop condition",
] as const;

/** One row of the plan's `## Expected files` table. */
export interface PlanFileEntry {
  action: string;
  path: string;
  responsibility: string;
}

/** A document version the plan pinned in `## Starting state`. */
export interface PlanEvidencePin {
  path: string;
  version: string;
}

/** The labelled fields FRD-033 asks each step to name. */
export type PlanStepField =
  | "preconditions"
  | "files"
  | "symbols"
  | "change"
  | "preserved"
  | "forbidden"
  | "negative"
  | "tests"
  | "commands"
  | "expected"
  | "done"
  | "deviation";

/**
 * Accepted bullet labels per field. Matching is exact on the lower-cased label
 * text, so a new spelling is an entry here rather than a looser regex.
 */
export const PLAN_STEP_FIELD_LABELS: Record<PlanStepField, readonly string[]> = {
  preconditions: ["preconditions", "precondition"],
  files: ["files", "allowed files"],
  symbols: ["symbols", "allowed symbols"],
  change: ["change", "exact change"],
  preserved: ["preserved behaviour", "preserved behavior", "preserve"],
  forbidden: ["forbidden", "forbidden behaviour", "forbidden behavior"],
  negative: ["negative cases", "negative case", "negative"],
  tests: ["tests", "test"],
  commands: ["commands", "command"],
  expected: ["expected output", "expected result"],
  done: ["done when", "done condition", "done"],
  deviation: ["deviation stop", "deviation"],
};

/** The fields a step must name before it can be compiled into a packet. */
export const PLAN_STEP_REQUIRED_FIELDS: readonly PlanStepField[] = [
  "files",
  "change",
  "tests",
  "commands",
  "done",
];

const FIELD_BY_LABEL = new Map<string, PlanStepField>(
  Object.entries(PLAN_STEP_FIELD_LABELS).flatMap(([field, labels]) =>
    labels.map((label) => [label, field as PlanStepField] as const),
  ),
);

/** One ordered step of a plan. */
export interface PlanStep {
  /** 1-based position within `## Ordered steps`. */
  index: number;
  /** Stable identity within the plan: `step-<index>`. */
  id: string;
  /** The heading (or list item) text, with any `Step N —` prefix removed. */
  title: string;
  /**
   * True when the step came from a `### Step N — <title>` sub-heading with
   * labelled bullets. A bare numbered-list item is title-only and cannot be
   * compiled into a packet.
   */
  structured: boolean;
  fields: Partial<Record<PlanStepField, string>>;
  files: string[];
  symbols: string[];
  tests: string[];
  commands: string[];
  negativeCases: string[];
}

/** Everything a step packet is compiled from. */
export interface ParsedPlan {
  sections: AtxSection[];
  objective: string | null;
  expectedFiles: PlanFileEntry[];
  doNotModify: string[];
  acceptanceChecks: string[];
  commands: string[];
  stopCondition: string | null;
  evidencePins: PlanEvidencePin[];
  steps: PlanStep[];
  /** Invalid authority-bearing path values retained for typed validation. */
  pathIssues: PlanPathIssue[];
}

export interface PlanPathIssue {
  value: string;
  reason: string;
  section: string;
  step?: number;
}

export type PlanPathResult =
  | { ok: true; path: string; pattern: boolean }
  | { ok: false; reason: string };

/**
 * Parse one repository-relative path or the deliberately small plan-pattern
 * subset. `*` stays inside one segment; a segment that is exactly `**` spans
 * segments. Everything else fails closed rather than becoming a literal by
 * accident.
 */
export function parsePlanPath(value: string, options: { allowPattern?: boolean; observed?: boolean } = {}): PlanPathResult {
  // Git's `-z` formats already return the exact path bytes (decoded as fatal
  // UTF-8 by the collector). Never trim, dequote or separator-normalise that
  // observation: a leading space, trailing space, Unicode scalar or newline is
  // part of the filename. Plan declarations are Markdown and retain the small
  // convenience normalisation they have always had.
  let candidate = options.observed ? value : value.trim().replace(/^`|`$/g, "");
  if (options.observed && candidate.includes("\\")) return { ok: false, reason: "observed Git paths must use slash separators" };
  if (!options.observed) {
    candidate = candidate.replace(/\\/g, "/");
    if (candidate.startsWith("./")) candidate = candidate.slice(2);
  }
  if (!candidate || candidate === ".") return { ok: false, reason: "path is empty or dot" };
  if (candidate.includes("\0")) return { ok: false, reason: "path contains NUL" };
  if (candidate.startsWith("/") || candidate.startsWith("//")) {
    return { ok: false, reason: "absolute and UNC paths are not repository-relative" };
  }
  // A colon is a drive/scheme separator or a Windows-unsupported filename
  // byte. Reject every form, not merely `scheme://`, so the same declaration
  // cannot mean different things on the Windows verification rail.
  if (candidate.includes(":")) {
    return { ok: false, reason: "drive, URI and colon-qualified paths are not supported" };
  }
  if (!options.observed && candidate.endsWith("/")) candidate = candidate.slice(0, -1);
  const segments = candidate.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return { ok: false, reason: "path contains an empty, dot or parent-traversal segment" };
  }
  if (segments.some((segment) => /[?\[\]{}]/.test(segment))) {
    return { ok: false, reason: "path uses unsupported pattern syntax" };
  }
  const pattern = segments.some((segment) => segment.includes("*"));
  if (pattern && !options.allowPattern) return { ok: false, reason: "wildcards are not allowed in a literal path" };
  if (segments.some((segment) => segment.includes("**") && segment !== "**")) {
    return { ok: false, reason: "** is supported only as a complete path segment" };
  }
  return { ok: true, path: segments.join("/"), pattern };
}

/** Normalise a valid plan path; invalid values become empty for legacy callers. */
export function normalisePlanPath(value: string): string {
  const parsed = parsePlanPath(value, { allowPattern: true });
  return parsed.ok ? parsed.path : "";
}

const MAX_PLAN_PATH_MATCH_STATES = 65_536;
const MAX_PLAN_PATH_MATCH_CODE_POINTS = 65_536;
export const PLAN_PATH_MATCH_MAX_OPERATIONS = 1_000_000;

/** One aggregate work budget may be shared across every path classification in a reconciliation. */
export interface PlanPathMatchBudget {
  remaining: number;
}

export function createPlanPathMatchBudget(maxOperations = PLAN_PATH_MATCH_MAX_OPERATIONS): PlanPathMatchBudget {
  return { remaining: Number.isFinite(maxOperations) && maxOperations > 0 ? Math.floor(maxOperations) : 0 };
}

function consumePlanPathMatchBudget(budget: PlanPathMatchBudget, amount = 1): boolean {
  if (!Number.isSafeInteger(amount) || amount < 0 || budget.remaining < amount) {
    budget.remaining = 0;
    return false;
  }
  budget.remaining -= amount;
  return true;
}

type BoundedMatch = boolean | null;

function codePointsWithinBudget(value: string, budget: PlanPathMatchBudget): string[] | null {
  if (value.length > MAX_PLAN_PATH_MATCH_CODE_POINTS) return null;
  if (!consumePlanPathMatchBudget(budget, Math.max(1, value.length))) return null;
  const points = Array.from(value);
  if (points.length > MAX_PLAN_PATH_MATCH_CODE_POINTS) return null;
  return points;
}

function literalEquals(left: string, right: string, budget: PlanPathMatchBudget): BoundedMatch {
  const cost = left.length === right.length ? Math.max(1, left.length) : 1;
  if (!consumePlanPathMatchBudget(budget, cost)) return null;
  return left === right;
}

function exactAt(value: readonly string[], literal: readonly string[], offset: number, budget: PlanPathMatchBudget): BoundedMatch {
  if (offset < 0 || offset + literal.length > value.length) return false;
  for (let index = 0; index < literal.length; index += 1) {
    if (!consumePlanPathMatchBudget(budget)) return null;
    if (value[offset + index] !== literal[index]) return false;
  }
  return true;
}

/** KMP search for one literal chunk, confined to `[start, end)`. */
function findLiteralChunk(
  value: readonly string[],
  literal: readonly string[],
  start: number,
  end: number,
  budget: PlanPathMatchBudget,
): number | null {
  if (literal.length === 0) return start;
  const prefix = new Uint32Array(literal.length);
  for (let index = 1, matched = 0; index < literal.length;) {
    if (!consumePlanPathMatchBudget(budget)) return null;
    if (literal[index] === literal[matched]) {
      prefix[index++] = ++matched;
    } else if (matched > 0) {
      matched = prefix[matched - 1]!;
    } else {
      prefix[index++] = 0;
    }
  }
  for (let index = start, matched = 0; index < end;) {
    if (!consumePlanPathMatchBudget(budget)) return null;
    if (value[index] === literal[matched]) {
      index += 1;
      matched += 1;
      if (matched === literal.length) return index - matched;
    } else if (matched > 0) {
      matched = prefix[matched - 1]!;
    } else {
      index += 1;
    }
  }
  return -1;
}

/** Linear match for the supported within-segment `*` language. */
function segmentMatches(pattern: string, value: string, budget: PlanPathMatchBudget): BoundedMatch {
  if (!consumePlanPathMatchBudget(budget, Math.max(1, pattern.length))) return null;
  if (!pattern.includes("*")) return literalEquals(pattern, value, budget);
  const valuePoints = codePointsWithinBudget(value, budget);
  if (!valuePoints) return null;
  const chunks: string[][] = [];
  for (const chunk of pattern.split("*")) {
    const points = codePointsWithinBudget(chunk, budget);
    if (!points) return null;
    chunks.push(points);
  }

  let first = 0;
  let last = chunks.length;
  let cursor = 0;
  let end = valuePoints.length;
  if (!pattern.startsWith("*")) {
    const prefix = chunks[first++]!;
    const matched = exactAt(valuePoints, prefix, 0, budget);
    if (matched !== true) return matched;
    cursor = prefix.length;
  }
  if (!pattern.endsWith("*")) {
    const suffix = chunks[--last]!;
    const offset = end - suffix.length;
    if (offset < cursor) return false;
    const matched = exactAt(valuePoints, suffix, offset, budget);
    if (matched !== true) return matched;
    end = offset;
  }
  for (; first < last; first += 1) {
    const chunk = chunks[first]!;
    if (chunk.length === 0) continue;
    const offset = findLiteralChunk(valuePoints, chunk, cursor, end, budget);
    if (offset === null) return null;
    if (offset < 0) return false;
    cursor = offset + chunk.length;
  }
  return true;
}

function triAnd(left: 0 | 1 | 2, right: BoundedMatch): 0 | 1 | 2 {
  if (left === 0 || right === false) return 0;
  if (left === 2 || right === null) return 2;
  return 1;
}

function triOr(left: 0 | 1 | 2, right: 0 | 1 | 2): 0 | 1 | 2 {
  if (left === 1 || right === 1) return 1;
  if (left === 2 || right === 2) return 2;
  return 0;
}

/**
 * Bounded exact match for a confined literal path against the documented
 * literal/`*`/`**` subset. `null` means the explicit work bound was exhausted.
 */
export function planPathMatch(
  patternValue: string,
  pathValue: string,
  budget: PlanPathMatchBudget = createPlanPathMatchBudget(),
): BoundedMatch {
  if (budget.remaining <= 0) return null;
  if (patternValue.length > MAX_PLAN_PATH_MATCH_CODE_POINTS || pathValue.length > MAX_PLAN_PATH_MATCH_CODE_POINTS) return null;
  const parseCost = Math.max(1, patternValue.length) + Math.max(1, pathValue.length);
  if (!consumePlanPathMatchBudget(budget, parseCost)) return null;
  const pattern = parsePlanPath(patternValue, { allowPattern: true });
  const observed = parsePlanPath(pathValue, { observed: true });
  if (!pattern.ok || !observed.ok) return false;
  if (!pattern.pattern) return literalEquals(pattern.path, observed.path, budget);
  const splitCost = Math.max(1, pattern.path.length) + Math.max(1, observed.path.length);
  if (!consumePlanPathMatchBudget(budget, splitCost)) return null;
  const patterns = pattern.path.split("/").filter(
    (segment, index, all) => segment !== "**" || all[index - 1] !== "**",
  );
  const values = observed.path.split("/");
  const stateCount = (patterns.length + 1) * (values.length + 1);
  if (!Number.isSafeInteger(stateCount) || stateCount > MAX_PLAN_PATH_MATCH_STATES) return null;

  let previous = new Uint8Array(values.length + 1);
  previous[0] = 1;
  for (const segment of patterns) {
    const current = new Uint8Array(values.length + 1);
    if (segment === "**") {
      current[0] = previous[0]!;
      for (let index = 1; index <= values.length; index += 1) {
        if (!consumePlanPathMatchBudget(budget)) return null;
        current[index] = triOr(previous[index]! as 0 | 1 | 2, current[index - 1]! as 0 | 1 | 2);
      }
    } else {
      for (let index = 1; index <= values.length; index += 1) {
        if (!consumePlanPathMatchBudget(budget)) return null;
        const prior = previous[index - 1]! as 0 | 1 | 2;
        current[index] = prior === 0 ? 0 : triAnd(prior, segmentMatches(segment, values[index - 1]!, budget));
      }
    }
    previous = current;
  }
  return previous[values.length] === 1 ? true : previous[values.length] === 2 ? null : false;
}

/** Boolean-compatible legacy surface; bounded exhaustion remains a fail-closed non-match. */
export function planPathMatches(patternValue: string, pathValue: string): boolean {
  return planPathMatch(patternValue, pathValue) === true;
}

const MAX_GLOB_NFA_STATES = 8_192;
const MAX_GLOB_PRODUCT_STATES = 65_536;
const MAX_GLOB_CACHE_ENTRIES = 65_536;
const MAX_GLOB_QUEUE_ENTRIES = 65_536;
export const GLOB_PROOF_MAX_OPERATIONS = 1_000_000;

interface GlobProofContext {
  work: PlanPathMatchBudget;
  cacheEntries: number;
  queueEntries: number;
}

function createGlobProofContext(maxOperations = GLOB_PROOF_MAX_OPERATIONS): GlobProofContext {
  return { work: createPlanPathMatchBudget(maxOperations), cacheEntries: 0, queueEntries: 0 };
}

function consumeGlobProofWork(context: GlobProofContext, amount = 1): boolean {
  return consumePlanPathMatchBudget(context.work, amount);
}

type GlobTransition =
  | { kind: "epsilon"; to: number }
  | { kind: "literal"; to: number; value: string }
  | { kind: "non-slash"; to: number };

interface GlobNfa {
  transitions: GlobTransition[][];
  start: number;
  accept: number;
}

interface GlobFragment {
  start: number;
  end: number;
}

class GlobAutomatonLimitError extends Error {}

/** Compile one canonical path glob to an epsilon-NFA over path characters. */
function compileGlobNfa(pattern: string, context: GlobProofContext): GlobNfa | null {
  const transitions: GlobTransition[][] = [];
  const state = (): number => {
    if (transitions.length >= MAX_GLOB_NFA_STATES || !consumeGlobProofWork(context)) {
      throw new GlobAutomatonLimitError();
    }
    transitions.push([]);
    return transitions.length - 1;
  };
  const connect = (from: number, transition: GlobTransition): void => {
    if (!consumeGlobProofWork(context)) throw new GlobAutomatonLimitError();
    transitions[from]!.push(transition);
  };
  const epsilon = (): GlobFragment => {
    const start = state();
    const end = state();
    connect(start, { kind: "epsilon", to: end });
    return { start, end };
  };
  const literal = (value: string): GlobFragment => {
    const start = state();
    const end = state();
    connect(start, { kind: "literal", to: end, value });
    return { start, end };
  };
  const nonSlash = (): GlobFragment => {
    const start = state();
    const end = state();
    connect(start, { kind: "non-slash", to: end });
    return { start, end };
  };
  const sequence = (fragments: GlobFragment[]): GlobFragment => {
    if (fragments.length === 0) return epsilon();
    for (let index = 1; index < fragments.length; index += 1) {
      connect(fragments[index - 1]!.end, { kind: "epsilon", to: fragments[index]!.start });
    }
    return { start: fragments[0]!.start, end: fragments[fragments.length - 1]!.end };
  };
  const zeroOrMore = (fragment: GlobFragment): GlobFragment => {
    const start = state();
    const end = state();
    connect(start, { kind: "epsilon", to: end });
    connect(start, { kind: "epsilon", to: fragment.start });
    connect(fragment.end, { kind: "epsilon", to: end });
    connect(fragment.end, { kind: "epsilon", to: fragment.start });
    return { start, end };
  };
  const oneOrMore = (fragment: GlobFragment): GlobFragment => {
    const start = state();
    const end = state();
    connect(start, { kind: "epsilon", to: fragment.start });
    connect(fragment.end, { kind: "epsilon", to: end });
    connect(fragment.end, { kind: "epsilon", to: fragment.start });
    return { start, end };
  };
  const anySegment = (): GlobFragment => oneOrMore(nonSlash());
  const ordinarySegment = (segment: string): GlobFragment => {
    // Although the character-level spelling of `*` accepts epsilon, a Git path
    // segment never does. Giving this one spelling an explicit one-or-more NFA
    // keeps the compiled language equal to planPathMatches.
    if (segment === "*") return anySegment();
    return sequence(Array.from(segment, (character) => (
      character === "*" ? zeroOrMore(nonSlash()) : literal(character)
    )));
  };

  try {
    const segments = pattern.split("/").filter(
      (segment, index, all) => segment !== "**" || all[index - 1] !== "**",
    );
    let compiled: GlobFragment;
    if (segments.length === 1 && segments[0] === "**") {
      compiled = sequence([
        anySegment(),
        zeroOrMore(sequence([literal("/"), anySegment()])),
      ]);
    } else {
      const fragments: GlobFragment[] = [];
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index]!;
        if (segment === "**") {
          // A leading recursive segment owns its following slash; every other
          // recursive segment owns each preceding slash. This makes its zero
          // repetition erase exactly the separator that belongs to it.
          fragments.push(index === 0
            ? zeroOrMore(sequence([anySegment(), literal("/")]))
            : zeroOrMore(sequence([literal("/"), anySegment()])));
          continue;
        }
        const followsLeadingRecursive = index === 1 && segments[0] === "**";
        if (index > 0 && !followsLeadingRecursive) fragments.push(literal("/"));
        fragments.push(ordinarySegment(segment));
      }
      compiled = sequence(fragments);
    }
    return { transitions, start: compiled.start, accept: compiled.end };
  } catch (error) {
    if (error instanceof GlobAutomatonLimitError) return null;
    throw error;
  }
}

function epsilonClosure(nfa: GlobNfa, seed: readonly number[], context: GlobProofContext): number[] | null {
  if (!consumeGlobProofWork(context, Math.max(1, seed.length))) return null;
  const closure = new Set(seed);
  const queue = [...seed];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (!consumeGlobProofWork(context)) return null;
    const current = queue[cursor]!;
    for (const transition of nfa.transitions[current]!) {
      if (!consumeGlobProofWork(context)) return null;
      if (transition.kind !== "epsilon" || closure.has(transition.to)) continue;
      closure.add(transition.to);
      queue.push(transition.to);
    }
  }
  if (!consumeGlobProofWork(context, Math.max(1, closure.size))) return null;
  return [...closure].sort((left, right) => left - right);
}

function globAlphabet(left: GlobNfa, right: GlobNfa, context: GlobProofContext): Array<string | null> | null {
  const literals = new Set<string>();
  for (const nfa of [left, right]) {
    for (const transitions of nfa.transitions) {
      if (!consumeGlobProofWork(context)) return null;
      for (const transition of transitions) {
        if (!consumeGlobProofWork(context)) return null;
        if (transition.kind === "literal" && transition.value !== "/" && !literals.has(transition.value)) {
          if (!consumeGlobProofWork(context)) return null;
          literals.add(transition.value);
        }
      }
    }
  }
  const sortCost = literals.size <= 1 ? 1 : literals.size * Math.ceil(Math.log2(literals.size));
  if (!Number.isSafeInteger(sortCost) || !consumeGlobProofWork(context, sortCost)) return null;
  const ordered = [...literals].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  // `null` is the equivalence class for every non-slash code point not named
  // literally by either automaton. Together with slash and the literals, this
  // finite alphabet proves relations over the full Unicode input alphabet.
  return ["/", ...ordered, null];
}

function globMove(
  nfa: GlobNfa,
  states: readonly number[],
  character: string | null,
  cache: Map<string, number[]>,
  context: GlobProofContext,
): number[] | null {
  if (!consumeGlobProofWork(context, Math.max(1, states.length))) return null;
  const characterKey = character === null ? "other" : `literal:${character}`;
  const key = `${states.join(",")}|${characterKey}`;
  if (cache.has(key)) return cache.get(key)!;
  const next = new Set<number>();
  for (const current of states) {
    if (!consumeGlobProofWork(context)) return null;
    for (const transition of nfa.transitions[current]!) {
      if (!consumeGlobProofWork(context)) return null;
      if (transition.kind === "literal") {
        if (character !== null && transition.value === character) next.add(transition.to);
      } else if (transition.kind === "non-slash" && character !== "/") {
        next.add(transition.to);
      }
    }
  }
  const result = epsilonClosure(nfa, [...next], context);
  if (!result) return null;
  if (context.cacheEntries >= MAX_GLOB_CACHE_ENTRIES || !consumeGlobProofWork(context)) return null;
  context.cacheEntries += 1;
  cache.set(key, result);
  return result;
}

/** Exact requested-language containment; `null` means the bounded proof exhausted its state budget. */
function globLanguageContained(authority: GlobNfa, requested: GlobNfa, context: GlobProofContext): boolean | null {
  const alphabet = globAlphabet(authority, requested, context);
  if (!alphabet) return null;
  const authorityCache = new Map<string, number[]>();
  const requestedCache = new Map<string, number[]>();
  const authorityStart = epsilonClosure(authority, [authority.start], context);
  const requestedStart = epsilonClosure(requested, [requested.start], context);
  if (!authorityStart || !requestedStart) return null;
  const queue: Array<{ authority: number[]; requested: number[] }> = [];
  const queued = new Set<string>();
  const enqueue = (entry: { authority: number[]; requested: number[] }): boolean => {
    if (!consumeGlobProofWork(context, Math.max(1, entry.authority.length + entry.requested.length))) return false;
    const key = `${entry.authority.join(",")}|${entry.requested.join(",")}`;
    if (queued.has(key)) return true;
    if (context.queueEntries >= MAX_GLOB_QUEUE_ENTRIES || queued.size >= MAX_GLOB_PRODUCT_STATES || !consumeGlobProofWork(context)) return false;
    context.queueEntries += 1;
    queued.add(key);
    queue.push(entry);
    return true;
  };
  if (!enqueue({ authority: authorityStart, requested: requestedStart })) return null;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (!consumeGlobProofWork(context)) return null;
    const current = queue[cursor]!;
    if (!consumeGlobProofWork(context, current.authority.length + current.requested.length)) return null;
    if (current.requested.includes(requested.accept) && !current.authority.includes(authority.accept)) {
      return false;
    }
    for (const character of alphabet) {
      if (!consumeGlobProofWork(context)) return null;
      const nextRequested = globMove(requested, current.requested, character, requestedCache, context);
      if (!nextRequested) return null;
      if (nextRequested.length === 0) continue;
      const nextAuthority = globMove(authority, current.authority, character, authorityCache, context);
      if (!nextAuthority || !enqueue({ authority: nextAuthority, requested: nextRequested })) return null;
    }
  }
  return true;
}

/** Exact language intersection; `null` means the bounded proof exhausted its state budget. */
function globLanguagesOverlap(left: GlobNfa, right: GlobNfa, context: GlobProofContext): boolean | null {
  const alphabet = globAlphabet(left, right, context);
  if (!alphabet) return null;
  const leftCache = new Map<string, number[]>();
  const rightCache = new Map<string, number[]>();
  const leftStart = epsilonClosure(left, [left.start], context);
  const rightStart = epsilonClosure(right, [right.start], context);
  if (!leftStart || !rightStart) return null;
  const queue: Array<{ left: number[]; right: number[] }> = [];
  const queued = new Set<string>();
  const enqueue = (entry: { left: number[]; right: number[] }): boolean => {
    if (!consumeGlobProofWork(context, Math.max(1, entry.left.length + entry.right.length))) return false;
    const key = `${entry.left.join(",")}|${entry.right.join(",")}`;
    if (queued.has(key)) return true;
    if (context.queueEntries >= MAX_GLOB_QUEUE_ENTRIES || queued.size >= MAX_GLOB_PRODUCT_STATES || !consumeGlobProofWork(context)) return false;
    context.queueEntries += 1;
    queued.add(key);
    queue.push(entry);
    return true;
  };
  if (!enqueue({ left: leftStart, right: rightStart })) return null;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (!consumeGlobProofWork(context)) return null;
    const current = queue[cursor]!;
    if (!consumeGlobProofWork(context, current.left.length + current.right.length)) return null;
    if (current.left.includes(left.accept) && current.right.includes(right.accept)) return true;
    for (const character of alphabet) {
      if (!consumeGlobProofWork(context)) return null;
      const nextLeft = globMove(left, current.left, character, leftCache, context);
      if (!nextLeft) return null;
      if (nextLeft.length === 0) continue;
      const nextRight = globMove(right, current.right, character, rightCache, context);
      if (!nextRight) return null;
      if (nextRight.length === 0) continue;
      if (!enqueue({ left: nextLeft, right: nextRight })) return null;
    }
  }
  return false;
}

/** Prove that one declaration grants no less path authority than another. */
function declarationCovers(authorityValue: string, requestedValue: string, context: GlobProofContext): boolean | null {
  const authority = parsePlanPath(authorityValue, { allowPattern: true });
  const requested = parsePlanPath(requestedValue, { allowPattern: true });
  if (!authority.ok || !requested.ok) return false;
  // Equality is already a complete proof and must not consume the automaton
  // budget merely because both canonical declarations are unusually long.
  if (authority.path === requested.path) return true;
  const authorityNfa = compileGlobNfa(authority.path, context);
  const requestedNfa = compileGlobNfa(requested.path, context);
  if (!authorityNfa || !requestedNfa) return null;
  return globLanguageContained(authorityNfa, requestedNfa, context);
}

/** Fail-closed intersection for the supported segment `*` / path `**` subset. */
function declarationsOverlap(leftValue: string, rightValue: string, context: GlobProofContext): boolean | null {
  const left = parsePlanPath(leftValue, { allowPattern: true });
  const right = parsePlanPath(rightValue, { allowPattern: true });
  if (!left.ok || !right.ok) return true;
  if (left.path === right.path) return true;
  const leftNfa = compileGlobNfa(left.path, context);
  const rightNfa = compileGlobNfa(right.path, context);
  if (!leftNfa || !rightNfa) return null;
  return globLanguagesOverlap(leftNfa, rightNfa, context);
}

function sectionContent(sections: AtxSection[], title: string): string | null {
  const wanted = title.toLocaleLowerCase();
  const section = sections.find((candidate) => candidate.title.toLocaleLowerCase() === wanted);
  if (!section) return null;
  const content = section.content.trim();
  return content || null;
}

/** Strip fenced code blocks so their contents never read as plan prose. */
function withoutFences(text: string): string {
  return text.replace(/^ {0,3}(?:```|~~~)[\s\S]*?^ {0,3}(?:```|~~~)\s*$/gm, "");
}

/** Backticked spans in order; empty when the value carries none. */
function codeSpans(value: string): string[] {
  return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim()).filter(Boolean);
}

/**
 * A labelled field's value as a list: its backticked spans when it has any,
 * otherwise its comma/semicolon-separated parts. Prose without either is one
 * single-entry list, which is what a one-command or one-test field means.
 */
function listValues(value: string): string[] {
  const spans = codeSpans(value);
  if (spans.length) return spans;
  return value
    .split(/[,;]/)
    .map((part) => part.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function bulletItems(content: string | null): string[] {
  if (!content) return [];
  const items: string[] = [];
  for (const raw of withoutFences(content).split("\n")) {
    const match = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(raw);
    if (match) {
      items.push(match[1].trim());
      continue;
    }
    // A wrapped continuation line belongs to the bullet above it.
    if (items.length && /^\s+\S/.test(raw)) items[items.length - 1] += ` ${raw.trim()}`;
  }
  return items.filter(Boolean);
}

function parseExpectedFiles(content: string | null): PlanFileEntry[] {
  if (!content) return [];
  const rows: PlanFileEntry[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
    const path = normalisePlanPath(cells[1]);
    if (!path) continue;
    if (cells[0].toLocaleLowerCase() === "action" || path.toLocaleLowerCase().includes("repo-root-relative")) continue;
    rows.push({ action: cells[0], path, responsibility: cells[2] ?? "" });
  }
  return rows;
}

function parseDoNotModify(content: string | null): string[] {
  if (!content) return [];
  const paths: string[] = [];
  for (const item of bulletItems(content)) {
    const spans = codeSpans(item);
    for (const span of spans) {
      const path = normalisePlanPath(span);
      // Only path-shaped spans; a backticked symbol name is not a file.
      if (path && (path.includes("/") || path.includes("."))) paths.push(path);
    }
  }
  return [...new Set(paths)];
}

function parseEvidencePins(content: string | null): PlanEvidencePin[] {
  if (!content) return [];
  const pins: PlanEvidencePin[] = [];
  for (const match of content.matchAll(/`([^`]+)`\s*@\s*`?([0-9a-fA-F]{8,64})`?/g)) {
    pins.push({ path: normalisePlanPath(match[1]), version: match[2].toLowerCase() });
  }
  return pins;
}

function stepTitle(heading: string): string {
  return heading.replace(/^step\s+\d+\s*[—:.\-–]\s*/i, "").trim() || heading.trim();
}

function parseStepFields(body: string): Partial<Record<PlanStepField, string>> {
  const fields: Partial<Record<PlanStepField, string>> = {};
  for (const item of bulletItems(body)) {
    const match = /^\*{0,2}([^:*]+?)\*{0,2}\s*:\s*(.*)$/.exec(item);
    if (!match) continue;
    const field = FIELD_BY_LABEL.get(match[1].trim().toLocaleLowerCase());
    const value = match[2].trim();
    if (!field || !value) continue;
    // First occurrence wins, so a later prose mention cannot silently replace
    // the field a planner wrote deliberately.
    if (fields[field] === undefined) fields[field] = value;
  }
  return fields;
}

function buildStep(index: number, title: string, structured: boolean, body: string): PlanStep {
  const fields = structured ? parseStepFields(body) : {};
  return {
    index,
    id: `step-${index}`,
    title,
    structured,
    fields,
    files: fields.files ? listValues(fields.files).map(normalisePlanPath) : [],
    symbols: fields.symbols ? listValues(fields.symbols) : [],
    tests: fields.tests ? listValues(fields.tests) : [],
    commands: fields.commands ? listValues(fields.commands) : [],
    negativeCases: fields.negative ? listValues(fields.negative) : [],
  };
}

/**
 * The ordered steps of a plan, in either accepted form.
 *
 * The structured form is a `### Step N — <title>` sub-heading whose body is
 * labelled bullets. The legacy form is a plain numbered list item, which parses
 * to a title-only step so an older plan still reads without error — it simply
 * cannot be compiled into a packet.
 */
function parseSteps(content: string | null): PlanStep[] {
  if (!content) return [];
  const lines = withoutFences(content).split("\n");
  const headings: Array<{ line: number; title: string }> = [];
  for (const [line, text] of lines.entries()) {
    const match = /^(?: {0,3})#{3,6}(?:[ \t]+)(.*)$/.exec(text);
    if (match) headings.push({ line, title: match[1].trim().replace(/[ \t]+#+[ \t]*$/, "").trim() });
  }

  if (headings.length) {
    return headings.map((heading, position) => {
      const end = headings[position + 1]?.line ?? lines.length;
      return buildStep(
        position + 1,
        stepTitle(heading.title),
        true,
        lines.slice(heading.line + 1, end).join("\n"),
      );
    });
  }

  const items = bulletItems(content);
  return items.map((item, position) => buildStep(position + 1, stepTitle(item), false, ""));
}

function collectPathIssues(sections: AtxSection[], steps: PlanStep[]): PlanPathIssue[] {
  const issues: PlanPathIssue[] = [];
  const add = (value: string, section: string, allowPattern: boolean, step?: number) => {
    const parsed = parsePlanPath(value, { allowPattern });
    if (!parsed.ok) issues.push({ value, reason: parsed.reason, section, ...(step === undefined ? {} : { step }) });
  };
  const expected = sectionContent(sections, "Expected files");
  if (expected) {
    for (const line of expected.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) continue;
      const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      if (cells.length < 2 || cells[0].toLocaleLowerCase() === "action" || /^:?-{2,}:?$/.test(cells[1])) continue;
      add(cells[1], "Expected files", true);
    }
  }
  for (const item of bulletItems(sectionContent(sections, "Do not modify"))) {
    for (const span of codeSpans(item)) add(span, "Do not modify", true);
  }
  const starting = sectionContent(sections, "Starting state") ?? "";
  for (const match of starting.matchAll(/`([^`]+)`\s*@\s*`?([0-9a-fA-F]{8,64})`?/g)) {
    add(match[1], "Starting state", false);
  }
  for (const step of steps) {
    for (const value of step.fields.files ? listValues(step.fields.files) : []) add(value, "Ordered steps", true, step.index);
  }
  return issues;
}

/** Read a plan document into the structures a step packet is compiled from. */
export function parsePlan(markdown: string): ParsedPlan {
  const sections = parseAtxSections(markdown);
  const startingState = sectionContent(sections, "Starting state");
  const steps = parseSteps(sectionContent(sections, "Ordered steps"));
  return {
    sections,
    objective: sectionContent(sections, "Objective"),
    expectedFiles: parseExpectedFiles(sectionContent(sections, "Expected files")),
    doNotModify: parseDoNotModify(sectionContent(sections, "Do not modify")),
    acceptanceChecks: bulletItems(sectionContent(sections, "Acceptance checks")),
    commands: bulletItems(sectionContent(sections, "Commands")),
    stopCondition: sectionContent(sections, "Stop condition"),
    evidencePins: parseEvidencePins(startingState),
    steps,
    pathIssues: collectPathIssues(sections, steps),
  };
}

/** Every finding {@link validatePlan} can report. */
export type PlanFindingCode =
  | "PLAN_SECTION_MISSING"
  | "PLAN_VAGUE_INSTRUCTION"
  | "PLAN_RISK_EVIDENCE_MISSING"
  | "PLAN_STEPS_MISSING"
  | "PLAN_STEP_NOT_FOUND"
  | "PLAN_STEP_UNSTRUCTURED"
  | "PLAN_STEP_FIELD_MISSING"
  | "PLAN_STEP_FILE_UNDECLARED"
  | "PLAN_STEP_FILE_FORBIDDEN"
  | "PLAN_GLOB_COMPLEXITY"
  | "PLAN_ALLOWED_FILES_MISSING"
  | "PLAN_ACCEPTANCE_MISSING"
  | "PLAN_STOP_CONDITION_MISSING"
  | "PLAN_EVIDENCE_STALE"
  | "PLAN_EVIDENCE_UNKNOWN"
  | "PLAN_EVIDENCE_UNRECORDED"
  | "PLAN_EVIDENCE_DUPLICATE"
  | "PLAN_PATH_INVALID"
  | "PLAN_PACKET_BUDGET_EXCEEDED";

/**
 * `blocker` refuses a step packet; `advisory` is always reported and never
 * refuses anything. Vague language and risk-evidence gaps are permanently
 * advisory — the plan template's decision-verb warning is not a gate.
 */
export type PlanFindingSeverity = "blocker" | "advisory";

/** One thing validation noticed about a plan. */
export interface PlanFinding {
  code: PlanFindingCode;
  severity: PlanFindingSeverity;
  message: string;
  section?: string;
  step?: number;
  detail?: string;
}

/** The report {@link validatePlan} returns. `ok` is "no blockers". */
export interface PlanValidation {
  ok: boolean;
  blockers: number;
  advisories: number;
  findings: PlanFinding[];
}

/** What {@link validatePlan} needs beyond the plan itself. */
export interface ValidatePlanOptions {
  /**
   * The 1-based step a caller intends to compile. Its presence is what turns
   * structural findings into blockers; without it nothing is ever a blocker.
   */
  step?: number;
  /** Live document versions, used to judge the plan's evidence pins. */
  liveEvidence?: readonly PlanEvidencePin[];
  /**
   * True when the ticket carries research/impact evidence that a constrained
   * plan is expected to pin. False for trivial work, which must not accrue
   * invented deep-research debt.
   */
  requireEvidencePin?: boolean;
  /** Optional smaller deterministic budget for callers/tests; defaults to the shipped aggregate bound. */
  maxGlobProofOperations?: number;
}

/** The sections whose prose is scanned for unresolved vague instructions. */
const VAGUE_SCAN_SECTIONS = ["Required changes", "Constraints", "Ordered steps", "Acceptance checks"] as const;

/**
 * Words that usually mean planner work remains. Advisory only — the plan
 * template says so explicitly, and FRD-033 accepts flagging over rejecting.
 */
const VAGUE_MARKERS: readonly RegExp[] = [
  /\binvestigat(?:e|es|ing|ion)\b/i,
  /\bdecid(?:e|es|ing)\b/i,
  /\bchoos(?:e|es|ing)\b/i,
  /\bdetermin(?:e|es|ing)\b/i,
  /\bfigure out\b/i,
  /\bexplor(?:e|es|ing)\b/i,
  /\bas appropriate\b/i,
  /\bwhere appropriate\b/i,
  /\bas needed\b/i,
  /\bas required\b/i,
  /\bif necessary\b/i,
  /\bsomehow\b/i,
  /\bTBD\b/,
  /\bTODO\b/,
  /\betc\./i,
  /\band so on\b/i,
  /\bmaybe\b/i,
  /\bprobably\b/i,
  /\bsome kind of\b/i,
];

/**
 * FRD-033's exemption: a sentence is resolved when it names the exact decision,
 * file, caller, error or test. In Markdown that is a backticked span, a
 * path-like token, an UPPER_SNAKE error code, or an explicit `→` mapping.
 */
const RESOLUTION_SIGNALS: readonly RegExp[] = [
  /`[^`]+`/,
  /\b[\w.-]+\/[\w./-]+\b/,
  /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/,
  /→/,
];

/** The risk-sensitive work FRD-033 names, and how a plan reveals it. */
export const PLAN_RISK_CATEGORIES: Record<string, RegExp> = {
  state: /\b(?:store\.ts|frontmatter|persist(?:ed|ence)?|board format|state machine|schema)\b/i,
  migration: /\b(?:migrat(?:e|es|ion|ions)|backfill|format bump|upgrade path)\b/i,
  service: /\b(?:http|server|endpoint|remote|tunnel|socket)\b/i,
  runtime: /\b(?:bundle|standalone|electron|packaged|installer|runtime)\b/i,
  "public-contract": /\b(?:public api|inputschema|tool (?:schema|surface|reference|roster)|exported? (?:api|type)|index\.ts|mcp tool)\b/i,
  security: /\b(?:auth|authentication|authoris|authoriz|token|secret|credential|permission|bearer)\b/i,
  release: /\b(?:release|publish|version bump|changelog)\b/i,
};

/** Sections a plan is expected to cite its evidence in. */
const EVIDENCE_SECTIONS = ["Starting state", "Governing docs", "Constraints"] as const;

/** A citation is a source path (optionally line-anchored) or a docs/research path. */
const EVIDENCE_CITATION =
  /`[^`]*\.(?:ts|tsx|mjs|cjs|js|md|json|yml|yaml)(?::\d+(?:-\d+)?)?[^`]*`|\bdocs\/[\w./-]+|\bresearch\/[\w./-]+/i;

function sentencesOf(content: string): string[] {
  const sentences: string[] = [];
  for (const raw of withoutFences(content).split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("|")) continue; // table rows are data, not instructions
    if (/^#{1,6}\s/.test(line)) continue;
    for (const part of line.split(/(?<=[.!?])\s+/)) {
      const sentence = part.trim();
      if (sentence) sentences.push(sentence);
    }
  }
  return sentences;
}

function isResolved(sentence: string): boolean {
  return RESOLUTION_SIGNALS.some((signal) => signal.test(sentence));
}

function vagueFindings(plan: ParsedPlan): PlanFinding[] {
  const findings: PlanFinding[] = [];
  for (const title of VAGUE_SCAN_SECTIONS) {
    const content = sectionContent(plan.sections, title);
    if (!content) continue;
    for (const sentence of sentencesOf(content)) {
      if (isResolved(sentence)) continue;
      const marker = VAGUE_MARKERS.find((pattern) => pattern.test(sentence));
      if (!marker) continue;
      findings.push({
        code: "PLAN_VAGUE_INSTRUCTION",
        severity: "advisory",
        section: title,
        message: `"${title}" leaves an instruction unresolved: it does not name the exact decision, file, caller, error or test.`,
        detail: sentence.length > 240 ? `${sentence.slice(0, 237)}...` : sentence,
      });
    }
  }
  return findings;
}

function riskFindings(plan: ParsedPlan): PlanFinding[] {
  const declared = [
    plan.expectedFiles.map((entry) => `${entry.path} ${entry.responsibility}`).join("\n"),
    sectionContent(plan.sections, "Required changes") ?? "",
  ].join("\n");
  const coverage = EVIDENCE_SECTIONS.map((title) => sectionContent(plan.sections, title) ?? "").join("\n");
  const cited = EVIDENCE_CITATION.test(coverage);

  const findings: PlanFinding[] = [];
  for (const [category, pattern] of Object.entries(PLAN_RISK_CATEGORIES)) {
    if (!pattern.test(declared)) continue; // category not touched — no debt invented
    if (cited && pattern.test(coverage)) continue;
    findings.push({
      code: "PLAN_RISK_EVIDENCE_MISSING",
      severity: "advisory",
      section: "Starting state",
      message: `The plan touches ${category} work but its Starting state, Governing docs and Constraints cite no evidence for it.`,
      detail: category,
    });
  }
  return findings;
}

function evidenceFindings(
  plan: ParsedPlan,
  severity: PlanFindingSeverity,
  options: ValidatePlanOptions,
): PlanFinding[] {
  if (!options.liveEvidence) return [];
  const live = new Map(
    options.liveEvidence.flatMap((entry) => {
      const parsed = parsePlanPath(entry.path);
      return parsed.ok ? [[parsed.path, entry.version.toLowerCase()] as const] : [];
    }),
  );
  const findings: PlanFinding[] = [];
  const seenPins = new Set<string>();
  for (const pin of plan.evidencePins) {
    if (seenPins.has(pin.path)) {
      findings.push({
        code: "PLAN_EVIDENCE_DUPLICATE",
        severity,
        section: "Starting state",
        message: `Evidence "${pin.path}" is pinned more than once; authority must be unambiguous.`,
        detail: pin.path,
      });
    }
    seenPins.add(pin.path);
    const current = live.get(pin.path);
    if (current === undefined) {
      findings.push({
        code: "PLAN_EVIDENCE_UNKNOWN",
        severity,
        section: "Starting state",
        message: `The plan pins "${pin.path}", which is not among this ticket's current evidence documents.`,
        detail: pin.path,
      });
      continue;
    }
    if (current !== pin.version) {
      findings.push({
        code: "PLAN_EVIDENCE_STALE",
        severity,
        section: "Starting state",
        message: `Evidence "${pin.path}" changed since the plan pinned it (plan ${pin.version}, current ${current}).`,
        detail: pin.path,
      });
    }
  }
  if (options.requireEvidencePin) {
    const pinned = new Map(plan.evidencePins.map((entry) => [entry.path, entry.version]));
    for (const [path, version] of live) {
      if (!/^(?:research|files)\//.test(path) || pinned.get(path) === version) continue;
      findings.push({
        code: "PLAN_EVIDENCE_UNRECORDED",
        severity,
        section: "Starting state",
        detail: path,
        message: `Current evidence "${path}"@${version} has no matching pin in Starting state.`,
      });
    }
  }
  return findings;
}

function stepFindings(
  plan: ParsedPlan,
  severity: PlanFindingSeverity,
  selected: number | undefined,
  proofContext: GlobProofContext,
): PlanFinding[] {
  const findings: PlanFinding[] = [];
  if (plan.steps.length === 0) {
    findings.push({
      code: "PLAN_STEPS_MISSING",
      severity,
      section: "Ordered steps",
      message: "The plan has no ordered steps, so there is nothing to compile into a bounded step packet.",
    });
    return findings;
  }
  if (selected !== undefined && selected > plan.steps.length) {
    findings.push({
      code: "PLAN_STEP_NOT_FOUND",
      severity,
      section: "Ordered steps",
      step: selected,
      message: `The plan has ${plan.steps.length} ordered step(s); step ${selected} does not exist.`,
    });
    return findings;
  }

  const declared = plan.expectedFiles.map((entry) => entry.path);
  const forbidden = plan.doNotModify;

  for (const step of plan.steps) {
    const chosen = selected !== undefined && step.index === selected;
    const stepSeverity: PlanFindingSeverity = chosen ? severity : "advisory";
    if (!step.structured) {
      findings.push({
        code: "PLAN_STEP_UNSTRUCTURED",
        severity: stepSeverity,
        section: "Ordered steps",
        step: step.index,
        message:
          `Step ${step.index} is a plain list item. A constrained step packet needs a "### Step ${step.index} — <title>" ` +
          "sub-section naming its preconditions, files, change, tests, commands and done condition.",
      });
      continue;
    }
    for (const field of PLAN_STEP_REQUIRED_FIELDS) {
      if (step.fields[field] === undefined) {
        findings.push({
          code: "PLAN_STEP_FIELD_MISSING",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names no "${PLAN_STEP_FIELD_LABELS[field][0]}".`,
          detail: field,
        });
      }
    }
    for (const field of ["preconditions", "preserved", "negative", "expected", "deviation"] as const) {
      if (step.fields[field] === undefined) {
        findings.push({
          code: "PLAN_STEP_FIELD_MISSING",
          severity: "advisory",
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names no "${PLAN_STEP_FIELD_LABELS[field][0]}".`,
          detail: field,
        });
      }
    }
    for (const file of step.files) {
      const declarationProofs: Array<boolean | null> = [];
      for (const authority of declared) {
        const proof = declarationCovers(authority, file, proofContext);
        declarationProofs.push(proof);
        if (proof === true) break;
      }
      if (!declarationProofs.includes(true) && declarationProofs.includes(null)) {
        findings.push({
          code: "PLAN_GLOB_COMPLEXITY",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message:
            `Step ${step.index} path "${file}" exceeds the bounded glob-containment proof budget; ` +
            "simplify its Expected files or step declaration.",
          detail: file,
        });
      } else if (!declarationProofs.includes(true)) {
        findings.push({
          code: "PLAN_STEP_FILE_UNDECLARED",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names "${file}", which the plan's Expected files table never declares.`,
          detail: file,
        });
      }
      const forbiddenProofs: Array<boolean | null> = [];
      for (const pattern of forbidden) {
        const proof = declarationsOverlap(pattern, file, proofContext);
        forbiddenProofs.push(proof);
        if (proof === true) break;
      }
      if (forbiddenProofs.includes(true)) {
        findings.push({
          code: "PLAN_STEP_FILE_FORBIDDEN",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names "${file}", which the plan's Do not modify section forbids.`,
          detail: file,
        });
      } else if (forbiddenProofs.includes(null)) {
        findings.push({
          code: "PLAN_GLOB_COMPLEXITY",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message:
            `Step ${step.index} path "${file}" exceeds the bounded forbidden-glob intersection proof budget; ` +
            "simplify its Do not modify or step declaration.",
          detail: file,
        });
      }
    }
  }
  return findings;
}

/** An acceptance check is usable when it is executable or explicitly manual. */
function acceptanceIsUsable(check: string): boolean {
  return codeSpans(check).length > 0 || /\bmanual(?:ly)?\b/i.test(check);
}

/**
 * Report what a plan leaves unresolved.
 *
 * Without `options.step` every finding is advisory: this is the report the
 * whole-ticket execution packet carries, and it must never start refusing work
 * that used to be allowed. With `options.step` the structural findings become
 * blockers, because that is the moment a constrained worker would otherwise be
 * handed an unbounded job.
 */
export function validatePlan(plan: ParsedPlan, options: ValidatePlanOptions = {}): PlanValidation {
  const structural: PlanFindingSeverity = options.step === undefined ? "advisory" : "blocker";
  const findings: PlanFinding[] = [];
  const proofContext = createGlobProofContext(options.maxGlobProofOperations);

  for (const title of PLAN_SECTIONS) {
    if (sectionContent(plan.sections, title) === null) {
      findings.push({
        code: "PLAN_SECTION_MISSING",
        severity: "advisory",
        section: title,
        message: `The plan has no "${title}" section.`,
      });
    }
  }

  findings.push(...vagueFindings(plan));
  findings.push(...riskFindings(plan));
  for (const issue of plan.pathIssues) {
    const selectedIssue = issue.step === undefined || issue.step === options.step;
    findings.push({
      code: "PLAN_PATH_INVALID",
      severity: selectedIssue ? structural : "advisory",
      section: issue.section,
      ...(issue.step === undefined ? {} : { step: issue.step }),
      detail: issue.value,
      message: `"${issue.value}" is not a supported repository-relative path: ${issue.reason}.`,
    });
  }

  if (plan.expectedFiles.length === 0) {
    findings.push({
      code: "PLAN_ALLOWED_FILES_MISSING",
      severity: structural,
      section: "Expected files",
      message: "The plan declares no Expected files, so a packet cannot limit a worker to any file.",
    });
  }
  if (!plan.stopCondition) {
    findings.push({
      code: "PLAN_STOP_CONDITION_MISSING",
      severity: structural,
      section: "Stop condition",
      message: "The plan states no Stop condition, so a worker would not know where to stop.",
    });
  }
  if (!plan.acceptanceChecks.some(acceptanceIsUsable)) {
    findings.push({
      code: "PLAN_ACCEPTANCE_MISSING",
      severity: structural,
      section: "Acceptance checks",
      message:
        "The plan states no acceptance check that is either executable (a named command or test) or explicitly manual.",
    });
  }

  findings.push(...evidenceFindings(plan, structural, options));
  findings.push(...stepFindings(plan, structural, options.step, proofContext));

  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  return { ok: blockers === 0, blockers, advisories: findings.length - blockers, findings };
}
