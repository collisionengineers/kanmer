// The agent-provider registry. Each host declares how to register Kanmer's MCP
// server (a CLI `mcp add` or a config-file merge) and how skills install
// (a marketplace CLI or copy-skills + the AGENTS.md block). Every register /
// merge is a pure function, so connect.ts is a thin dispatcher and the whole
// surface is unit-testable without spawning anything.
import { basename } from "node:path";

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
      kind: "cli",
      addCommand: (inv, root) => cliAddCommand("codex", inv, root),
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
    // opencode's documented skills fallback is ~/.claude/skills (Claude's GLOBAL
    // dir) — writing there duplicates skills across every project, so v1 relies
    // on the AGENTS.md block, which opencode reads.
    install: { kind: "copySkills", skillsScope: "agentsOnly" },
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
    // Skills live under ~/.gemini/skills (global) — rely on the AGENTS.md block in v1.
    install: { kind: "copySkills", skillsScope: "agentsOnly" },
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
