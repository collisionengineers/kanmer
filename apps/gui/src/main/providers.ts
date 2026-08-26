// The agent-provider registry. Each host declares how to register Kanmer's MCP
// server (a CLI `mcp add` or a config-file merge) and how skills install
// (a marketplace CLI or copy-skills + the AGENTS.md block). Every register /
// merge is a pure function, so connect.ts is a thin dispatcher and the whole
// surface is unit-testable without spawning anything.
import { basename, join } from "node:path";
import * as TOML from "smol-toml";
import {
  dispatchProviderById,
  listDispatchProviders,
  STALENESS_PROVIDER_PATHS,
  type DispatchProviderId,
} from "@kanmer/core";

export type ProviderId = "codex" | "claude" | "opencode" | "grok" | "antigravity";

export interface Invocation {
  /** The executable that runs the server. */
  command: string;
  /** Arguments passed to the executable. */
  args: string[];
  env: Record<string, string>;
}

/**
 * The one machine-portable Codex launcher contract. The environment expands
 * LOCALAPPDATA on the destination machine; Connect must never expand or
 * replace this path with an install, board or source root.
 */
const CODEX_PORTABLE_COMMAND = "& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')";
// A command path that does not resolve is otherwise a non-terminating
// PowerShell error, which would make the probe appear healthy. Make that
// condition terminating before preserving the launcher's own exit code.
const CODEX_PORTABLE_PROBE_COMMAND = `$ErrorActionPreference = 'Stop'; ${CODEX_PORTABLE_COMMAND} --probe; exit $LASTEXITCODE`;

/** The local default shared by the GUI registration and MCP runtime. */
export const DEFAULT_BOARD_BRANCH = "kanmer-board";

/** Keep a malformed/blank preference from creating an unusable registration. */
export function normalizeBoardBranch(branch: string | undefined): string {
  const trimmed = branch?.trim();
  return trimmed || DEFAULT_BOARD_BRANCH;
}

/** The functional native-plugin probe must prove the staged branch, not only project identity. */
export function nativeFunctionalPrompt(boardBranch: string | undefined): string {
  const expected = JSON.stringify(normalizeBoardBranch(boardBranch));
  return `Call the Kanmer get_status tool for this workspace. Return exactly one JSON object with keys project_fingerprint, board_root, repo_root, format, board_expected_branch, board_actual_branch, board_on_expected_branch copied from that tool response. The expected board branch is ${expected}; copy boardWorktree.expectedBranch, boardWorktree.actualBranch, and boardWorktree.onBoardBranch. Do not invent values or return a marker.`;
}

/** Return a fresh canonical Codex invocation so callers cannot mutate shared state. */
export function codexPortableInvocation(boardBranch?: string): Invocation {
  return {
    command: "powershell.exe",
    args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", CODEX_PORTABLE_COMMAND],
    env: boardBranch === undefined ? {} : { KANMER_BOARD_BRANCH: normalizeBoardBranch(boardBranch) },
  };
}

/** Add the installer-owned health-check mode to the canonical command string. */
export function codexPortableProbeInvocation(): Invocation {
  return {
    command: "powershell.exe",
    // Keep the probe derived from the registered command so normal argv
    // serialization exercises the same PowerShell path Codex will use.
    args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", CODEX_PORTABLE_PROBE_COMMAND],
    env: {},
  };
}

/** The installer-owned Windows runtime used by native plugin MCP configs. */
export function antigravityPortableInvocation(probe = false): Invocation {
  // Antigravity forwards embedded quotes in the final `/c` argv token
  // literally. Enable delayed expansion so the command stays quote-free (and
  // therefore agy-compatible) while still working when LOCALAPPDATA contains
  // spaces. Capture the provider cwd before pushd; the installer-owned shim
  // restores it before starting MCP so ADR-0012 board discovery sees the
  // workspace rather than the launcher's bin directory.
  const launcher =
    "setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd";
  return {
    command: "cmd.exe",
    args: ["/d", "/v:on", "/s", "/c", `${launcher}${probe ? " --probe" : ""}`],
    env: {},
  };
}

/** Whether a config registers Kanmer — with "unreadable" kept distinct from "no". */
export type RegistrationState = "registered" | "absent" | "indeterminate";

export type RegisterSpec =
  | { kind: "none" }
  | {
      kind: "cli";
      addCommand: (inv: Invocation, root: string) => string;
      /** Optional production-safe argv form; addCommand remains copy/paste text. */
      addArgv?: (inv: Invocation, root: string) => NativePluginCommand;
      removeCommands: (root: string) => string[];
      /** Optional project file that proves this CLI host remains connected. */
      configPath?: string;
      registrationState?: (existing: string) => RegistrationState;
      /** Optional provider-owned merge used to refresh an existing registration without invoking the host CLI. */
      merge?: (existing: string | null, inv: Invocation) => string;
    }
  | {
      kind: "configFile";
      /** Repo-relative path the merge writes (relative to the project root, or ~ for home). */
      configPath: string;
      /** Parse → merge (preserving unknown keys) → serialise. Pure. */
      merge: (existing: string | null, inv: Invocation) => string;
      /** Remove only the kanmer entry, preserving everything else. Pure. */
      unmerge: (existing: string) => string;
      /**
       * Does this file's contents still register Kanmer with **this** host?
       *
       * The third pure function, and the one whose absence was a bug: the
       * caller used to answer it itself with a hardcoded JSON shape, so it
       * could only ever be right for the hosts it happened to know about. It
       * read `mcpServers.kanmer` for grok out of `.mcp.json` — a file Claude
       * also writes — and so reported grok connected in Claude-only projects.
       * Ownership belongs with the provider that owns the file.
       *
       * Tri-state on purpose. "I cannot read this file" is not "no", and the
       * two callers want opposite defaults for it: disconnect keeps the shared
       * AGENTS.md block (better a stale block than one pulled from under a
       * connected host), while the legacy sweep treats it as no proven
       * replacement and refuses to drain. Collapsing it to a boolean here would
       * force one of them to be wrong.
       */
      registrationState: (existing: string) => RegistrationState;
      /**
       * Optional best-effort CLI cleanup run alongside the merge — codex uses it
       * to drain the global `kanmer-<project>` entries older versions wrote.
       * A failure here must never fail the connect.
       */
      removeCommands?: (root: string) => string[];
    };

