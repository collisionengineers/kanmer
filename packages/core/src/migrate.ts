import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, pathExists, readText, writeFileAtomic, TMP_FILE_RE } from "./io.js";
import {
  areaFolderName,
  NO_AREA_DIR,
  SCRATCH_PREFIX,
  ticketDirIn,
  type KanmerPaths,
} from "./paths.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { parseWikiLinks } from "./links.js";
import { areaPrefix, DEFAULT_GROUP_KINDS } from "./board.js";
import { isStageId, type StageId } from "./stages.js";
import {
  DEFAULT_PROFILES,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROOF_TYPES,
  type ProfileMap,
} from "./profiles.js";
import { writeVersion } from "./version.js";
import type { KanmerStore } from "./store.js";
import type { Item, UpdateItemPatch } from "./types.js";

/** What a v1 → v2 migration did (or would do, for a dry run). */
export interface MigrationReport {
  /** True when the board is already format 2 — nothing to do. */
  alreadyV2: boolean;
  dryRun: boolean;
  /** Tickets moved into their area/ticket folders. */
  ticketMoves: { id: string; to: string }[];
  /** Legacy plan/research items folded into a ticket's folder as a document. */
  foldedDocs: { source: string; intoTicket: string; doc: "plan" | "research" }[];
  /** Orphan plans/research converted to tickets so nothing is lost. */
  convertedToTickets: { id: string; label: string }[];
  /** The id prefix now pinned on each area. */
  areaPrefixes: Record<string, string>;
  notes: string[];
  /**
   * Fatal problems found before anything was touched. A dry run returns them
   * so the caller can show them and refuse to start; a real run throws.
   */
  blockers: string[];
}

function emptyReport(dryRun: boolean, alreadyV2 = false): MigrationReport {
  return {
    alreadyV2,
    dryRun,
    ticketMoves: [],
    foldedDocs: [],
    convertedToTickets: [],
    areaPrefixes: {},
    notes: [],
    blockers: [],
  };
}

/** The `_none`-safe folder for an item's area (unsafe names fall back with a note). */
function destAreaFolder(item: Item, notes: string[]): string {
  try {
    return areaFolderName(item.area ?? "");
  } catch {
    notes.push(
      `"${item.id}" has an area ("${item.area}") that can't be a folder name — filed under ${NO_AREA_DIR}/.`,
    );
    return NO_AREA_DIR;
  }
}

/**
 * Migrate a format-1 board to format 2: tickets move into
 * `areas/<area|_none>/<id>/` folders, legacy plans/research fold into the
 * ticket they belong to (as plan.md / research.md) or become tickets when
 * nothing links them, areas get pinned id prefixes, counters re-key by
 * prefix, and version.json is stamped. Ids never change. Idempotent: running
 * it on a format-2 board is a no-op.
 */
