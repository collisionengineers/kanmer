// The agent-provider registry. Each host declares how to register Kanmer's MCP
// server (a CLI `mcp add` or a config-file merge) and how skills install
// (a marketplace CLI or copy-skills + the AGENTS.md block). Every register /
// merge is a pure function, so connect.ts is a thin dispatcher and the whole
// surface is unit-testable without spawning anything.
import { basename } from "node:path";
import * as TOML from "smol-toml";

export type ProviderId = "codex" | "claude" | "opencode" | "grok" | "antigravity";

export interface Invocation {
  /** The executable that runs the server (the Electron binary as node). */
  command: string;
  /** [serverScript, "--root", projectRoot]. */
  args: string[];
  env: Record<string, string>;
}

export type RegisterSpec =
  | {
      kind: "cli";
      addCommand: (inv: Invocation, root: string) => string;
      removeCommands: (root: string) => string[];
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
       * Optional best-effort CLI cleanup run alongside the merge — codex uses it
       * to drain the global `kanmer-<project>` entries older versions wrote.
       * A failure here must never fail the connect.
       */
      removeCommands?: (root: string) => string[];
    };

export type InstallSpec =
  | { kind: "marketplace"; marketplaceCommands: (localDir: string) => string[] }
  | { kind: "copySkills"; skillsScope: "project" | "global" | "agentsOnly"; skillsDir?: string };

export interface AgentProvider {
  id: ProviderId;
  label: string;
  register: RegisterSpec;
  install: InstallSpec;
  /** Headless dispatch supported in v1 (Phase 7)? antigravity is register-only. */
  dispatch: boolean;
  /**
   * The CLI + args to spawn for a background dispatch (the executable is `cli`,
   * the args carry the prompt). Absent when the host isn't dispatchable.
   */
  dispatchCli?: string;
  dispatchArgs?: (prompt: string, root: string) => string[];
}