export type InstallSpec =
  /**
   * `marketplaceRoot` is the directory holding this host's **marketplace
   * manifest** — the repo root in dev, `resources/` in the packaged app — never
   * the plugin directory inside it. The parameter used to be named `localDir`,
   * connect.ts passed `pluginRoot()`, and every `plugin marketplace add` since
   * has exited 1 with "Marketplace file not found" (MCP-013). The name is part
   * of the fix: `localDir` was true of the wrong directory too.
   *
   * Each host reads its own manifest, and the two declare different marketplace
   * names — Claude's `.claude-plugin/marketplace.json` is `kanmer`, codex's
   * `.agents/plugins/marketplace.json` is `kanmer-plugins`. They legitimately
   * differ (different schemas, different hosts, and renaming codex's would move
   * every existing user's plugin cache), so the `<plugin>@<marketplace>` strings
   * below are pinned to their manifests by a test in providers.test.ts rather
   * than reconciled into one name.
   */
   | { kind: "marketplace"; marketplaceCommands: (marketplaceRoot: string) => string[] }
   | { kind: "copySkills"; skillsScope: "project" | "global" | "agentsOnly"; skillsDir?: string }
   | {
       /** A host-native plugin, installed in the host's user scope. */
       kind: "plugin";
       scope: "user";
       pluginName: string;
       cli: string;
       helpCommand: () => string;
       installCommand: (pluginRoot: string) => string;
       uninstallCommand: () => string;
       listCommand: () => string;
       inspectCommand: () => string;
       validateCommand?: (pluginRoot: string) => string;
       functionalCommand: (projectRoot: string, boardRoot?: string, boardBranch?: string) => string;
       requiredFiles: (pluginRoot: string) => string[];
       capabilityPresent: (output: string) => boolean;
       descriptorPath: (pluginRoot: string) => string;
       /** State written by older Kanmer releases; retired after plugin proof. */
       legacyConfigPath: string;
       legacyConfigUnmerge: (existing: string) => string;
       legacyRegistrationState?: (existing: string) => RegistrationState;
       legacySkillsDir: string;
       /**
        * Optional argv-native lifecycle. Providers with user-controlled paths
        * use this seam so connect never interpolates those paths into a shell
        * command. The string commands remain the copy/paste compatibility
        * surface for providers that do not need it.
        */
       argv?: NativePluginArgvCommands;
     };

export interface NativePluginCommand {
  file: string;
  args: string[];
}

export interface NativePluginArgvCommands {
  version: () => NativePluginCommand;
  help: () => NativePluginCommand;
  /** Runtime that the plugin's MCP descriptor launches, when not `node`. */
  runtime?: () => NativePluginCommand;
  install: (pluginRoot: string) => NativePluginCommand;
  uninstall: () => NativePluginCommand;
  list: () => NativePluginCommand;
  inspect: () => NativePluginCommand;
  validate?: (pluginRoot: string) => NativePluginCommand;
  functional: (projectRoot: string, boardRoot: string, boardBranch?: string) => NativePluginCommand;
}

export interface AgentProvider {
  id: ProviderId;
  label: string;
  register: RegisterSpec;
  install: InstallSpec;
  /**
   * May Kanmer spawn this host headlessly to work a ticket in the background?
   *
   * This is a statement about **dispatch alone** — never a capability tier. A
   * host with `dispatch: false` still registers the board and still receives the
   * skills; what it does not do is appear in the "Dispatch to agent →" menu
   * (`dispatchableProviders()`), and `dispatchTicket` refuses it (`dispatch.ts`).
   * Anything the UI says about a `false` here must say *that*, and no more: the
   * badge this once drove read "register-only", which denied a project skills
   * install the host was in fact getting.
   */
  dispatch: boolean;
  /**
   * The CLI + args to spawn for a background dispatch (the executable is `cli`,
   * the args carry the prompt). Absent when the host isn't dispatchable.
   */
  dispatchCli?: string;
  dispatchArgs?: (prompt: string, root: string) => string[];
}

/** Adapt the shared dispatch-only registry to Connect's larger provider record. */
function sharedDispatchSpec(id: DispatchProviderId): Pick<AgentProvider, "dispatchCli" | "dispatchArgs"> {
  const provider = dispatchProviderById(id);
  if (!provider) throw new Error(`Missing shared dispatch provider ${id}`);
  return {
    dispatchCli: provider.cli,
    dispatchArgs: (prompt, root) => [...provider.buildDispatchArgs({ prompt, sourceRoot: root })],
  };
}

