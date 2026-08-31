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

function segmentMatches(pattern: string, value: string): boolean {
  let source = "^";
  for (const character of pattern) {
    source += character === "*" ? "[^/]*" : character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`${source}$`, "u").test(value);
}

/** Match a confined literal path against the documented literal/`*`/`**` subset. */
export function planPathMatches(patternValue: string, pathValue: string): boolean {
  const pattern = parsePlanPath(patternValue, { allowPattern: true });
  const observed = parsePlanPath(pathValue, { observed: true });
  if (!pattern.ok || !observed.ok) return false;
  const patterns = pattern.path.split("/");
  const values = observed.path.split("/");
  const visit = (left: number, right: number): boolean => {
    if (left === patterns.length) return right === values.length;
    if (patterns[left] === "**") {
      return visit(left + 1, right) || (right < values.length && visit(left, right + 1));
    }
    return right < values.length && segmentMatches(patterns[left], values[right]) && visit(left + 1, right + 1);
  };
  return visit(0, 0);
}

function segmentClosure(pattern: readonly string[], seed: readonly number[]): number[] {
  const result = new Set(seed);
  const queue = [...seed];
  while (queue.length) {
    const index = queue.shift()!;
    if (pattern[index] !== "*" || result.has(index + 1)) continue;
    result.add(index + 1);
    queue.push(index + 1);
  }
  return [...result].sort((left, right) => left - right);
}

function segmentTransition(pattern: readonly string[], states: readonly number[], character: string | null): number[] {
  const next = new Set<number>();
  for (const index of segmentClosure(pattern, states)) {
    if (index >= pattern.length) continue;
    if (pattern[index] === "*") next.add(index);
    else if (character !== null && pattern[index] === character) next.add(index + 1);
  }
  return segmentClosure(pattern, [...next]);
}

/** Exact language containment for the supported within-segment `*` syntax. */
function segmentDeclarationCovers(authorityValue: string, requestedValue: string): boolean {
  const authority = Array.from(authorityValue);
  const requested = Array.from(requestedValue);
  // Every literal plus `null` (the equivalence class for any other character)
  // is a complete alphabet for these two star NFAs.
  const alphabet: Array<string | null> = [
    ...new Set([...authority, ...requested].filter((character) => character !== "*")),
    null,
  ];
  const startAuthority = segmentClosure(authority, [0]);
  const startRequested = segmentClosure(requested, [0]);
  const queue: Array<{ authority: number[]; requested: number[]; consumed: boolean }> = [
    { authority: startAuthority, requested: startRequested, consumed: false },
  ];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.authority.join(",")}|${current.requested.join(",")}|${current.consumed ? 1 : 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const requestedAccepts = current.requested.includes(requested.length);
    const authorityAccepts = current.authority.includes(authority.length);
    // Repository path segments are non-empty, so the epsilon-only word is not
    // a counterexample even when a bare `*` accepts it.
    if (current.consumed && requestedAccepts && !authorityAccepts) return false;
    for (const character of alphabet) {
      const nextRequested = segmentTransition(requested, current.requested, character);
      if (nextRequested.length === 0) continue;
      queue.push({
        authority: segmentTransition(authority, current.authority, character),
        requested: nextRequested,
        consumed: true,
      });
    }
  }
  return true;
}

/**
 * Prove that one declaration grants no less path authority than another.
 * Segment languages use exact containment. A path-level `**` proof is
 * deliberately constructive: each accepted relationship gives the authority
 * glob one concrete way to consume every requested segment. Relationships the
 * proof cannot establish fail closed; a literal never authorises a step glob.
 */