/** Quote a shell argument for the copy-paste fallback command line. */
export function q(s: string): string {
  return /[\s"]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

/** The stamp a copied skill set carries so Connect can offer "Update skills". */
export const SKILLS_VERSION_FILE = ".kanmer-skills-version";

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

/**
 * `<root>/.codex/config.toml` — the project-scoped codex registration.
 *
 * `codex mcp add` has no scope flag and always writes the global
 * `~/.codex/config.toml` (verified against the installed CLI, 2026-08-16), so
 * merging the project file by hand is the only route to one entry per project
 * rather than one global entry per project forever (ADR-0007).
 *
 * The merge must preserve everything it does not own: a project file can carry
 * unrelated tables, other MCP servers, and comments-adjacent formatting. Parsing
 * to a value and re-serialising loses comments — accepted, and the reason the
 * unmerge is surgical about touching only `mcp_servers.kanmer`.
 */
function codexTomlMerge(existing: string | null, inv: Invocation): string {
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
  servers["kanmer"] = {
    command: inv.command,
    args: inv.args,
    // ELECTRON_RUN_AS_NODE is not optional: the registered command is the
    // Electron binary, which runs the server as Node only with this set.
    env: inv.env,
  };
  doc["mcp_servers"] = servers;
  return `${TOML.stringify(doc)}\n`;
}

function codexTomlUnmerge(existing: string): string {
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

/** The Claude-compatible `mcpServers` shape (antigravity project config, grok .mcp.json). */
function mcpServersMerge(existing: string | null, inv: Invocation): string {
  return editJson(existing, (o) => {
    const servers = (typeof o.mcpServers === "object" && o.mcpServers !== null
      ? o.mcpServers
      : {}) as Record<string, unknown>;
    servers.kanmer = { command: inv.command, args: inv.args, env: inv.env };
    o.mcpServers = servers;
  });
}
function mcpServersUnmerge(existing: string): string {
  return editJson(existing, (o) => {
    if (typeof o.mcpServers === "object" && o.mcpServers !== null) {
      delete (o.mcpServers as Record<string, unknown>).kanmer;
    }
  });
}

/** codex/claude `mcp add` command line (shared by both CLI providers). */
function cliAddCommand(id: "codex" | "claude", inv: Invocation, root: string): string {
  const envFlag = id === "codex" ? "--env" : "-e";
  const envParts = Object.entries(inv.env).flatMap(([k, v]) => [envFlag, `${k}=${v}`]);
  const name = id === "claude" ? "kanmer" : codexServerName(root);
  const scope = id === "claude" ? ["-s", "project"] : [];
  const server = [inv.command, ...inv.args];
  return [id, "mcp", "add", name, ...scope, ...envParts, "--", ...server].map(q).join(" ");
}

export const PROVIDERS: AgentProvider[] = [
  {
    id: "codex",
    label: "Codex",
    register: {
      kind: "configFile",
      // One entry per project, in the project (ADR-0007). The folder must be
      // trusted for codex to load it — Connect says so, and can check.
      configPath: ".codex/config.toml",
      merge: codexTomlMerge,
      unmerge: codexTomlUnmerge,
      // Legacy cleanup: drain the per-project global entries older versions
      // wrote. Best-effort — a failure here must never fail the connect.
      removeCommands: (root) => [`codex mcp remove ${codexServerName(root)}`],
    },
    install: {
      kind: "marketplace",
      marketplaceCommands: (dir) => [`codex plugin marketplace add ${q(dir)}`],
    },
    dispatch: true,
    dispatchCli: "codex",
    dispatchArgs: (prompt) => ["exec", prompt],
  },
  {
    id: "claude",
    label: "Claude Code",
    register: {
      kind: "cli",
      addCommand: (inv, root) => cliAddCommand("claude", inv, root),
      removeCommands: () => [
        "claude mcp remove kanmer -s project",
        "claude mcp remove kanmer -s user", // stale user-scope entry older versions wrote
      ],
    },
    install: {
      kind: "marketplace",
      marketplaceCommands: (dir) => [
        `claude plugin marketplace add ${q(dir)}`,
        "claude plugin install kanmer@kanmer",
      ],
    },
    dispatch: true,
    dispatchCli: "claude",
    dispatchArgs: (prompt) => ["-p", prompt],
  },
  {
    id: "opencode",
    label: "opencode",
    register: {
      kind: "configFile",
      configPath: "opencode.json",
      merge: opencodeMerge,
      unmerge: opencodeUnmerge,
    },
    // Verified 2026-08-16 against opencode's current docs: it searches
    // `.agents/skills/<name>/SKILL.md` (position 5 of 6), so one project-scoped
    // tree serves it properly. The old note here said the only fallback was
    // Claude's *global* dir, which would have leaked skills across every
    // project — that was the stale fact ADR-0009 exists to catch.
    install: { kind: "copySkills", skillsScope: "project", skillsDir: ".agents/skills" },
    dispatch: true,
    dispatchCli: "opencode",
    dispatchArgs: (prompt) => ["run", prompt],
  },
  {
    id: "grok",
    label: "Grok CLI",
    register: {
      kind: "configFile",
      // Prefer the project .mcp.json (JSON, carries env, no TOML dep) over ~/.grok/config.toml.
      configPath: ".mcp.json",
      merge: mcpServersMerge,
      unmerge: mcpServersUnmerge,
    },
    install: { kind: "copySkills", skillsScope: "project", skillsDir: ".grok/skills" },
    dispatch: true,
    dispatchCli: "grok",
    dispatchArgs: (prompt, root) => ["-p", prompt, "--cwd", root],
  },
  {
    id: "antigravity",
    label: "Antigravity",
    register: {
      kind: "configFile",
      configPath: ".agents/mcp_config.json",
      merge: mcpServersMerge,
      unmerge: mcpServersUnmerge,
    },
    // Verified 2026-08-16: `.agents/skills` is Antigravity's *primary* project
    // location (`.agent/` singular is kept only for backward compatibility), so
    // it reads the very same tree opencode does — one write, two hosts.
    install: { kind: "copySkills", skillsScope: "project", skillsDir: ".agents/skills" },
    // `agy -p` is known-broken piped (GH #318/#76) → register-only in v1.
    dispatch: false,
  },
];

export function providerById(id: string): AgentProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** The provider list the Connect UI renders from (no hardcoded host names). */
export function listProviders(): { id: ProviderId; label: string; dispatch: boolean }[] {
  return PROVIDERS.map((p) => ({ id: p.id, label: p.label, dispatch: p.dispatch }));
}

/** Providers that support a background dispatch (for the "Dispatch to agent →" menu). */
export function dispatchableProviders(): { id: ProviderId; label: string }[] {
  return PROVIDERS.filter((p) => p.dispatch && p.dispatchCli && p.dispatchArgs).map((p) => ({
    id: p.id,
    label: p.label,
  }));
}