/** Quote a shell argument for the copy-paste fallback command line. */
export function q(s: string): string {
  return /[\s"&|<>^();`$%@!]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function nativePluginPresent(pluginName: string, output: string): boolean {
  const escaped = pluginName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(output);
}

function nativePluginCapabilityPresent(pluginName: string, output: string): boolean {
  return output
    .split(/\r?\n/)
    .some((line) => nativePluginPresent(pluginName, line) && (/enabled|installed/i.test(line) || line.trim().toLowerCase() === pluginName.toLowerCase()));
}

/** The stamp a copied skill set carries so Connect can offer "Update skills". */
export const SKILLS_VERSION_FILE = ".kanmer-skills-version";

/**
 * What a destination's stamp records: the bundled version, and the **roster** —
 * the skill folders Kanmer actually wrote there.
 *
 * The roster exists because "what Kanmer currently ships" is not "what Kanmer
 * installed here". Without it, a skill retired from the bundle is never
 * mentioned again by install *or* disconnect, so it survives forever in every
 * project that ever received it. The roster is also the only thing that makes
 * deleting safe: the destination is shared with skills the user wrote, and a
 * name-prefix guess would happily delete somebody's own `kanmer-mine`.
 *
 * `roster: null` means the stamp predates this format — "I do not know what I
 * own here" — which callers must treat as a reason to delete less, not more.
 */
export interface SkillsStamp {
  version: string;
  roster: string[] | null;
}

/** The marker line that introduces the roster; its presence is what makes an empty roster representable. */
const SKILLS_ROSTER_MARKER = "skills:";

/**
 * Serialise a stamp: **version on line 1**, roster below.
 *
 * Line-oriented, not JSON, and deliberately so. A Kanmer older than this change
 * reads the whole file and `.trim()`s it as the version string; fed JSON it
 * would compare `{"version":…` lexically. Fed this, it gets a multi-line string
 * that loses every numeric comparison and simply reports "no update available"
 * — wrong in the harmless direction, on the one thing that reads it.
 */
export function formatSkillsStamp(version: string, roster: readonly string[]): string {
  const names = [...new Set(roster.map((n) => n.trim()).filter((n) => n !== ""))].sort();
  return `${[version.trim(), SKILLS_ROSTER_MARKER, ...names].join("\n")}\n`;
}

/** Parse a stamp, tolerating CRLF, blank lines and the legacy bare-version form. */
export function parseSkillsStamp(contents: string): SkillsStamp {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const version = lines[0] ?? "";
  if (lines[1] !== SKILLS_ROSTER_MARKER) return { version, roster: null };
  return { version, roster: lines.slice(2) };
}

/**
 * Skills Kanmer used to install and no longer does, as destination-relative paths.
 *
 * **This list is closed.** It repairs installs made before the roster existed;
 * nothing is ever added to it. Every retirement from here on is covered by the
 * recorded roster, which knows what a given destination actually received — and
 * a tombstone list that grew would be a second, competing source of truth about
 * what Kanmer owns.
 *
 * Both entries were retired by commit `130f837`, and between them they are the
 * two shapes a retirement takes: a whole skill folder, and a file inside a
 * folder that survives.
 */
export const RETIRED_SKILL_PATHS: readonly string[] = [
  "kanmer-import",
  "kanmer-research/assets/impact-template.md",
];

/**
 * True when `bundled` is a strictly newer version than `installed` (Phase 6.2).
 * Dot-separated numeric compare with a lexical tail fallback; a null/blank
 * `installed` (never stamped) is not "newer" — that's "not installed", handled
 * by the caller. Pure, so it's unit-testable without the filesystem.
 */
export function isNewerVersion(bundled: string, installed: string): boolean {
  const parse = (v: string) => v.trim().split(".").map((p) => ({ n: Number(p), raw: p }));
  const a = parse(bundled);
  const b = parse(installed);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? { n: 0, raw: "0" };
    const y = b[i] ?? { n: 0, raw: "0" };
    if (Number.isFinite(x.n) && Number.isFinite(y.n)) {
      if (x.n !== y.n) return x.n > y.n;
    } else if (x.raw !== y.raw) {
      return x.raw > y.raw;
    }
  }
  return false;
}

/**
 * codex has no project scope, so each project registers under its own server
 * name — otherwise a second project silently rewrites the first one's --root.
 */
export function codexServerName(projectRoot: string): string {
  const cleaned = basename(projectRoot)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `kanmer-${cleaned || "project"}`;
}

/** Parse JSON (empty/invalid → {}), mutate, re-serialise with a trailing newline. */
function editJson(existing: string | null, mutate: (obj: Record<string, unknown>) => void): string {
  let obj: unknown = {};
  if (existing && existing.trim()) {
    try {
      obj = JSON.parse(existing);
    } catch {
      obj = {};
    }
  }
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) obj = {};
  const rec = obj as Record<string, unknown>;
  mutate(rec);
  return `${JSON.stringify(rec, null, 2)}\n`;
}

/** opencode.json: an `mcp` object keyed by server name, `type: "local"`. */
function opencodeMerge(existing: string | null, inv: Invocation): string {
  return editJson(existing, (o) => {
    if (typeof o.$schema !== "string") o.$schema = "https://opencode.ai/config.json";
    const mcp = (typeof o.mcp === "object" && o.mcp !== null ? o.mcp : {}) as Record<string, unknown>;
    mcp.kanmer = {
      type: "local",
      command: [inv.command, ...inv.args],
      environment: inv.env,
      enabled: true,
    };
    o.mcp = mcp;
  });
}
function opencodeUnmerge(existing: string): string {
  return editJson(existing, (o) => {
    if (typeof o.mcp === "object" && o.mcp !== null) {
      delete (o.mcp as Record<string, unknown>).kanmer;
    }
  });
}
function opencodeRegistrationState(existing: string): RegistrationState {
  return jsonRegistrationState(existing, "mcp");
}