function declarationCovers(authorityValue: string, requestedValue: string): boolean {
  const authority = parsePlanPath(authorityValue, { allowPattern: true });
  const requested = parsePlanPath(requestedValue, { allowPattern: true });
  if (!authority.ok || !requested.ok) return false;
  if (!requested.pattern) return planPathMatches(authority.path, requested.path);
  if (!authority.pattern) return false;
  const collapseRecursive = (segments: string[]): string[] => segments.filter(
    (segment, index) => segment !== "**" || segments[index - 1] !== "**",
  );
  const authoritySegments = collapseRecursive(authority.path.split("/"));
  const requestedSegments = collapseRecursive(requested.path.split("/"));
  const memo = new Map<string, boolean>();
  const visit = (authorityIndex: number, requestedIndex: number): boolean => {
    const key = `${authorityIndex}:${requestedIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result: boolean;
    if (requestedIndex === requestedSegments.length) {
      result = authoritySegments.slice(authorityIndex).every((segment) => segment === "**");
    } else if (authorityIndex === authoritySegments.length) {
      // A remaining requested `**` can always emit at least one more segment,
      // which exhausted authority cannot cover.
      result = false;
    } else if (authoritySegments[authorityIndex] === "**") {
      if (authorityIndex === authoritySegments.length - 1) {
        result = true;
      } else if (requestedSegments[requestedIndex] === "**") {
        // Either pair the recursive spans, or let this authority span absorb
        // every segment emitted by the requested span and keep proving the
        // requested suffix. The latter is what establishes, for example,
        // `a/**/b` covering `a/**/x/b`.
        result = visit(authorityIndex + 1, requestedIndex + 1) || visit(authorityIndex, requestedIndex + 1);
      } else {
        result = visit(authorityIndex + 1, requestedIndex) || visit(authorityIndex, requestedIndex + 1);
      }
    } else if (requestedSegments[requestedIndex] === "**") {
      result = false;
    } else {
      result = segmentDeclarationCovers(
        authoritySegments[authorityIndex]!,
        requestedSegments[requestedIndex]!,
      ) && visit(authorityIndex + 1, requestedIndex + 1);
    }
    memo.set(key, result);
    return result;
  };
  return visit(0, 0);
}

function segmentDeclarationsMayOverlap(left: string, right: string): boolean {
  const a = Array.from(left);
  const b = Array.from(right);
  const queue: Array<[number, number]> = [[0, 0]];
  const seen = new Set<string>();
  while (queue.length) {
    const [i, j] = queue.shift()!;
    const key = `${i}:${j}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (i === a.length && j === b.length) return true;
    const leftStar = a[i] === "*";
    const rightStar = b[j] === "*";
    if (leftStar) queue.push([i + 1, j]); // `*` consumes nothing
    if (rightStar) queue.push([i, j + 1]);
    if (i >= a.length || j >= b.length) continue;
    if (leftStar || rightStar || a[i] === b[j]) {
      const next: [number, number] = [leftStar ? i : i + 1, rightStar ? j : j + 1];
      // Two stars consuming the same arbitrary character remain in the same
      // state and add no reachability beyond their epsilon transitions.
      if (next[0] !== i || next[1] !== j) queue.push(next);
    }
  }
  return false;
}

/** Fail-closed intersection for the supported segment `*` / path `**` subset. */
function declarationsOverlap(leftValue: string, rightValue: string): boolean {
  const left = parsePlanPath(leftValue, { allowPattern: true });
  const right = parsePlanPath(rightValue, { allowPattern: true });
  if (!left.ok || !right.ok) return true;
  const a = left.path.split("/");
  const b = right.path.split("/");
  const seen = new Set<string>();
  const visit = (i: number, j: number): boolean => {
    const key = `${i}:${j}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (i === a.length && j === b.length) return true;
    if (i === a.length) return b.slice(j).every((segment) => segment === "**");
    if (j === b.length) return a.slice(i).every((segment) => segment === "**");
    if (a[i] === "**" && b[j] === "**") return visit(i + 1, j) || visit(i, j + 1);
    if (a[i] === "**") return visit(i + 1, j) || visit(i, j + 1);
    if (b[j] === "**") return visit(i, j + 1) || visit(i + 1, j);
    return segmentDeclarationsMayOverlap(a[i], b[j]) && visit(i + 1, j + 1);
  };
  return visit(0, 0);
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

function stepFindings(plan: ParsedPlan, severity: PlanFindingSeverity, selected: number | undefined): PlanFinding[] {
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
      if (!declared.some((authority) => declarationCovers(authority, file))) {
        findings.push({
          code: "PLAN_STEP_FILE_UNDECLARED",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names "${file}", which the plan's Expected files table never declares.`,
          detail: file,
        });
      }
      if (forbidden.some((pattern) => declarationsOverlap(pattern, file))) {
        findings.push({
          code: "PLAN_STEP_FILE_FORBIDDEN",
          severity: stepSeverity,
          section: "Ordered steps",
          step: step.index,
          message: `Step ${step.index} names "${file}", which the plan's Do not modify section forbids.`,
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
  findings.push(...stepFindings(plan, structural, options.step));

  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  return { ok: blockers === 0, blockers, advisories: findings.length - blockers, findings };
}
