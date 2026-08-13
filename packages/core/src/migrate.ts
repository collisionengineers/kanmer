import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import { areaFolderName, NO_AREA_DIR, ticketDirIn, type KanmerPaths } from "./paths.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { parseWikiLinks } from "./links.js";
import { areaPrefix } from "./board.js";
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
  if ((await store.detectFormat()) === 2) return emptyReport(dryRun, true);

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
  return report;
}