/**
 * The project-scoped `[mcp_servers.kanmer]` TOML registration — **codex's
 * `<root>/.codex/config.toml` and grok's `<root>/.grok/config.toml`**, which
 * take the identical shape (`command` / `args` / `env`).
 *
 * codex: `codex mcp add` has no scope flag and always writes the global
 * `~/.codex/config.toml` (verified against the installed CLI, 2026-08-16), so
 * merging the project file by hand is the only route to one entry per project
 * rather than one global entry per project forever (ADR-0007).
 *
 * grok: this file is grok's *native* project scope and the highest-priority
 * source it reads (ADR-0013). It replaced `.mcp.json`, which grok only ever read
 * as a low-priority compat source and which Claude owns.
 *
 * The merge must preserve everything it does not own: a project file can carry
 * unrelated tables, other MCP servers, and comments-adjacent formatting. Parsing
 * to a value and re-serialising loses comments — accepted for a small *project*
 * file, and the reason the unmerge is surgical about touching only
 * `mcp_servers.kanmer`. It is **not** acceptable for the global config, which is
 * why the legacy sweep parses that file for listing and never writes it.
 */
function tomlMcpServersMerge(existing: string | null, inv: Invocation): string {
  let doc: Record<string, unknown> = {};
  if (existing && existing.trim()) {
    try {
      const parsed = TOML.parse(existing);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        doc = parsed as Record<string, unknown>;
      }
    } catch {
      // An unparseable file is not ours to repair; start clean rather than
      // silently discarding what we cannot read. The copy-paste fallback in
      // connect.ts is the user's route out.
      doc = {};
    }
  }
  const servers = (
    typeof doc["mcp_servers"] === "object" && doc["mcp_servers"] !== null
      ? doc["mcp_servers"]
      : {}
  ) as Record<string, unknown>;
  const entry: Record<string, unknown> = {
    command: inv.command,
    args: inv.args,
  };
  if (Object.keys(inv.env).length > 0) entry.env = inv.env;
  servers["kanmer"] = entry;
  doc["mcp_servers"] = servers;
  return `${TOML.stringify(doc)}\n`;
}

function tomlMcpServersUnmerge(existing: string): string {
  let doc: Record<string, unknown> = {};
  try {
    const parsed = TOML.parse(existing);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      doc = parsed as Record<string, unknown>;
    }
  } catch {
    return existing; // leave a file we cannot parse exactly as we found it
  }
  const servers = doc["mcp_servers"];
  if (typeof servers === "object" && servers !== null) {
    delete (servers as Record<string, unknown>)["kanmer"];
    if (Object.keys(servers as Record<string, unknown>).length === 0) {
      delete doc["mcp_servers"];
    }
  }
  return `${TOML.stringify(doc)}\n`;
}

/** Does a TOML config still carry `[mcp_servers.kanmer]`? Pure. */
export function tomlRegistrationState(existing: string): RegistrationState {
  let doc: unknown;
  try {
    doc = TOML.parse(existing);
  } catch {
    return "indeterminate";
  }
  return hasKanmerUnder(doc, "mcp_servers") ? "registered" : "absent";
}

/** Is there a `kanmer` key in `<doc>.<key>`, treating a non-object as absent? */
function hasKanmerUnder(doc: unknown, key: string): boolean {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) return false;
  const entries = (doc as Record<string, unknown>)[key];
  return typeof entries === "object" && entries !== null && !Array.isArray(entries) &&
    Object.hasOwn(entries, "kanmer");
}

/**
 * Whether codex will actually load a project's `.codex/config.toml`.
 *
 * Project-scoped config is honoured for **trusted projects only**, and trust is
 * recorded in the *global* config as `[projects.'<path>'] trust_level`. That
 * makes the caveat checkable rather than a warning nobody reads: Connect can
 * say whether this folder is trusted instead of always hedging.
 *
 * Path keys are lowercased on Windows and quoted inconsistently, so matching is
 * case-insensitive with separators normalised.
 *
 * Ancestor inheritance is deliberately reported as *maybe*. A trusted
 * `c:\users\me` plausibly covers everything beneath it, but whether codex
 * matches the nearest ancestor or only an exact path is not documented, and
 * claiming "trusted" on a guess would be worse than saying so.
 */
export type CodexTrust = "trusted" | "untrusted" | "maybe-via-ancestor" | "unknown";

export function codexTrustFromConfig(
  globalConfigToml: string | null,
  projectRoot: string,
): CodexTrust {
  if (!globalConfigToml?.trim()) return "unknown";
  let doc: Record<string, unknown>;
  try {
    doc = TOML.parse(globalConfigToml) as Record<string, unknown>;
  } catch {
    return "unknown";
  }
  const projects = doc["projects"];
  if (typeof projects !== "object" || projects === null) return "untrusted";

  const norm = (p: string) => p.replace(/[\\/]+/g, "/").replace(/\/+$/, "").toLowerCase();
  const want = norm(projectRoot);
  let ancestor = false;

  for (const [key, value] of Object.entries(projects as Record<string, unknown>)) {
    const level = (value as { trust_level?: unknown } | null)?.trust_level;
    if (level !== "trusted") continue;
    const k = norm(key);
    if (k === want) return "trusted";
    if (want.startsWith(`${k}/`)) ancestor = true;
  }
  return ancestor ? "maybe-via-ancestor" : "untrusted";
}