export async function migrateToV2(
  store: KanmerStore,
  opts: { dryRun?: boolean } = {},
): Promise<MigrationReport> {
  const dryRun = opts.dryRun ?? false;
  // `>= 2`, not `=== 2`: a format-3 board has nothing for the v1→v2 step to do
  // either. With equality this guard missed on v3 boards, so the migration ran
  // and stamped version.json back down to 2 before the v3 step restamped it.
  if ((await store.detectFormat()) >= 2) return emptyReport(dryRun, true);

  const paths: KanmerPaths = store.paths;
  const report = emptyReport(dryRun);
  const board = await store.getBoard();
  const all = await store.listItems({ includeArchived: true });
  const tickets = all.filter((i) => i.type === "ticket");
  const docs = all.filter((i) => i.type === "plan" || i.type === "research");

  // ---- Plan the area prefixes (pinned explicitly so derivation changes
  // can never re-key an existing board). -----------------------------------
  const usedPrefixes = new Set<string>(Object.values(board.idPrefixes));
  for (const area of board.areas) {
    let prefix = areaPrefix(area);
    if (usedPrefixes.has(prefix)) {
      const base = prefix.slice(0, 5);
      let i = 2;
      while (usedPrefixes.has(`${base}${i}`)) i++;
      report.notes.push(
        `Area "${area.id}" derived prefix "${prefix}" collides with an existing prefix — pinned "${base}${i}" instead.`,
      );
      prefix = `${base}${i}`;
    }
    usedPrefixes.add(prefix);
    area.prefix = prefix;
    report.areaPrefixes[area.id] = prefix;
  }

  // ---- Decide where every legacy plan/research goes. ----------------------
  const wikiOf = new Map<string, string[]>(all.map((i) => [i.id, parseWikiLinks(i.body)]));
  const folds: { doc: Item; ticket: Item; as: "plan" | "research" }[] = [];
  const conversions: Item[] = [];
  for (const doc of docs) {
    const related = tickets
      .filter(
        (t) =>
          (t.links ?? []).includes(doc.id) ||
          (doc.links ?? []).includes(t.id) ||
          (wikiOf.get(doc.id) ?? []).includes(t.id) ||
          (wikiOf.get(t.id) ?? []).includes(doc.id),
      )
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    if (related.length === 0) {
      conversions.push(doc);
      continue;
    }
    if (related.length > 1) {
      report.notes.push(
        `"${doc.id}" relates to ${related.length} tickets (${related.map((t) => t.id).join(", ")}) — folded into ${related[0].id}.`,
      );
    }
    folds.push({ doc, ticket: related[0], as: doc.type === "plan" ? "plan" : "research" });
  }

  // ---- Report-shaping (shared by dry run and real run). --------------------
  const ticketDest = new Map<string, string>();
  for (const t of tickets) {
    const folder = destAreaFolder(t, report.notes);
    const dest = path.join("areas", folder, t.id);
    ticketDest.set(t.id, folder);
    report.ticketMoves.push({ id: t.id, to: dest });
  }
  for (const f of folds) {
    report.foldedDocs.push({ source: f.doc.id, intoTicket: f.ticket.id, doc: f.as });
  }
  for (const c of conversions) {
    const label = c.type === "plan" ? "legacy-plan" : "legacy-research";
    report.convertedToTickets.push({ id: c.id, label });
  }
  if (folds.length || conversions.length) {
    report.notes.push(
      "Folded documents keep their title and body; their old frontmatter (labels, links, archived) is dropped — the ticket's own frontmatter governs now.",
    );
  }
  // ---- Pre-flight: refuse a run whose destinations collide. ----------------
  // Two prefixes on one board can produce the same id, and then the move
  // loop's rename target and the conversion loop's write target are the same
  // file — one silently overwrites the other. Plan the paths first and
  // refuse before touching anything.
  // A source is identified by type *and* id, not id alone: the collision this
  // exists to catch is a ticket and a plan that share one id (two prefixes
  // resolving the same), which live in different legacy dirs but land on one
  // v2 path. Keying by id alone would see them as the same source.
  const sourceKey = (item: Item): string => `${item.type} "${item.id}"`;
  const claimedBy = new Map<string, string>(); // destFile -> source key
  const claim = (destFile: string, source: string): boolean => {
    const holder = claimedBy.get(destFile);
    if (holder !== undefined && holder !== source) {
      report.blockers.push(
        `${source} and ${holder} would both be written to ${destFile}. ` +
          `Two id prefixes on this board produce the same id — fix board.yml (idPrefixes / area ` +
          `prefixes must all be distinct) or rename one item, then migrate again.`,
      );
      return false;
    }
    claimedBy.set(destFile, source);
    return true;
  };

  const ticketDestFile = new Map<string, string>();
  for (const t of tickets) {
    const dir = ticketDirIn(paths, ticketDest.get(t.id) === NO_AREA_DIR ? "" : t.area ?? "", t.id);
    const dest = path.join(dir, `${t.id}.md`);
    ticketDestFile.set(t.id, dest);
    claim(dest, sourceKey(t));
  }
  // Conversion destinations are resolved once here (rather than inside the
  // loop as before) so the pre-flight and the loop cannot disagree, and so
  // destAreaFolder's note is pushed exactly once per item.
  const conversionDest = new Map<string, string>();
  for (const c of conversions) {
    const folder = destAreaFolder(c, report.notes);
    const dir = ticketDirIn(paths, folder === NO_AREA_DIR ? "" : c.area ?? "", c.id);
    const dest = path.join(dir, `${c.id}.md`);
    conversionDest.set(c.id, dest);
    claim(dest, sourceKey(c));
  }

  if (report.blockers.length > 0) {
    if (dryRun) return report; // the caller shows them and refuses to start
    throw new Error(`Migration refused:\n- ${report.blockers.join("\n- ")}`);
  }
  if (dryRun) return report;

  // ---- Execute. ------------------------------------------------------------
  // Every loop below is check-before-act: a run interrupted part-way (an
  // EPERM/EBUSY rename under Defender or OneDrive is ordinary on Windows)
  // must be resumable, never an ENOENT trap, and must never duplicate or
  // overwrite what a previous run already did.
  await fs.mkdir(paths.areasRoot, { recursive: true });
  await store.setBoard(board); // pins the area prefixes

  const legacyFile = (item: Item): string => {
    const dir =
      item.type === "ticket" ? paths.tickets : item.type === "plan" ? paths.plans : paths.research;
    return path.join(dir, `${item.id}.md`);
  };

  let resumed = false;

  for (const t of tickets) {
    const dest = ticketDestFile.get(t.id)!;
    const dir = path.dirname(dest);
    const src = legacyFile(t);
    const destExists = await pathExists(dest);
    const srcExists = await pathExists(src);
    if (destExists && srcExists) {
      report.notes.push(
        `${t.id} already exists at its v2 location; the legacy copy at ` +
          `${path.relative(paths.kanmer, src)} was left in place — compare and delete it by hand.`,
      );
      resumed = true;
      continue; // never overwrite
    }
    if (destExists) {
      resumed = true;
      continue; // a prior run moved it
    }
    if (!srcExists) {
      report.notes.push(`${t.id} has no file at either its legacy or its v2 location — skipped.`);
      continue; // note, don't ENOENT
    }
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(src, dest);
  }

  for (const f of folds) {
    const folder = ticketDest.get(f.ticket.id) ?? NO_AREA_DIR;
    const dir = ticketDirIn(paths, folder === NO_AREA_DIR ? "" : f.ticket.area ?? "", f.ticket.id);
    const target = path.join(dir, `${f.as}.md`);
    const content = `# ${f.doc.title}\n\n${f.doc.body.trim()}\n`;
    if (await pathExists(target)) {
      const existing = await readText(target);
      if (existing.includes(content.trim())) {
        // A prior run wrote the doc but crashed before removing the legacy
        // source, so it re-entered `folds`. Appending again would duplicate
        // the content below a separator.
        report.notes.push(
          `${f.ticket.id}'s ${f.as}.md already holds "${f.doc.id}" — left as it was.`,
        );
        resumed = true;
        await fs.rm(legacyFile(f.doc), { force: true });
        continue;
      }
      await writeFileAtomic(target, `${existing.trimEnd()}\n\n---\n\n${content}`);
      report.notes.push(
        `${f.ticket.id} already had a ${f.as}.md — "${f.doc.id}" was appended below a separator.`,
      );
    } else {
      await writeFileAtomic(target, content);
    }
    await fs.rm(legacyFile(f.doc), { force: true });
  }

  for (const c of conversions) {
    const label = c.type === "plan" ? "legacy-plan" : "legacy-research";
    const destFile = conversionDest.get(c.id)!;
    if (await pathExists(destFile)) {
      let already = false;
      try {
        const existing = parseItem(await readText(destFile));
        already = existing.id === c.id && (existing.labels ?? []).includes(label);
      } catch {
        // Unparseable: fall through and rewrite it. The pre-flight has
        // already proven no other source claims this path.
      }
      if (already) {
        report.notes.push(`${c.id} was already converted to a ticket — left as it was.`);
        resumed = true;
        await fs.rm(legacyFile(c), { force: true });
        continue;
      }
    }
    // Last line of defence: never overwrite a file this run already wrote,
    // even if the pre-flight above is later refactored away.
    if (claimedBy.get(destFile) !== sourceKey(c)) {
      report.notes.push(
        `${sourceKey(c)} was not converted — ${destFile} is already claimed by ` +
          `${claimedBy.get(destFile)}. The legacy file was left in place.`,
      );
      continue;
    }
    const converted: Item = {
      ...c,
      type: "ticket",
      labels: [...new Set([...(c.labels ?? []), label])],
    };
    await fs.mkdir(path.dirname(destFile), { recursive: true });
    await writeFileAtomic(destFile, serialiseItem(converted));
    await fs.rm(legacyFile(c), { force: true });
  }

  // ---- Folded ids no longer name anything: sweep them out of links/blocks.
  // Runs after the move/fold/conversion loops so store.updateItem resolves
  // every item at its final v2 path. Conversions survive as tickets, so only
  // `folds` produce an id that has genuinely vanished.
  const foldedIds = new Set(folds.map((f) => f.doc.id));
  if (foldedIds.size > 0) {
    const cleaned: string[] = [];
    const bodyRefs: string[] = [];
    // Mirrors deleteItem's cleanup (store.ts) deliberately, rather than
    // sharing code: extracting a helper would mean refactoring the store's
    // most-exercised destructive path. Filed as a deferred tidy-up.
    for (const item of await store.listItems({ includeArchived: true })) {
      const links = (item.links ?? []).filter((l) => !foldedIds.has(l));
      const blocks = (item.blocks ?? []).filter((b) => !foldedIds.has(b));
      const patch: UpdateItemPatch = {};
      if (links.length !== (item.links ?? []).length) patch.links = links;
      if (blocks.length !== (item.blocks ?? []).length) patch.blocks = blocks;
      if (Object.keys(patch).length > 0) {
        await store.updateItem(item.id, patch);
        cleaned.push(item.id);
      }
      // Body [[wiki]] mentions are prose — follow deleteItem's precedent and
      // report them rather than rewriting a human's sentences.
      if (parseWikiLinks(item.body).some((id) => foldedIds.has(id))) bodyRefs.push(item.id);
    }
    if (cleaned.length) {
      report.notes.push(`Removed folded ids from links/blocks on: ${cleaned.join(", ")}.`);
    }
    if (bodyRefs.length) {
      report.notes.push(
        `[[wiki]] mentions of folded documents were left as prose in: ${bodyRefs.join(", ")}.`,
      );
    }
  }

  if (resumed) {
    report.notes.push(
      "This run resumed a previously interrupted migration — already-migrated items were left as they were.",
    );
  }

  // Legacy dirs: only removed when empty — anything a human left in there
  // stays put and gets a note instead of being deleted.
  for (const dir of [paths.tickets, paths.plans, paths.research]) {
    try {
      await fs.rmdir(dir);
    } catch {
      if (await pathExists(dir)) {
        report.notes.push(
          `${path.basename(dir)}/ still has non-item files — left in place, remove it by hand.`,
        );
      }
    }
  }

  // Counters re-keyed by prefix, from what's actually on disk now.
  const counters: Record<string, number> = {};
  for (const item of [...tickets, ...conversions]) {
    const m = /^(.+)-(\d+)$/.exec(item.id);
    if (m) counters[m[1]] = Math.max(counters[m[1]] ?? 0, Number(m[2]));
  }
  for (const prefix of Object.values(report.areaPrefixes)) {
    counters[prefix] ??= 0;
  }
  counters[board.idPrefixes.ticket] ??= 0;
  await writeFileAtomic(paths.countersFile, `${JSON.stringify(counters, null, 2)}\n`);

  await writeVersion(paths, {
    format: 2,
    migratedFrom: 1,
    migratedAt: new Date().toISOString(),
  });
  store.resetFormatCache();
  // Migrated boards land on the 7-stage default (alias-aware, additive).
  const backfill = await backfillStages(store);
  if (backfill.addedStages.length > 0) {
    report.notes.push(`Backfilled workflow stages: ${backfill.addedStages.join(", ")}.`);
  }
  return report;
}

