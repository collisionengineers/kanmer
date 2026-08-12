import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import { areaFolderName, NO_AREA_DIR, ticketDirIn, type KanmerPaths } from "./paths.js";
import { serialiseItem } from "./frontmatter.js";
import { parseWikiLinks } from "./links.js";
import { areaPrefix } from "./board.js";
import { writeVersion } from "./version.js";
import type { KanmerStore } from "./store.js";
import type { Item } from "./types.js";

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
  if (dryRun) return report;

  // ---- Execute. ------------------------------------------------------------
  await fs.mkdir(paths.areasRoot, { recursive: true });
  await store.setBoard(board); // pins the area prefixes

  const legacyFile = (item: Item): string => {
    const dir =
      item.type === "ticket" ? paths.tickets : item.type === "plan" ? paths.plans : paths.research;
    return path.join(dir, `${item.id}.md`);
  };

  for (const t of tickets) {
    const dir = ticketDirIn(paths, ticketDest.get(t.id) === NO_AREA_DIR ? "" : t.area ?? "", t.id);
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(legacyFile(t), path.join(dir, `${t.id}.md`));
  }

  for (const f of folds) {
    const folder = ticketDest.get(f.ticket.id) ?? NO_AREA_DIR;
    const dir = ticketDirIn(paths, folder === NO_AREA_DIR ? "" : f.ticket.area ?? "", f.ticket.id);
    const target = path.join(dir, `${f.as}.md`);
    const content = `# ${f.doc.title}\n\n${f.doc.body.trim()}\n`;
    if (await pathExists(target)) {
      const existing = await readText(target);
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
    const folder = destAreaFolder(c, report.notes);
    const dir = ticketDirIn(paths, folder === NO_AREA_DIR ? "" : c.area ?? "", c.id);
    const converted: Item = {
      ...c,
      type: "ticket",
      labels: [...new Set([...(c.labels ?? []), label])],
    };
    await fs.mkdir(dir, { recursive: true });
    await writeFileAtomic(path.join(dir, `${c.id}.md`), serialiseItem(converted));
    await fs.rm(legacyFile(c), { force: true });
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
