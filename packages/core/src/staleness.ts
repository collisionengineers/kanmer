// Is this repo's Kanmer as new as the Kanmer that is talking to it?
//
// [[MCP-012]] answered "which build is answering" and deliberately stopped
// there: it reports, it does not judge, because judging needs a known-good
// reference to compare against. This is that judgement — the *other* half of
// the same question, and the reason it is a separate module: MCP-012 asks about
// the binary, this asks about everything the binary left behind in a repo.
//
// `.kanmer/version.json` records the storage **format** and nothing else, and
// migration moves ticket structure and nothing else. A repo carries far more
// than ticket structure — the installed skills, the AGENTS.md managed block,
// `board.yml`, the provider MCP registrations — and none of it migrates. A repo
// set up on 0.3.2 keeps 0.3.2's skills and AGENTS block indefinitely while the
// agent talks to a newer server, and until now nothing said so.
//
// Two rules govern everything below, and both are about *not* crying wolf:
//
//  1. **Nothing here throws.** `get_status` is the orientation call every
//     session opens with. A broken orientation call is worse than a
//     partially-unknown one, so every read is wrapped and a failure becomes
//     `state: "unknown"` for that artefact alone.
//  2. **A false positive kills the feature.** A report that warns on every
//     healthy repo is a report nobody reads. That is what `compensated` is for,
//     and why the skills walk goes bundled-tree-first (see `skillRows`).

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { BoardConfig, BoardSource } from "./types.js";
import type { KanmerPaths } from "./paths.js";
import { CURRENT_FORMAT } from "./version.js";

/** The single portable Codex registration contract shared with GUI Connect. */
export const CODEX_PORTABLE_COMMAND = "& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')";
export const CODEX_PORTABLE_ARGS = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", CODEX_PORTABLE_COMMAND] as const;

/**
 * How out-of-date an artefact is — and, just as importantly, whether the user
 * should do anything about it.
 *
 * - `behind` — genuinely older than what this Kanmer ships. **Act.** This is
 *   the only state that clears `upToDate`.
 * - `compensated` — the file is behind, and the runtime already papers over it.
 *   Informational. The load-bearing case is `board.yml` omitting
 *   `questions-resolved`: `resolveProfiles()` injects it at read time, so
 *   **every board in existence** is in this state, and reporting it as `behind`
 *   would put a permanent warning on every `get_status` call.
 * - `unstamped` — no evidence either way. An absent AGENTS.md block or an
 *   absent `.kanmer-skills-version` is an absence of evidence, not evidence of
 *   staleness.
 * - `unknown` — could not be read or no reference was available to compare
 *   against. Reported rather than swallowed, because "I could not check" and
 *   "I checked and it is fine" are different answers.
 */
export type StaleState = "behind" | "compensated" | "unstamped" | "unknown";

/** One artefact's verdict. Never a bare boolean — the ticket's whole point. */
export interface StaleEntry {
  /** Which artefact: `agents-block` | `skills` | `skills-stamp` | `board-config` | `mcp-registration`. */
  artefact: string;
  state: StaleState;
  /** One line a human or an agent can act on, naming what specifically differs. */
  detail: string;
  /** What to run. Always a *pointer*: this module never repairs anything. */
  fix: string;
}

/** The `repo` block `get_status` returns. */
export interface RepoStaleness {
  /**
   * True iff **no** entry is `behind`.
   *
   * `compensated`, `unstamped` and `unknown` deliberately do not clear it. If
   * they did, the flag would be false on every repo forever and would carry no
   * information at all.
   */
  upToDate: boolean;
  stale: StaleEntry[];
}

export interface StalenessInput {
  paths: KanmerPaths;
  /** The board as parsed. Passed in because `get_status` has already read it. */
  board: BoardConfig;
  /** `"default"` means there is no `board.yml`; a synthesized board cannot be stale. */
  boardSource: BoardSource;
  /**
   * The board's storage format, as `get_status` already reports it. Used only
   * to decide whether a dead key is a migration escapee: on a format-2 board
   * `priorities:` is simply that board's shape, and the format banner is
   * already telling the user what to do about it.
   */
  format: number;
  /**
   * The skills tree this build ships, i.e. the known-good reference — resolved
   * by the caller from the running script's own path (see
   * `packages/mcp-server/src/bundled.ts`). `null` when it could not be located,
   * which yields `unknown` rather than silence.
   */
  bundledSkillsDir: string | null;
}