/**
 * The canonical 7-stage pipeline, each with the near-synonyms a hand-made board
 * might already use. A canonical stage counts as *present* when the board has a
 * status with its id **or** one of its aliases — so backfill never adds a second
 * near-duplicate (a `[todo, doing, shipped]` board keeps those three and gains
 * the middle stages, not a second final column).
 */
const CANONICAL_STAGES: { id: string; name: string; aliases: string[] }[] = [
  { id: "backlog", name: "Backlog", aliases: ["todo", "to-do", "to_do", "inbox"] },
  { id: "researching", name: "Researching", aliases: ["research", "discovery", "discover"] },
  { id: "planning", name: "Planning", aliases: ["plan", "design", "designing"] },
  {
    id: "implementing",
    name: "Implementing",
    aliases: ["doing", "in-progress", "in_progress", "inprogress", "wip", "development", "dev"],
  },
  { id: "review", name: "Review", aliases: ["in-review", "reviewing", "pr", "code-review"] },
  { id: "verifying", name: "Verifying", aliases: ["verify", "qa", "testing", "test"] },
  {
    id: "done",
    name: "Done",
    aliases: ["complete", "completed", "shipped", "closed", "released"],
  },
];

export interface BackfillReport {
  /** Canonical stage ids inserted (empty on a board already covering all seven). */
  addedStages: string[];
}