/** Human-readable note for the Connect UI, or null when there is nothing to say. */
export function codexTrustNote(trust: CodexTrust): string | null {
  switch (trust) {
    case "trusted":
      return null; // nothing to warn about
    case "untrusted":
      return "codex will ignore this file until you trust the folder — it loads project config for trusted projects only.";
    case "maybe-via-ancestor":
      return "A parent folder is trusted, which may cover this one. If codex ignores the registration, trust this folder explicitly.";
    case "unknown":
      return "Could not read ~/.codex/config.toml to check whether this folder is trusted; codex loads project config for trusted folders only.";
  }
}

/**
 * Antigravity's connect-time caveat — the same shape as `codexTrustNote`, and
 * for the same reason: a per-host *condition* on whether a session is bound
 * belongs in a sentence the user sees at the moment it is installed, not in a
 * capability tier the UI has to infer.
 *
 * Unlike codex's, this one is unconditional. Codex's trust state is recorded in
 * a file Kanmer can read, so it can say whether *this* folder is trusted;
 * Antigravity's binding is a **per-session command-line flag**, so there is
 * nothing on disk to check — no project record, no trust list, no git root makes
 * it true. Connect proves the user plugin, while dispatch supplies `--add-dir`;
 * interactive sessions still need the same explicit binding.
 *
 * Deliberately silent about the Antigravity **IDE**: everything above is `agy`
 * 1.1.14, the IDE was never exercised, and ADR-0009's method clause makes an
 * unchecked host a finding rather than a default. So the note names the CLI it
 * measured and leaves the IDE alone rather than guessing in either direction.
 */
export function antigravityBindingNote(projectRoot: string): string {
  return (
    `Antigravity's Kanmer plugin is user-scoped and affects every Antigravity workspace for this user. ` +
    `Its CLI (\`agy\`) reads the plugin's MCP and skills only in a session bound to this folder: ` +
    `start it with \`agy --add-dir ${q(projectRoot)}\` (or a user-managed bound project); a bare \`agy\` will not see them. ` +
    `The CLI was checked at agy 1.1.14; the Antigravity IDE was not tested.`
  );
}

// ---------------------------------------------------------------------------
// The legacy global codex registrations, and the sweep that drains them.
//
// Before ADR-0007, Connect registered codex with `codex mcp add kanmer-<project>`
// — a command with no scope, so every project ever connected left an entry in
// the *global* `~/.codex/config.toml` that loads in every codex session started
// anywhere on the machine. Reconnecting one project drains only that project's
// entry, so ADR-0007's "the pile drains as projects reconnect" holds only for
// projects actually reconnected. This is the reconciliation that drains the
// rest (ADR-0010): list, classify, confirm once, remove — a no-op on run two.
//
// Everything here is a **pure function over the config text**. The global file
// is parsed for *listing only* and never re-serialised: feeding the real
// `~/.codex/config.toml` through TOML.parse → TOML.stringify was measured to
// change it (`startup_timeout_sec = 120.0` collapsing to `120` on a field codex
// reads as f64, and 65 literal-quoted `[projects.'c:\…']` trust headers
// rewritten double-quoted, comments dropped). Removal is delegated to
// `codex mcp remove`, which was verified surgical against a fixture.
// ---------------------------------------------------------------------------

/** One `[mcp_servers.kanmer-*]` entry found in the global codex config. */
export interface LegacyCodexEntry {
  /** The `mcp_servers.<name>` key — what `codex mcp remove` takes. */
  name: string;
  /**
   * The project the entry was written for, recovered from the entry's own
   * `args` as `--repo-root ?? --root`, or null when it carries neither.
   *
   * Never recovered from the name: `codexServerName` lowercases, slugifies and
   * truncates a basename to 32 chars, and basenames are not unique on a machine.
   */
  projectRoot: string | null;
}

/**
 * Every legacy global entry in a codex config, for listing. Pure.
 *
 * An unparseable file yields `[]` — reporting nothing beats guessing at a file
 * we cannot read, and the sweep's whole contract is that it never removes
 * something it has not positively identified.
 *
 * Scoped to `kanmer-*` **in exactly the shape `codexServerName` produces**. A
 * bare global `[mcp_servers.kanmer]` is deliberately out of scope: Kanmer never
 * wrote one there, so it is the user's own and not ours to delete. Anything with
 * a character that slug could not have produced is likewise not ours — and,
 * since the name is interpolated into a `codex mcp remove` command line, a TOML
 * *quoted* key (which may legally hold anything at all, including shell
 * metacharacters) must never reach a shell on our say-so.
 */
/** The exact shape `codexServerName` emits: `kanmer-` plus its slug alphabet. */
const LEGACY_NAME = /^kanmer-[A-Za-z0-9_-]+$/;