// ---------------------------------------------------------------------------
// The markers, and the artefact locations.
// ---------------------------------------------------------------------------

/**
 * The AGENTS.md managed-block markers.
 *
 * Duplicated from `scripts/agents-block.mjs` because that script is not shipped
 * with the server, and because the markers are the one part of the block that
 * is genuinely frozen: changing them would orphan the block in every repo that
 * already has one, so they are a stable contract rather than a moving copy.
 * The block **body** is emphatically not duplicated — see `referenceBlockBody`.
 */
const BLOCK_START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
const BLOCK_END = "<!-- kanmer:instructions:end -->";

/**
 * The repo-relative locations Connect owns and the staleness detector checks.
 *
 * Core must own this small catalog: it is the surface that judges whether a
 * registration or copied-skill destination has drifted, while Electron's
 * provider registry supplies the commands and file-format handlers. Keeping
 * the paths here lets the GUI consume them without core importing Electron.
 * Claude's `.mcp.json` is legacy registration coverage, not a skills location.
 */
export const STALENESS_PROVIDER_PATHS = {
  claude: { registrationFile: ".mcp.json" },
  codex: { registrationFile: ".codex/config.toml" },
  opencode: { registrationFile: "opencode.json", skillsDir: ".opencode/skills" },
  grok: { registrationFile: ".grok/config.toml", skillsDir: ".grok/skills" },
  antigravity: { registrationFile: ".agents/mcp_config.json", skillsDir: ".agents/skills" },
} as const;

/** Where Kanmer itself copies project-scoped skills, relative to the repo root. */
export const SKILL_DESTINATIONS: readonly string[] = [
  STALENESS_PROVIDER_PATHS.opencode.skillsDir,
  STALENESS_PROVIDER_PATHS.antigravity.skillsDir,
  STALENESS_PROVIDER_PATHS.grok.skillsDir,
];

/** The stamp `installSkills` writes into a destination it copied into. */
export const SKILLS_STAMP_FILE = ".kanmer-skills-version";

/**
 * Skills Kanmer used to install and no longer does — retired by commit
 * `130f837`. Mirrors `RETIRED_SKILL_PATHS` in `providers.ts`, and like that
 * list it is **closed**: everything retired from here on is covered by the
 * recorded roster. Reported only; removing them is [[GUI-080]]'s job.
 */
const RETIRED_SKILL_PATHS: readonly string[] = [
  "kanmer-import",
  "kanmer-research/assets/impact-template.md",
];

/** Config files that may carry a Kanmer MCP registration, including Claude's legacy path. */
export const REGISTRATION_FILES: readonly string[] = [
  STALENESS_PROVIDER_PATHS.claude.registrationFile,
  STALENESS_PROVIDER_PATHS.codex.registrationFile,
  STALENESS_PROVIDER_PATHS.grok.registrationFile,
  STALENESS_PROVIDER_PATHS.opencode.registrationFile,
  STALENESS_PROVIDER_PATHS.antigravity.registrationFile,
];

// ---------------------------------------------------------------------------
// Small helpers. All synchronous and all total: a failure is a value, never a
// throw, because rule 1 at the top of this file has no exceptions.
// ---------------------------------------------------------------------------