/**
 * v→3 status aliases (FRD-007 M2a). Case-insensitive and trimmed; the v2 seven
 * collapse into the six, with Researching and Planning both landing in
 * Preparing. Anything unmatched goes to Backlog with a `needs-restage` label
 * rather than being guessed at — a wrong stage is worse than an obvious one.
 */
const STAGE_ALIASES: Record<string, StageId> = {
  backlog: "backlog", todo: "backlog", "to do": "backlog", "to-do": "backlog",
  "to_do": "backlog", "not started": "backlog", inbox: "backlog", new: "backlog",
  preparing: "preparing", researching: "preparing", research: "preparing",
  planning: "preparing", plan: "preparing", discovery: "preparing", design: "preparing",
  designing: "preparing", groom: "preparing", grooming: "preparing",
  implementing: "implementing", "in progress": "implementing", "in-progress": "implementing",
  "in_progress": "implementing", inprogress: "implementing", doing: "implementing",
  wip: "implementing", development: "implementing", dev: "implementing", building: "implementing",
  review: "review", reviewing: "review", "in review": "review", "in-review": "review",
  "code review": "review", "code-review": "review", pr: "review",
  verifying: "verifying", verify: "verifying", qa: "verifying", testing: "verifying",
  test: "verifying", validating: "verifying",
  done: "done", complete: "done", completed: "done", shipped: "done", closed: "done",
  released: "done", finished: "done",
};