export function legacyCodexEntries(globalConfigToml: string | null): LegacyCodexEntry[] {
  if (!globalConfigToml?.trim()) return [];
  let doc: unknown;
  try {
    doc = TOML.parse(globalConfigToml);
  } catch {
    return [];
  }
  const servers = (doc as Record<string, unknown> | null)?.["mcp_servers"];
  if (typeof servers !== "object" || servers === null || Array.isArray(servers)) return [];
  const found: LegacyCodexEntry[] = [];
  for (const [name, value] of Object.entries(servers as Record<string, unknown>)) {
    if (!LEGACY_NAME.test(name)) continue;
    found.push({ name, projectRoot: rootFromArgs((value as { args?: unknown } | null)?.args) });
  }
  return found;
}

/** `--repo-root` if present, else `--root`, else null. Tolerates url-only entries. */
function rootFromArgs(args: unknown): string | null {
  if (!Array.isArray(args)) return null;
  const flagValue = (flag: string): string | null => {
    const at = args.indexOf(flag);
    if (at === -1) return null;
    const next: unknown = args[at + 1];
    return typeof next === "string" && next.trim() !== "" ? next : null;
  };
  return flagValue("--repo-root") ?? flagValue("--root");
}

/**
 * Why an entry may or may not be drained.
 *
 * - `drainable` — the project has a project-scoped registration codex will
 *   actually load. Safe to remove, and pre-selected.
 * - `no-replacement` — the project exists but has no `[mcp_servers.kanmer]`, so
 *   this global entry is its *only* working registration. **Reported, never
 *   removable**: removing it silently cuts board access to a project the user is
 *   not currently looking at. Kanmer does not write another project's config to
 *   fix that either — the user opens it and clicks Connect.
 * - `untrusted` — a replacement exists, but codex loads project config for
 *   trusted folders only, so the global entry is still the one in effect.
 *   Reported, not removable.
 * - `orphaned` — the recorded project folder is not there at all. Removable, but
 *   never pre-selected: the probe can be wrong about an unmounted drive.
 * - `unknown-root` — the entry carries no recoverable project root, so nothing
 *   can be checked about it. Not removable.
 */
export type LegacyCodexStatus =
  | "drainable"
  | "no-replacement"
  | "untrusted"
  | "orphaned"
  | "unknown-root";

/** What the caller must find out about an entry's project before it can be classified. */
export interface LegacyCodexProbe {
  /** Does the recorded project folder exist? */
  exists: boolean;
  /** Does `<root>/.codex/config.toml` carry `[mcp_servers.kanmer]`? */
  hasProjectRegistration: boolean;
  /** Will codex load that project file? (`codexTrustFromConfig` over the global config.) */
  trust: CodexTrust;
}

export interface LegacyCodexFinding extends LegacyCodexEntry {
  status: LegacyCodexStatus;
  /** May the sweep remove this entry at all? The UI must not offer a checkbox when false. */
  removable: boolean;
  /** Should it be selected by default? Only ever true for `drainable`. */
  recommended: boolean;
  /** One sentence for the user, naming the project and what to do. */
  detail: string;
}

/**
 * Classify one entry. Pure — the filesystem work is the caller's, which is what
 * makes the whole sweep testable without a real `~/.codex` (the machine that
 * reported this bug no longer reproduces it).
 */
export function classifyLegacyCodexEntry(
  entry: LegacyCodexEntry,
  probe: LegacyCodexProbe | null,
): LegacyCodexFinding {
  const base = { ...entry, removable: false, recommended: false };
  if (entry.projectRoot === null || probe === null) {
    return {
      ...base,
      status: "unknown-root",
      detail:
        "This entry records no project path, so Kanmer cannot tell whether removing it would " +
        "cut a project's only registration. Remove it by hand if you know what it was for.",
    };
  }
  if (!probe.exists) {
    return {
      ...base,
      status: "orphaned",
      removable: true,
      detail:
        `${entry.projectRoot} no longer exists, so this entry registers a board that is not ` +
        "there. If that drive is simply not mounted right now, leave it.",
    };
  }
  if (!probe.hasProjectRegistration) {
    return {
      ...base,
      status: "no-replacement",
      detail:
        `${entry.projectRoot} has no project-scoped registration, so this global entry is its ` +
        "only working one. Open that project in Kanmer and click Connect first — then this " +
        "entry can be removed.",
    };
  }
  if (probe.trust !== "trusted") {
    return {
      ...base,
      status: "untrusted",
      detail:
        `${entry.projectRoot} has a project-scoped registration, but codex loads project config ` +
        "for trusted folders only and does not report this one as trusted — so the global entry " +
        "is still the one in effect. Trust that folder in codex first.",
    };
  }
  return {
    ...base,
    status: "drainable",
    removable: true,
    recommended: true,
    detail: `${entry.projectRoot} is registered in its own .codex/config.toml — this global entry is redundant.`,
  };
}

/** Does a JSON config carry a `kanmer` server under the given top-level key? Pure. */
function jsonRegistrationState(existing: string, key: "mcp" | "mcpServers"): RegistrationState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(existing);
  } catch {
    return "indeterminate";
  }
  return hasKanmerUnder(parsed, key) ? "registered" : "absent";
}

/**
 * The Claude-compatible `mcpServers` shape — **antigravity's
 * `.agents/mcp_config.json` only**.
 *
 * grok used to share this pair into the project `.mcp.json`, which is the file
 * `claude mcp add -s project` writes: same file, same `kanmer` key, so
 * disconnecting grok deleted Claude's registration and `isRegistered` read
 * Claude's entry as grok's. grok now owns `.grok/config.toml` (ADR-0013) and no
 * Kanmer provider merges or unmerges `.mcp.json` at all.
 */