/** Read a file as text, or null. Never throws. */
function readOrNull(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** Is this a directory? Never throws. */
function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function exists(p: string): boolean {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * sha256 of a file's text with line endings normalised.
 *
 * The normalisation is not cosmetic. `.gitattributes` checks this repo out with
 * LF, but a skill copied into a user's repo by another tool — or edited in an
 * editor that rewrites endings — can arrive with CRLF and be byte-different
 * while being textually identical. Reporting that as drift would be a false
 * positive of exactly the kind rule 2 forbids.
 */
function digest(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

/** Every file under `dir`, as repo-relative POSIX paths. Never throws. */
function walkFiles(dir: string, base = dir, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

/** The first path segment of a relative path — the skill folder it belongs to. */
function skillFolderOf(rel: string): string {
  return rel.split("/")[0] ?? rel;
}

/** Join at most a handful of names into a readable list, eliding the tail. */
function nameList(names: readonly string[], max = 4): string {
  const sorted = [...new Set(names)].sort();
  if (sorted.length <= max) return sorted.join(", ");
  return `${sorted.slice(0, max).join(", ")} and ${sorted.length - max} more`;
}

// ---------------------------------------------------------------------------
// The reference: what this build says a repo *should* contain.
// ---------------------------------------------------------------------------

/**
 * The canonical AGENTS.md block body, taken from the bundled
 * `kanmer-setup/SKILL.md`.
 *
 * **This is why nothing here hardcodes the block text.** The body is a moving
 * target — [[SKILL-013]] is rewriting it right now — so a literal copy in this
 * file would be stale the moment it landed, and a detector whose reference is
 * stale reports the opposite of the truth. Reading it out of the bundle means
 * the reference moves with the product, automatically, with no code change
 * here.
 *
 * The extraction is safe because it is already rail-enforced:
 * `scripts/verify-agents-block.mjs` check 7 asserts that this very file carries
 * `BLOCK_BODY` verbatim between these two markers, so the span this function
 * returns is byte-identical to `scripts/agents-block.mjs`'s canonical constant
 * or the release is red.
 *
 * Returns null when the bundled skill is not there, which becomes `unknown` —
 * never `behind`. Guessing at a body we could not read would flag every repo.
 */
export function referenceBlockBody(bundledSkillsDir: string | null): string | null {
  if (!bundledSkillsDir) return null;
  const skill = readOrNull(path.join(bundledSkillsDir, "kanmer-setup", "SKILL.md"));
  if (skill === null) return null;
  return blockBodyOf(skill);
}

/**
 * The span between the two markers, or null when the text is not marked or is
 * marked malformed (END before START, or only one of the two).
 *
 * `applyManagedBlock` throws on a malformed pair; here it is a null, because a
 * half-marked file is something to *report*, not something to fail on.
 */
function blockBodyOf(text: string): string | null {
  const startAt = text.indexOf(BLOCK_START);
  const endAt = text.indexOf(BLOCK_END);
  if (startAt === -1 || endAt === -1 || endAt < startAt) return null;
  return text
    .slice(startAt + BLOCK_START.length, endAt)
    .replace(/^\r?\n/, "")
    .replace(/\r?\n$/, "");
}

/** Are both markers present, in either order? Distinguishes "absent" from "malformed". */
function hasEitherMarker(text: string): boolean {
  return text.includes(BLOCK_START) || text.includes(BLOCK_END);
}

// ---------------------------------------------------------------------------
// The rows.
// ---------------------------------------------------------------------------

const SETUP_FIX = "run kanmer-setup (it reconciles; FRD-013)";

/**
 * The AGENTS.md managed block.
 *
 * Read from **`repoRoot`, not `projectRoot`**. When the board lives on its own
 * branch it sits at `<repo>/.worktrees/kanmer`, while AGENTS.md stays in the
 * checkout — getting this backwards reports `unstamped` on every worktree
 * board, which is most of them.
 *
 * This row has a real motivating case, not a hypothetical one: Connect wrote a
 * stale **v2** block over this repo's own AGENTS.md — seven stages, `impact.md`,
 * the deleted `-import` skill — during the run that produced this ticket
 * (CORE-023 `scratch-live-reproduction`). Kanmer's own tooling can downgrade a
 * correct AGENTS.md to instructions that misroute any agent reading them, and
 * nothing noticed. This notices. The *cause* is [[SKILL-013]]'s to fix.
 */
function agentsBlockRow(repoRoot: string, reference: string | null): StaleEntry | null {
  const file = path.join(repoRoot, "AGENTS.md");
  const text = readOrNull(file);

  if (text === null) {
    if (exists(file)) {
      return {
        artefact: "agents-block",
        state: "unknown",
        detail: `AGENTS.md exists at ${repoRoot} but could not be read.`,
        fix: "check the file's permissions, then re-run get_status",
      };
    }
    return {
      artefact: "agents-block",
      state: "unstamped",
      detail: "No AGENTS.md — Kanmer's operating instructions are not installed in this repo.",
      fix: SETUP_FIX,
    };
  }

  const body = blockBodyOf(text);
  if (body === null) {
    if (hasEitherMarker(text)) {
      return {
        artefact: "agents-block",
        state: "unknown",
        detail:
          "AGENTS.md has a malformed kanmer:instructions block (one marker, or end before start), " +
          "so its body cannot be compared.",
        fix: "fix or remove the markers by hand, then run kanmer-setup",
      };
    }
    return {
      artefact: "agents-block",
      state: "unstamped",
      detail: "AGENTS.md carries no kanmer:instructions block.",
      fix: SETUP_FIX,
    };
  }

  if (reference === null) {
    return {
      artefact: "agents-block",
      state: "unknown",
      detail:
        "AGENTS.md carries a managed block, but this server could not locate its own bundled " +
        "kanmer-setup skill to compare it against.",
      fix: "no action — the block may well be current",
    };
  }

  if (digest(body) === digest(reference)) return null;
  return {
    artefact: "agents-block",
    state: "behind",
    detail:
      "The AGENTS.md managed block differs from the one this Kanmer ships — the instructions " +
      "agents read in this repo are not this version's.",
    fix: `${SETUP_FIX}, or node scripts/agents-block.mjs <repo>`,
  };
}

/**
 * The installed skills trees, and their stamps.
 *
 * **The walk goes bundled-tree-first, and never enumerates the destination.**
 * One rule, three properties, all of them required:
 *
 *  - A skill the *user* wrote can never count as drift, because it is not in
 *    the bundled tree and so is never looked at. This remains true even inside
 *    an owned destination, including when a user skill contains `node_modules`.
 *  - That `node_modules` is therefore never walked, which is what keeps a call
 *    that runs at every session start cheap — ~33 stats per destination, fixed.
 *  - A destination holding none of Kanmer's skills produces no row at all,
 *    rather than a spurious "everything is missing".
 */
function skillRows(repoRoot: string, bundledSkillsDir: string | null): StaleEntry[] {
  const rows: StaleEntry[] = [];
  const present = SKILL_DESTINATIONS.map((rel) => ({ rel, abs: path.join(repoRoot, rel) })).filter(
    (d) => isDir(d.abs),
  );
  if (present.length === 0) return rows;

  if (!bundledSkillsDir) {
    rows.push({
      artefact: "skills",
      state: "unknown",
      detail:
        `Found installed skills at ${present.map((d) => d.rel).join(", ")}, but this server ` +
        "could not locate its own bundled skills tree to compare them against.",
      fix: "no action — run kanmer-setup if you suspect the skills are old",
    });
    return rows;
  }

  const bundled = walkFiles(bundledSkillsDir);
  if (bundled.length === 0) {
    rows.push({
      artefact: "skills",
      state: "unknown",
      detail: `The bundled skills tree at ${bundledSkillsDir} is empty or unreadable.`,
      fix: "no action — reinstall Kanmer if this persists",
    });
    return rows;
  }

  // Hash the reference once, not once per destination.
  const reference = new Map<string, string>();
  for (const rel of bundled) {
    const text = readOrNull(path.join(bundledSkillsDir, rel));
    if (text !== null) reference.set(rel, digest(text));
  }

  // The skill folders this build ships, in bundled-tree order.
  const bundledFolders = [...new Set(bundled.map(skillFolderOf))];

  for (const dest of present) {
    // Which of Kanmer's skills are actually installed here.
    //
    // A skill folder the user simply does not have is **not drift**: a Claude
    // Code user who keeps three of the twelve has *chosen* three, and reporting
    // nine "missing" would be the same false positive as counting their own
    // skill as drift. Only a folder that is installed gets judged — and then a
    // file missing from inside it is a genuinely incomplete copy.
    //
    // It also answers "is this a Kanmer skills directory at all". If none of
    // them is here, this is somebody else's folder and there is nothing to say
    // about it — including nothing about its stamp.
    const installedFolders = new Set(
      bundledFolders.filter((folder) => isDir(path.join(dest.abs, folder))),
    );
    if (installedFolders.size === 0) continue;

    const missing: string[] = [];
    const differing: string[] = [];

    for (const [rel, sha] of reference) {
      if (!installedFolders.has(skillFolderOf(rel))) continue;
      const text = readOrNull(path.join(dest.abs, rel));
      if (text === null) {
        missing.push(rel);
        continue;
      }
      if (digest(text) !== sha) differing.push(rel);
    }

    if (missing.length || differing.length) {
      const folders = [...missing, ...differing].map(skillFolderOf);
      rows.push({
        artefact: "skills",
        state: "behind",
        detail:
          `${dest.rel}: ${differing.length} file(s) differ from the bundled skills and ` +
          `${missing.length} are missing — affected skills: ${nameList(folders)}.`,
        // Deliberately not "click Update skills": that button compares
        // `plugin.json`'s frozen 0.1.0 against the installed stamp, so it has
        // never lit up for any release ever shipped. Reconnect does copy.
        fix: `${SETUP_FIX}, or reconnect this project in the Kanmer app`,
      });
    }

    const retired = RETIRED_SKILL_PATHS.filter((rel) => exists(path.join(dest.abs, rel)));
    if (retired.length) {
      rows.push({
        artefact: "skills",
        state: "behind",
        detail:
          `${dest.rel} still carries skills Kanmer has retired: ${nameList(retired)}. ` +
          "An agent reading them will follow instructions that no longer describe Kanmer.",
        fix: "delete them, or reconnect in the Kanmer app (tracked as GUI-080)",
      });
    }

    if (!exists(path.join(dest.abs, SKILLS_STAMP_FILE))) {
      rows.push({
        artefact: "skills-stamp",
        state: "unstamped",
        detail:
          `${dest.rel} has no ${SKILLS_STAMP_FILE}, so nothing records which Kanmer wrote it ` +
          "or which skills it owns there.",
        fix: "reconnect in the Kanmer app to write the stamp",
      });
    }
  }

  return rows;
}

/**
 * `board.yml` against what this build of core expects.
 *
 * Everything here is a *file* verdict, never a behaviour verdict: the runtime
 * already compensates for all of it. The split between `behind` and
 * `compensated` is the difference between "migration missed this" and "the file
 * is older than the defaults and core papers over it", and it is the single
 * most important judgement in this module — see `StaleState`.
 */
function boardConfigRows(board: BoardConfig, source: BoardSource, format: number): StaleEntry[] {
  // A synthesized default board is this version's by construction.
  if (source !== "file") return [];

  const rows: StaleEntry[] = [];

  // Dead keys. ADR-0008's one format-3 migration strips `priorities` and
  // `statuses` (stages are constants, priority is gone); `docs` is the v2
  // document model that `profiles` replaced. A format-3 board still carrying
  // them escaped the migration — the one genuinely `behind` board-file state.
  const dead: string[] = [];
  if (board.priorities !== undefined) dead.push("priorities");
  if (board.statuses !== undefined) dead.push("statuses");
  if (board.docs !== undefined) dead.push("docs");
  if (dead.length && format >= CURRENT_FORMAT) {
    rows.push({
      artefact: "board-config",
      state: "behind",
      detail:
        `board.yml still carries ${nameList(dead)}, which format ${CURRENT_FORMAT} removed ` +
        "(ADR-0008) — nothing reads them.",
      fix: `${SETUP_FIX}; the keys are inert until then`,
    });
  }

  // The false-positive trap, and the reason `compensated` exists.
  //
  // `resolveProfiles()` injects `questions-resolved` at read time precisely
  // because a board that has ever been written stops consulting the shipped
  // defaults. So EVERY board on earth omits it from the file, the gate fires
  // anyway, and calling that `behind` would put a permanent warning on every
  // `get_status` call — which is the fastest possible way to make this whole
  // report ignored.
  if (board.profiles && !JSON.stringify(board.profiles).includes("questions-resolved")) {
    rows.push({
      artefact: "board-config",
      state: "compensated",
      detail:
        "board.yml's profiles omit questions-resolved; core injects it at read time, so the " +
        "gate is in force and the file simply no longer lists every effective requirement.",
      fix: "none — informational",
    });
  }

  // Keys newer versions added, each with a `?? DEFAULT_*` fallback in core.
  const absent: string[] = [];
  if (board.groupKinds === undefined) absent.push("groupKinds");
  if (board.proofTypes === undefined) absent.push("proofTypes");
  if (board.defaultProfile === undefined) absent.push("defaultProfile");
  if (board.repoDocs === undefined) absent.push("repoDocs");
  if (absent.length) {
    rows.push({
      artefact: "board-config",
      state: "compensated",
      detail:
        `board.yml predates ${nameList(absent, 6)}; core falls back to the shipped defaults, ` +
        "so behaviour is current and only the file is old.",
      fix: `${SETUP_FIX} to write them explicitly, or leave it`,
    });
  }

  return rows;
}

/** The `--root` value in an argv array, or null. Tolerates a non-array. */
function rootFromArgs(args: unknown): string | null {
  if (!Array.isArray(args)) return null;
  const at = args.indexOf("--root");
  if (at === -1) return null;
  const next: unknown = args[at + 1];
  return typeof next === "string" && next.trim() !== "" ? next : null;
}

/** Decode the narrow dotted-key shape used by TOML table headers. */
function tomlTablePath(header: string): string[] | null {
  const path: string[] = [];
  let index = 0;
  while (index < header.length) {
    while (/[ \t]/.test(header[index] ?? "")) index++;
    const quote = header[index];
    let component = "";
    if (quote === '"' || quote === "'") {
      index++;
      let closed = false;
      while (index < header.length) {
        const char = header[index++]!;
        if (char === quote) { closed = true; break; }
        if (quote === '"' && char === "\\") {
          const escaped = header[index++];
          if (escaped === undefined) return null;
          component += `\\${escaped}`;
        } else component += char;
      }
      if (!closed) return null;
      if (quote === '"') {
        try { component = JSON.parse(`"${component}"`) as string; }
        catch { return null; }
      }
    } else {
      const match = /^[A-Za-z0-9_-]+/.exec(header.slice(index));
      if (!match) return null;
      component = match[0];
      index += component.length;
    }
    path.push(component);
    while (/[ \t]/.test(header[index] ?? "")) index++;
    if (index === header.length) return path;
    if (header[index++] !== ".") return null;
  }
  return null;
}

/**
 * Return only Kanmer's TOML MCP table. Table components may use any ordinary
 * TOML key spelling (bare, basic quoted, or literal quoted). Trailing header
 * comments are accepted while every later table stays out of the scan.
 */
function kanmerTomlSection(text: string): string | null {
  const headers = [...text.matchAll(/^[ \t]*\[([^\[\]\r\n]+)\][ \t]*(?:#[^\r\n]*)?\r?$/gm)];
  const header = headers.find((candidate) => {
    const path = tomlTablePath(candidate[1]!);
    return path?.length === 2 && path[0] === "mcp_servers" && path[1] === "kanmer";
  });
  if (!header || header.index === undefined) return null;
  const from = header.index + header[0].length;
  const nextTable = /^[ \t]*\[/m.exec(text.slice(from));
  return nextTable ? text.slice(from, from + nextTable.index) : text.slice(from);
}

/**
 * The board root a file's **Kanmer** MCP entry is pinned to, or null.
 *
 * Scoped to Kanmer's own entry rather than scanned across the file, and that
 * matters more than it looks: a naive `text.includes("kanmer")` is true of every
 * config in a repo that merely *lives* in a folder called kanmer, and a naive
 * "first `--root` in the file" would then read some other server's flag and
 * report it as Kanmer's. This reads the entry.
 *
 * JSON hosts (`.mcp.json`, `.agents/mcp_config.json` → `mcpServers.kanmer`;
 * `opencode.json` → `mcp.kanmer`, whose `command` is the whole argv) are parsed.
 * The two TOML hosts (`.codex/config.toml`, `.grok/config.toml`) are read by
 * slicing the `[mcp_servers.kanmer]` table — from its header to the next
 * top-level `[` — and taking the quoted value after `"--root"` inside it. That
 * is a deliberate trade: a TOML parser would otherwise become a dependency of
 * core, bundled into every server, to read one string out of two files.
 *
 * `--repo-root` cannot be mistaken for it: the JSON path matches array elements
 * exactly, and the TOML path matches the quoted literal `"--root"`.
 */
export function kanmerRootIn(text: string, format: "json" | "toml"): string | null {
  if (format === "json") {
    let doc: unknown;
    try {
      doc = JSON.parse(text);
    } catch {
      return null;
    }
    if (typeof doc !== "object" || doc === null) return null;
    const rec = doc as Record<string, unknown>;
    for (const key of ["mcpServers", "mcp"]) {
      const servers = rec[key];
      if (typeof servers !== "object" || servers === null) continue;
      const entry = (servers as Record<string, unknown>)["kanmer"];
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as Record<string, unknown>;
      // `args` for the Claude/antigravity shape; `command` is the whole argv
      // for opencode's `{ type: "local", command: [...] }`.
      const found = rootFromArgs(e["args"]) ?? rootFromArgs(e["command"]);
      if (found) return found;
    }
    return null;
  }

  // TOML: slice the [mcp_servers.kanmer] table out, then scan only inside it.
  const section = kanmerTomlSection(text);
  if (section === null) return null;
  const m = /"--root"[\s,]*("(?:[^"\\]|\\.)*")/.exec(section);
  if (!m) return null;
  try {
    const value = JSON.parse(m[1]) as unknown;
    return typeof value === "string" && value.trim() !== "" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Whether Codex's project entry uses the portable invocation Connect currently
 * writes. This deliberately inspects only Kanmer's TOML table: other MCP
 * entries and formatting are user-owned and irrelevant to this verdict.
 */
export function isCurrentCodexRegistration(text: string): boolean | null {
  const section = kanmerTomlSection(text);
  if (section === null) return null;
  // `command` is a TOML string, not a formatting convention. Feed the scalar
  // through the same narrow TOML string parser as `args` so valid literal
  // strings and trailing comments do not make a healthy registration stale.
  const rawCommand = /^[ \t]*command[ \t]*=[ \t]*(.*)$/m.exec(section)?.[1];
  const rawArgs = /^[ \t]*args[ \t]*=[ \t]*(\[[\s\S]*?\])/m.exec(section)?.[1];
  if (rawCommand === undefined || !rawArgs) return false;
  const command = parseTomlStringArray(`[\n${rawCommand}\n]`);
  const args = parseTomlStringArray(rawArgs);
  if (command === null || command.length !== 1 || args === null) {
    return false;
  }
  return command[0]!.toLowerCase() === "powershell.exe" &&
    JSON.stringify(args) === JSON.stringify(CODEX_PORTABLE_ARGS);
}

/** Parse the narrow TOML array shape used by Codex registrations without a new runtime dependency. */
function parseTomlStringArray(source: string): string[] | null {
  let index = 0;
  const values: string[] = [];
  const skipTrivia = () => {
    while (index < source.length) {
      if (/\s/.test(source[index]!)) { index++; continue; }
      if (source[index] === "#") {
        const newline = source.indexOf("\n", index);
        index = newline === -1 ? source.length : newline + 1;
        continue;
      }
      break;
    }
  };
  skipTrivia();
  if (source[index++] !== "[") return null;
  for (;;) {
    skipTrivia();
    if (source[index] === "]") return values;
    const quote = source[index++];
    if (quote !== '"' && quote !== "'") return null;
    let encoded = "";
    let closed = false;
    while (index < source.length) {
      const char = source[index++]!;
      if (char === quote) { closed = true; break; }
      if (quote === '"' && char === "\\") {
        const escaped = source[index++];
        if (escaped === undefined) return null;
        encoded += `\\${escaped}`;
      } else encoded += char;
    }
    if (!closed) return null;
    try {
      values.push(quote === '"' ? JSON.parse(`"${encoded}"`) as string : encoded);
    } catch { return null; }
    skipTrivia();
    if (source[index] === "]") return values;
    if (source[index++] !== ",") return null;
  }
}

/** Compare two roots the way the filesystem does: resolved, normalised, case-insensitively. */
function sameRoot(a: string, b: string): boolean {
  const norm = (p: string) =>
    path.resolve(p).replace(/[\\/]+/g, "/").replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

/**
 * Provider MCP registrations pointing at a board that is not this one.
 *
 * Row 8 of the research enumeration: written by Connect, migrated by nothing,
 * reconciled by nothing. The detectable failure is a recorded `--root` that has
 * moved on — which is exactly what happens when a board is migrated into its
 * own worktree, or the project is renamed or moved.
 *
 * Only an *explicit* `--root` is judged. A registration without one is not
 * stale: the server discovers the board from cwd upwards (ADR-0012), which is a
 * supported shape, not an old one.
 */
function registrationRows(repoRoot: string, projectRoot: string): StaleEntry[] {
  const rows: StaleEntry[] = [];
  for (const rel of REGISTRATION_FILES) {
    const file = path.join(repoRoot, rel);
    if (!exists(file)) continue;
    const text = readOrNull(file);
    if (text === null) {
      rows.push({
        artefact: "mcp-registration",
        state: "unknown",
        detail: `${rel} exists but could not be read, so its Kanmer registration cannot be checked.`,
        fix: "check the file's permissions",
      });
      continue;
    }
    const root = kanmerRootIn(text, rel.endsWith(".toml") ? "toml" : "json");
    if (process.platform === "win32" && rel === STALENESS_PROVIDER_PATHS.codex.registrationFile && isCurrentCodexRegistration(text) === false) {
      rows.push({
        artefact: "mcp-registration",
        state: "behind",
        detail:
          `${rel} registers Kanmer with a legacy Codex launcher descriptor. ` +
          "Codex must use the portable PowerShell invocation so normal Windows argv serialization can start it.",
        fix: "reconnect this project in the Kanmer app",
      });
    }
    if (root === null || sameRoot(root, projectRoot)) continue;
    rows.push({
      artefact: "mcp-registration",
      state: "behind",
      detail:
        `${rel} registers Kanmer against ${root}, which is not this board (${projectRoot}) — ` +
        "that host is talking to a different board, or to none.",
      fix: "reconnect this project in the Kanmer app",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// The detector.
// ---------------------------------------------------------------------------

/**
 * Everything about this repo that is older than the Kanmer reading it.
 *
 * **Deliberately not cached.** `get_status` may run more than once a session,
 * but `store.detectFormat()` already re-stats for a reason (`store.ts:167-171`):
 * the GUI can migrate underneath a long-lived server. The same hazard applies
 * here and is worse — the obvious next move after reading this report is to run
 * `kanmer-setup`, and a cached "stale" answer surviving the very fix it asked
 * for would tell the agent its repair did not work. The cost avoided is roughly
 * 35 small reads per skills destination, which is not worth being wrong about.
 *
 * **Board format is deliberately absent from `stale[]`.** It is already
 * reported as `get_status.format` and bannered by the GUI; a second copy here
 * would be a second source of truth for the one dimension that already has a
 * detector.
 *
 * Never throws.
 */
export function detectStaleness(input: StalenessInput): RepoStaleness {
  const { paths, board, boardSource, bundledSkillsDir } = input;
  const stale: StaleEntry[] = [];

  try {
    const reference = referenceBlockBody(bundledSkillsDir);
    const block = agentsBlockRow(paths.repoRoot, reference);
    if (block) stale.push(block);
  } catch {
    stale.push({
      artefact: "agents-block",
      state: "unknown",
      detail: "The AGENTS.md managed block could not be checked.",
      fix: "no action",
    });
  }

  try {
    stale.push(...skillRows(paths.repoRoot, bundledSkillsDir));
  } catch {
    stale.push({
      artefact: "skills",
      state: "unknown",
      detail: "The installed skills could not be checked.",
      fix: "no action",
    });
  }

  try {
    stale.push(...boardConfigRows(board, boardSource, input.format));
  } catch {
    stale.push({
      artefact: "board-config",
      state: "unknown",
      detail: "board.yml could not be checked.",
      fix: "no action",
    });
  }

  try {
    stale.push(...registrationRows(paths.repoRoot, paths.projectRoot));
  } catch {
    stale.push({
      artefact: "mcp-registration",
      state: "unknown",
      detail: "The provider MCP registrations could not be checked.",
      fix: "no action",
    });
  }

  return { upToDate: !stale.some((e) => e.state === "behind"), stale };
}