/** Label stamped on a ticket whose old stage had no mapping. */
export const NEEDS_RESTAGE = "needs-restage";

/** Where each loose v2 document moves under format 3 (FRD-007 M2c). */
const DOC_MOVES: Record<string, string> = {
  "research.md": "research/research.md",
  // The one rename: v2's `impact` becomes `files`, because the doc maps where
  // the change lands, and "impact" kept being read as "consequences".
  "impact.md": "files/impact.md",
  "plan.md": "plan/plan.md",
  "checklist.md": "checklist/checklist.md",
  "open-questions.md": "open-questions/open-questions.md",
  "post-implementation-report.md": "post-implementation-report/post-implementation-report.md",
  "proof.md": "proof/proof.md",
};

export interface V3Report {
  alreadyV3: boolean;
  dryRun: boolean;
  /** Old status → new stage, with how many tickets took that path. */
  stageMapping: { from: string; to: string; count: number }[];
  /** Tickets whose status had no alias: sent to Backlog + labelled. */
  needsRestage: { id: string; from: string }[];
  /** Loose documents relocated into their type folder. */
  docMoves: { id: string; from: string; to: string }[];
  /** Tickets that had `priority:` stripped. */
  prioritiesStripped: number;
  /** Profile assigned per ticket, counted (FRD-002 implementation note). */
  profileAssignments: { profile: string; count: number }[];
  /** True when an earlier interrupted run had already migrated some tickets. */
  resumed: boolean;
  /** Stale atomic-write temp files removed (residue of an interrupted run). */
  sweptTempFiles: number;
  /** Things that must be resolved by hand before applying. */
  blockers: string[];
  notes: string[];
}

/**
 * Backfill the 7-stage default onto an existing board: for every canonical stage
 * the board lacks (alias-aware presence test), insert it after the nearest
 * preceding present stage. Additive only — existing stages are never renamed,
 * reordered or removed, no item file is ever touched, and a board that already
 * covers all seven is a no-op. Idempotent: a second run adds nothing.
 *
 * The document model is *not* materialised here: `resolveDocTypes`/`resolveGates`
 * fall back to the shipped defaults when a board omits `docs`, so a backfilled
 * board already has the default gates on without pinning a copy into board.yml.
 */