function mcpServersUnmerge(existing: string): string {
  return editJson(existing, (o) => {
    if (typeof o.mcpServers === "object" && o.mcpServers !== null) {
      delete (o.mcpServers as Record<string, unknown>).kanmer;
    }
  });
}

/** Claude's project registration shape, used for safe branch-only refreshes. */
function mcpServersMerge(existing: string | null, inv: Invocation): string {
  return editJson(existing, (o) => {
    const mcpServers = (typeof o.mcpServers === "object" && o.mcpServers !== null
      ? o.mcpServers
      : {}) as Record<string, unknown>;
    mcpServers.kanmer = {
      command: inv.command,
      args: inv.args,
      ...(Object.keys(inv.env).length > 0 ? { env: inv.env } : {}),
    };
    o.mcpServers = mcpServers;
  });
}
/** codex/claude `mcp add` command line (shared by both CLI providers). */
function cliAddArgv(id: "codex" | "claude", inv: Invocation, root: string): NativePluginCommand {
  const envFlag = id === "codex" ? "--env" : "-e";
  const envParts = Object.entries(inv.env).flatMap(([k, v]) => [envFlag, `${k}=${v}`]);
  const name = id === "claude" ? "kanmer" : codexServerName(root);
  const scope = id === "claude" ? ["-s", "project"] : [];
  const server = [inv.command, ...inv.args];
  return { file: id, args: ["mcp", "add", name, ...scope, ...envParts, "--", ...server] };
}

function cliAddCommand(id: "codex" | "claude", inv: Invocation, root: string): string {
  const command = cliAddArgv(id, inv, root);
  return [command.file, ...command.args].map(q).join(" ");
}