export async function backfillStages(
  store: KanmerStore,
  opts: { dryRun?: boolean } = {},
): Promise<BackfillReport> {
  const board = await store.getBoard();
  const statuses = [...(board.statuses ?? [])];
  if (statuses.length === 0) return { addedStages: [] }; // format 3: no statuses to backfill
  const findIdx = (canon: (typeof CANONICAL_STAGES)[number]): number =>
    statuses.findIndex((s) => s.id === canon.id || canon.aliases.includes(s.id));
  const added: string[] = [];
  let prevIdx = -1; // board index of the last canonical stage seen present/inserted
  for (const canon of CANONICAL_STAGES) {
    const idx = findIdx(canon);
    if (idx !== -1) {
      prevIdx = idx;
      continue;
    }
    const insertAt = prevIdx + 1;
    statuses.splice(insertAt, 0, { id: canon.id, name: canon.name });
    added.push(canon.id);
    prevIdx = insertAt;
  }
  if (!opts.dryRun && added.length > 0) {
    board.statuses = statuses;
    await store.setBoard(board);
  }
  return { addedStages: added };
}

/** Map a legacy status onto one of the six, or null when nothing fits. */
export function mapStage(status: string): StageId | null {
  const key = status.trim().toLowerCase();
  if (isStageId(key)) return key;
  return STAGE_ALIASES[key] ?? null;
}

/**
 * v→3: the single migration that batches fixed stages, folder documents and
 * priority removal (ADR-0008).
 *
 * One migration rather than three because all three rewrite the same ticket
 * files — three passes would mean three prompts and three chances to
 * half-migrate. Carries forward every v1→v2 behaviour that earned its place:
 * dry-run parity, blockers surfaced before any write, per-file check-before-act
 * so an interrupted run resumes, and idempotence so a second run is a no-op.
 */
export async function migrateToV3(
  store: KanmerStore,
  opts: { dryRun?: boolean } = {},
): Promise<V3Report> {
  const dryRun = opts.dryRun ?? false;
  const report: V3Report = {
    alreadyV3: false,
    dryRun,
    resumed: false,
    sweptTempFiles: 0,
    stageMapping: [],
    needsRestage: [],
    docMoves: [],
    prioritiesStripped: 0,
    profileAssignments: [],
    blockers: [],
    notes: [],
  };

  if ((await store.detectFormat()) === 3) {
    report.alreadyV3 = true;
    return report;
  }

  const items = await store.listItems({ includeArchived: true });
  const mapping = new Map<string, { to: string; count: number }>();
  const profiles = new Map<string, number>();

  for (const summary of items) {
    const item = await store.getItem(summary.id);
    if (!item) continue;
    const loc = await (store as unknown as {
      locateItem(id: string): Promise<{ kind: string; dir?: string; file: string } | null>;
    }).locateItem(item.id);
    if (!loc || loc.kind !== "v2" || !loc.dir) {
      report.blockers.push(`${item.id} is still in the legacy format-1 layout — migrate to format 2 first.`);
      continue;
    }

    // (a)(b) stage mapping
    const mapped = mapStage(item.status);
    const to = mapped ?? "backlog";
    const key = item.status || "(empty)";
    const entry = mapping.get(key) ?? { to, count: 0 };
    entry.count++;
    mapping.set(key, entry);
    if (!mapped) report.needsRestage.push({ id: item.id, from: item.status });

    // (c) loose documents into their type folders
    for (const [from, dest] of Object.entries(DOC_MOVES)) {
      if (await pathExists(path.join(loc.dir, from))) {
        report.docMoves.push({ id: item.id, from, to: dest });
      }
    }
    for (const name of await listDirSafe(loc.dir)) {
      if (name.startsWith(SCRATCH_PREFIX) && name.endsWith(".md")) {
        report.docMoves.push({
          id: item.id,
          from: name,
          to: `scratch/${name.slice(SCRATCH_PREFIX.length)}`,
        });
      }
    }

    // (d) priority
    if ((item as Record<string, unknown>).priority !== undefined) report.prioritiesStripped++;

    // (f) profiles — active work owes the full pipeline; finished work owes
    // nothing retroactively, which is what makes historical backfill painless.
    const profile = item.archived || to === "done" ? "custom" : "feature";
    profiles.set(profile, (profiles.get(profile) ?? 0) + 1);
  }

  report.stageMapping = [...mapping].map(([from, v]) => ({ from, to: v.to, count: v.count }));
  report.profileAssignments = [...profiles].map(([profile, count]) => ({ profile, count }));
  if (report.needsRestage.length) {
    report.notes.push(
      `${report.needsRestage.length} ticket(s) had a status with no mapping; they move to Backlog and are labelled "${NEEDS_RESTAGE}".`,
    );
  }

  if (dryRun || report.blockers.length) return report;

  // ---- apply -------------------------------------------------------------
  let resumed = false;
  for (const summary of items) {
    const item = await store.getItem(summary.id);
    if (!item) continue;
    const loc = await (store as unknown as {
      locateItem(id: string): Promise<{ kind: string; dir?: string; file: string } | null>;
    }).locateItem(item.id);
    if (!loc || loc.kind !== "v2" || !loc.dir) continue;

    // Documents first: a half-applied run that already moved them must not
    // move them twice, so every step checks before acting.
    for (const [from, dest] of Object.entries(DOC_MOVES)) {
      const src = path.join(loc.dir, from);
      if (!(await pathExists(src))) continue;
      const target = path.join(loc.dir, ...dest.split("/"));
      await ensureDir(path.dirname(target));
      if (!(await pathExists(target))) await fs.rename(src, target);
    }
    for (const name of await listDirSafe(loc.dir)) {
      if (!name.startsWith(SCRATCH_PREFIX) || !name.endsWith(".md")) continue;
      const src = path.join(loc.dir, name);
      const target = path.join(loc.dir, "scratch", name.slice(SCRATCH_PREFIX.length));
      await ensureDir(path.dirname(target));
      if (!(await pathExists(target))) await fs.rename(src, target);
    }

    // Already in its final shape from an earlier run: skip the write entirely.
    //
    // The rewrite below is content-idempotent — a second run produces identical
    // bytes — but it is not I/O-idempotent, and that is the difference between
    // a retry that converges and one that restarts. Without this, a run that
    // failed at ticket 200 of 242 rewrites the 199 already-correct tickets
    // before reaching the one that failed, taking a fresh chance of an EPERM on
    // every one. Observed on a real board: three attempts, each dying earlier
    // than the last.
    //
    // The test is per ticket, not `detectFormat()`. The format stamp is
    // whole-board and deliberately written last, so it cannot distinguish a
    // half-migrated board from an untouched one — the exact gap the v1→v2
    // review named and this migration reproduced.
    if (item.profile !== undefined && (item as { priority?: unknown }).priority === undefined) {
      resumed = true;
      continue;
    }

    const mapped = mapStage(item.status);
    const to = mapped ?? "backlog";
    const next: Record<string, unknown> = { ...item, status: to };
    delete next.priority;
    if (!mapped && !(item.labels ?? []).includes(NEEDS_RESTAGE)) {
      next.labels = [...(item.labels ?? []), NEEDS_RESTAGE];
    }
    if (next.profile === undefined) {
      next.profile = item.archived || to === "done" ? "custom" : "feature";
      if (next.profile === "custom") next.requires = {};
    }
    await writeFileAtomic(loc.file, serialiseItem(next as unknown as Item));
  }

  if (resumed) {
    report.resumed = true;
    report.notes.push(
      "This run resumed a previously interrupted migration — tickets already in " +
        "their format-3 shape were left untouched rather than rewritten.",
    );
  }

  report.sweptTempFiles = await sweepStaleTemps(store.paths.kanmer);
  if (report.sweptTempFiles > 0) {
    report.notes.push(
      `Removed ${report.sweptTempFiles} stale atomic-write temp file(s) left by an ` +
        `interrupted run.`,
    );
  }

  // (e) board.yml: the legacy dimensions out, the v3 vocabulary in.
  const board = await store.getBoard();
  const next = { ...board };
  // repoDocs survives the reshape: it is still how a ref is classified as a
  // governing doc (FRD-002 P4), and dropping it would silently revert a board
  // to the shipped globs — which classify nothing on a docs-template tree.
  next.repoDocs ??= board.docs?.repoDocs;
  delete next.statuses;
  delete next.priorities;
  delete next.docs;
  if (next.repoDocs === undefined) delete next.repoDocs;
  next.profiles ??= structuredClone(DEFAULT_PROFILES) as Record<string, ProfileMap>;
  next.defaultProfile ??= DEFAULT_PROFILE_ID;
  next.groupKinds ??= structuredClone(DEFAULT_GROUP_KINDS);
  next.proofTypes ??= [...DEFAULT_PROOF_TYPES];
  await store.setBoard(next);

  await writeVersion(store.paths, {
    format: 3,
    migratedFrom: 2,
    migratedAt: new Date().toISOString(),
  });
  store.resetFormatCache();
  return report;
}