export const PROVIDERS: AgentProvider[] = [
  {
    id: "codex",
    label: "Codex",
    register: {
      kind: "configFile",
      // One entry per project, in the project (ADR-0007). The folder must be
      // trusted for codex to load it — Connect says so, and can check.
      configPath: STALENESS_PROVIDER_PATHS.codex.registrationFile,
      merge: tomlMcpServersMerge,
      unmerge: tomlMcpServersUnmerge,
      registrationState: tomlRegistrationState,
      // Legacy cleanup: drain the per-project global entries older versions
      // wrote. Best-effort — a failure here must never fail the connect.
      removeCommands: (root) => [`codex mcp remove ${codexServerName(root)}`],
    },
    install: {
      kind: "marketplace",
      // Two commands, because `marketplace add` alone leaves the plugin
      // uninstalled — `codex plugin list` says so in as many words
      // ("kanmer@kanmer-plugins  not installed"). codex's verb is `add`; there
      // is no `codex plugin install`. Skills only: codex cannot run a
      // plugin-supplied MCP server (FRD-012 R6), so its board still comes from
      // Connect's `.codex/config.toml` entry — MCP-016 owns that question.
      marketplaceCommands: (marketplaceRoot) => [
        `codex plugin marketplace add ${q(marketplaceRoot)}`,
        "codex plugin add kanmer@kanmer-plugins",
      ],
    },
    dispatch: true,
    ...sharedDispatchSpec("codex"),
  },
  {
    id: "claude",
    label: "Claude Code",
    register: {
      kind: "cli",
      addCommand: (inv, root) => cliAddCommand("claude", inv, root),
      addArgv: (inv, root) => cliAddArgv("claude", inv, root),
      removeCommands: () => [
        "claude mcp remove kanmer -s project",
        "claude mcp remove kanmer -s user", // stale user-scope entry older versions wrote
      ],
      configPath: ".mcp.json",
      registrationState: (existing) => jsonRegistrationState(existing, "mcpServers"),
      merge: mcpServersMerge,
    },
    install: {
      kind: "marketplace",
      // `kanmer@kanmer` reads oddly but is right: plugin `kanmer` from the
      // marketplace `.claude-plugin/marketplace.json` names `kanmer`.
      marketplaceCommands: (marketplaceRoot) => [
        `claude plugin marketplace add ${q(marketplaceRoot)}`,
        "claude plugin install kanmer@kanmer",
      ],
    },
    dispatch: true,
    ...sharedDispatchSpec("claude"),
  },
  {
    id: "opencode",
    label: "opencode",
    register: {
      kind: "configFile",
      configPath: STALENESS_PROVIDER_PATHS.opencode.registrationFile,
      merge: opencodeMerge,
      unmerge: opencodeUnmerge,
      registrationState: opencodeRegistrationState,
    },
    // OpenCode has a native project-scoped skills directory. Keep its Kanmer
    // roster there instead of the legacy cross-agent `.agents/skills` tree.
    install: {
      kind: "copySkills",
      skillsScope: "project",
      skillsDir: STALENESS_PROVIDER_PATHS.opencode.skillsDir,
    },
    dispatch: true,
    ...sharedDispatchSpec("opencode"),
  },
  {
    id: "grok",
    label: "Grok CLI",
    // Grok's native plugin is user-scoped and supplies both skills and the MCP
    // server. Connect must not write a project registration or copy skills;
    // the legacy paths remain here solely so a successful install/uninstall can
    // retire residue from older Kanmer releases without touching user content.
    register: { kind: "none" },
    install: {
      kind: "plugin",
      scope: "user",
      pluginName: "kanmer",
      cli: "grok",
      helpCommand: () => "grok plugin --help",
      installCommand: (root) => `grok plugin install ${q(root)} --trust`,
      uninstallCommand: () => "grok plugin uninstall kanmer --confirm",
      listCommand: () => "grok plugin list",
      inspectCommand: () => "grok inspect",
      functionalCommand: (root, _boardRoot, boardBranch) => `grok -p ${q(nativeFunctionalPrompt(boardBranch))} --cwd ${q(root)}`,
      requiredFiles: (root) => [
        join(root, ".claude-plugin", "plugin.json"),
        join(root, "skills"),
        join(root, "mcp", "claude.mcp.json"),
        join(root, "mcp", "kanmer-mcp.cjs"),
      ],
      capabilityPresent: nativePluginCapabilityPresent.bind(null, "kanmer"),
      descriptorPath: (root) => join(root, "mcp", "claude.mcp.json"),
      legacyConfigPath: STALENESS_PROVIDER_PATHS.grok.registrationFile,
      legacyConfigUnmerge: tomlMcpServersUnmerge,
      legacyRegistrationState: (existing) => tomlRegistrationState(existing),
      legacySkillsDir: STALENESS_PROVIDER_PATHS.grok.skillsDir,
      argv: {
        version: () => ({ file: "grok", args: ["--version"] }),
        help: () => ({ file: "grok", args: ["plugin", "--help"] }),
        install: (root) => ({ file: "grok", args: ["plugin", "install", root, "--trust"] }),
        uninstall: () => ({ file: "grok", args: ["plugin", "uninstall", "kanmer", "--confirm"] }),
        list: () => ({ file: "grok", args: ["plugin", "list"] }),
        inspect: () => ({ file: "grok", args: ["inspect"] }),
        functional: (root, _boardRoot, boardBranch) => ({
          file: "grok",
          args: [
            "-p",
            nativeFunctionalPrompt(boardBranch),
            "--cwd",
            root,
          ],
        }),
      },
    },
    dispatch: true,
    ...sharedDispatchSpec("grok"),
  },
  {
    id: "antigravity",
    label: "Antigravity",
    // Native user plugin. Connect never writes project `.agents` state for new
    // installs; those paths remain migration inputs for pre-MCP-015 connects.
    register: { kind: "none" },
    install: {
      kind: "plugin",
      scope: "user",
      pluginName: "kanmer",
      cli: "agy",
      helpCommand: () => "agy plugin --help",
      installCommand: (root) => `agy plugin install ${q(root)}`,
      uninstallCommand: () => "agy plugin uninstall kanmer",
      listCommand: () => "agy plugin list",
      // agy 1.1.14 has no inspect subcommand; list is the supported status
      // oracle. Functional capability still requires a bound real tool call.
      inspectCommand: () => "agy plugin list",
      validateCommand: (root) => `agy plugin validate ${q(root)}`,
      functionalCommand: (root, _boardRoot, boardBranch) =>
        `agy --add-dir ${q(root)} -p ${q(nativeFunctionalPrompt(boardBranch))}`,
      requiredFiles: (root) => [
        join(root, "plugin.json"),
        join(root, "mcp_config.json"),
        join(root, "skills"),
        join(root, "mcp", "kanmer-mcp.cjs"),
      ],
      capabilityPresent: nativePluginCapabilityPresent.bind(null, "kanmer"),
      descriptorPath: (root) => join(root, "mcp_config.json"),
      legacyConfigPath: STALENESS_PROVIDER_PATHS.antigravity.registrationFile,
      legacyConfigUnmerge: mcpServersUnmerge,
      legacyRegistrationState: (existing) => jsonRegistrationState(existing, "mcpServers"),
      legacySkillsDir: STALENESS_PROVIDER_PATHS.antigravity.skillsDir,
      argv: {
        version: () => ({ file: "agy", args: ["--version"] }),
        help: () => ({ file: "agy", args: ["plugin", "--help"] }),
        runtime: () => {
          const invocation = antigravityPortableInvocation(true);
          return { file: invocation.command, args: invocation.args };
        },
        install: (root) => ({ file: "agy", args: ["plugin", "install", root] }),
        uninstall: () => ({ file: "agy", args: ["plugin", "uninstall", "kanmer"] }),
        list: () => ({ file: "agy", args: ["plugin", "list"] }),
        // agy 1.1.14 has no inspect subcommand; list is the supported oracle.
        inspect: () => ({ file: "agy", args: ["plugin", "list"] }),
        validate: (root) => ({ file: "agy", args: ["plugin", "validate", root] }),
        functional: (_projectRoot, boardRoot, boardBranch) => ({
          file: "agy",
          args: [
            "--add-dir",
            boardRoot,
            "-p",
            nativeFunctionalPrompt(boardBranch),
          ],
        }),
      },
    },
    dispatch: true,
    ...sharedDispatchSpec("antigravity"),
  },
];

export function providerById(id: string): AgentProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** The provider list the Connect UI renders from (no hardcoded host names). */
export function listProviders(): { id: ProviderId; label: string; dispatch: boolean; model?: { flag: string; evidence: string } }[] {
  return PROVIDERS.map((p) => {
    const shared = p.dispatch ? dispatchProviderById(p.id) : undefined;
    return { id: p.id, label: p.label, dispatch: p.dispatch, ...(shared?.modelOption ? { model: { flag: shared.modelOption.flag, evidence: shared.modelOption.evidence } } : {}) };
  });
}

/** Providers that support a background dispatch (for the "Dispatch to agent →" menu). */
export function dispatchableProviders(): { id: ProviderId; label: string }[] {
  return listDispatchProviders().map(({ id, label }) => ({ id, label }));
}