/**
 * Remove atomic-write temp files an interrupted run left behind.
 *
 * Only files older than this are touched. A temp younger than that may belong
 * to a write happening right now — in another process, or the GUI's own — and
 * deleting it would turn someone else's successful write into an ENOENT.
 */
const STALE_TEMP_MS = 60_000;

/**
 * Sweep `.tmp-<pid>-<n>` residue beneath `.kanmer`.
 *
 * Hygiene, not correctness: the files are invisible to item discovery
 * (`store.ts` looks for `<folder>/<folder>.md`), to document scans
 * (`docpaths.ts` filters to `.md`) and to the watcher (`watch.ts` ignores the
 * pattern). What they are *not* is gitignored, so a board on the sync timer
 * would commit them.
 *
 * Never throws: a failure to tidy must not fail a migration that otherwise
 * succeeded.
 */
async function sweepStaleTemps(kanmerDir: string): Promise<number> {
  const cutoff = Date.now() - STALE_TEMP_MS;
  let swept = 0;
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (TMP_FILE_RE.test(e.name)) {
        try {
          const st = await fs.stat(full);
          if (st.mtimeMs < cutoff) {
            await fs.rm(full, { force: true });
            swept++;
          }
        } catch {
          // Vanished, or locked by whatever left it. Either way, not our problem.
        }
      }
    }
  }
  await walk(kanmerDir);
  return swept;
}

/** Directory listing that treats "missing" as "empty". */
async function listDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

/**
 * The umbrella upgrade: bring a board fully current. v1→v2 when needed, then
 * v→3. `dryRun` reports what each step would do without writing; callers must
 * surface that preview before applying (the GUI prompt, or `migrate_board`).
 */
export async function migrateBoard(
  store: KanmerStore,
  opts: { dryRun?: boolean; fallbackFingerprint?: string } = {},
): Promise<{ v2: MigrationReport; backfill: BackfillReport; v3: V3Report; identity: IdentityReport }> {
  const dryRun = opts.dryRun ?? false;
  const v2 = await migrateToV2(store, { dryRun });
  const backfill = await backfillStages(store, { dryRun });
  const v3 = await migrateToV3(store, { dryRun });
  const identity = await migrateIdentity(store, { dryRun, fallbackFingerprint: opts.fallbackFingerprint });
  return { v2, backfill, v3, identity };
}

/** What the one-time logical-identity migration did (or would do) — FRD-029. */
export interface IdentityReport {
  /** True when a `project.json` was written by this call. */
  allocated: boolean;
  /** A dry run's answer to "would a real run allocate?". */
  wouldAllocate: boolean;
  project_id: string | null;
  origin: "generated" | "migrated" | null;
}

/**
 * The identity step is independent of the storage format: a format-3 board
 * that predates FRD-029 still needs it, so it runs even when every other step
 * reports "already current". A dry run never writes.
 */
export async function migrateIdentity(
  store: KanmerStore,
  opts: { dryRun?: boolean; fallbackFingerprint?: string } = {},
): Promise<IdentityReport> {
  const existing = await store.getProject();
  if (existing) {
    return { allocated: false, wouldAllocate: false, project_id: existing.project_id, origin: existing.origin };
  }
  if (opts.dryRun) return { allocated: false, wouldAllocate: true, project_id: null, origin: null };
  const { record, allocated } = await store.ensureProject({
    origin: "migrated",
    fallbackFingerprint: opts.fallbackFingerprint,
  });
  return { allocated, wouldAllocate: false, project_id: record.project_id, origin: record.origin };
}
