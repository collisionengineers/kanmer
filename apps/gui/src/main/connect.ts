import { app } from "electron";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  isNewerVersion,
  providerById,
  SKILLS_VERSION_FILE,
  type AgentProvider,
  type Invocation,
  type ProviderId,
  codexTrustFromConfig,
  codexTrustNote,
} from "./providers.js";
import { applyManagedBlock, removeManagedBlock } from "./agentsBlock.js";

const execAsync = promisify(exec);

/** Back-compat alias — the IPC layer still refers to a "connect target". */
export type ConnectTarget = ProviderId;

export interface ConnectResult {
  ok: boolean;
  /** The exact command a user could run by hand (for the copy fallback), or a note. */
  command: string;
  output: string;
}

/**
 * How to launch the MCP server: via the Electron binary as Node
 * (ELECTRON_RUN_AS_NODE=1), so the target machine needs no separate Node.
 */
function serverInvocation(boardRoot: string, sourceRoot: string): Invocation {
  const env = { ELECTRON_RUN_AS_NODE: "1" };
  let script: string;
  if (app.isPackaged) {
    script = join(process.resourcesPath, "mcp", "kanmer-mcp.cjs");
  } else {
    const installRoot = resolve(app.getAppPath(), "..", "..");
    const standalone = join(installRoot, "packages", "mcp-server", "dist", "standalone", "kanmer-mcp.cjs");
    const esm = join(installRoot, "packages", "mcp-server", "dist", "index.js");
    script = existsSync(standalone) ? standalone : esm;
  }
  const args = [script, "--root", boardRoot];
  // Only when the board is elsewhere: `refs` resolve against the source
  // checkout, and the server cannot see it from --root alone.
  if (resolve(sourceRoot) !== resolve(boardRoot)) args.push("--repo-root", sourceRoot);
  return { command: process.execPath, args, env };
}

/** Where the bundled plugin (skills + marketplace source) lives — dev vs packaged. */
function pluginRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, "plugins", "kanmer");
  return join(resolve(app.getAppPath(), "..", ".."), "plugins", "kanmer");
}

/** The version of the bundled skill set, read from the plugin manifest. */
async function bundledSkillsVersion(): Promise<string> {
  try {
    const manifest = JSON.parse(
      await readFile(join(pluginRoot(), ".claude-plugin", "plugin.json"), "utf8"),
    ) as { version?: unknown };
    return typeof manifest.version === "string" ? manifest.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function writeAtomic(file: string, contents: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, file);
}

/** Resolve a provider config path (`~/` = home) to an absolute path. */
function resolveConfigPath(rel: string, root: string): string {
  return rel.startsWith("~/") ? join(homedir(), rel.slice(2)) : join(root, rel);
}

async function ensureAgentsBlock(root: string): Promise<void> {
  const file = join(root, "AGENTS.md");
  const existing = existsSync(file) ? await readFile(file, "utf8") : null;
  await writeAtomic(file, applyManagedBlock(existing));
}

async function dropAgentsBlock(root: string): Promise<void> {
  const file = join(root, "AGENTS.md");
  if (!existsSync(file)) return;
  const next = removeManagedBlock(await readFile(file, "utf8"));
  if (next === null) await rm(file, { force: true });
  else await writeAtomic(file, next);
}

/** Remove only the bundled skills Kanmer owns, preserving any host/user skills. */
export async function removeBundledSkillsOnly(
  root: string,
  skillsDir: string,
  bundledSkillsRoot = join(pluginRoot(), "skills"),
): Promise<void> {
  const destination = join(root, skillsDir);
  if (!existsSync(destination)) return;
  const bundled = await readdir(bundledSkillsRoot, { withFileTypes: true });
  for (const entry of bundled) {
    // Bundled skill folders are direct children; never let a path escape the destination.
    if (!entry.isDirectory() || entry.name.includes("/") || entry.name.includes("\\") || entry.name === ".") continue;
    await rm(join(destination, entry.name), { recursive: true, force: true });
  }
  await rm(join(destination, SKILLS_VERSION_FILE), { force: true });
  if ((await readdir(destination)).length === 0) await rmdir(destination);
}

/** True only when the provider's project config still names Kanmer. */
async function isRegistered(provider: AgentProvider, root: string): Promise<boolean> {
  if (provider.register.kind !== "configFile") return false;
  const file = resolveConfigPath(provider.register.configPath, root);
  if (!existsSync(file)) return false;
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false;
    const obj = parsed as Record<string, unknown>;
    const entries = provider.id === "opencode" ? obj.mcp : obj.mcpServers;
    return typeof entries === "object" && entries !== null && !Array.isArray(entries) &&
      Object.hasOwn(entries as object, "kanmer");
  } catch {
    // A malformed/indeterminate configuration must retain shared instructions.
    return true;
  }
}

async function hasRegisteredCopySkillsPeer(id: ProviderId, root: string): Promise<boolean> {
  const peers = ["opencode", "grok", "antigravity"]
    .map((peerId) => providerById(peerId))
    .filter((peer): peer is AgentProvider => peer !== undefined && peer.id !== id && peer.install.kind === "copySkills");
  for (const peer of peers) {
    if (await isRegistered(peer, root)) return true;
  }
  return false;
}

/** Install skills for a provider; returns a short human note. */
async function installSkills(provider: AgentProvider, root: string): Promise<string> {
  if (provider.install.kind === "marketplace") {
    const notes: string[] = [];
    for (const cmd of provider.install.marketplaceCommands(pluginRoot())) {
      try {
        await execAsync(cmd, { cwd: root });
        notes.push("plugin installed");
      } catch (e) {
        notes.push(`plugin cmd skipped (${e instanceof Error ? e.message.split("\n")[0] : e})`);
      }
    }
    return notes.join("; ");
  }
  // copySkills: always ensure the AGENTS.md block; copy skills for a project dir.
  await ensureAgentsBlock(root);
  if (provider.install.skillsScope === "project" && provider.install.skillsDir) {
    const dest = join(root, provider.install.skillsDir);
    await mkdir(dest, { recursive: true });
    await cp(join(pluginRoot(), "skills"), dest, { recursive: true });
    // Stamp the copy so getSkillsStatus can offer "Update skills" later.
    const version = await bundledSkillsVersion();
    await writeFile(join(dest, SKILLS_VERSION_FILE), `${version}\n`, "utf8");
    return `skills v${version} → ${provider.install.skillsDir}, AGENTS.md block ensured`;
  }
  return "AGENTS.md block ensured (host reads AGENTS.md for skills)";
}

export interface SkillsStatus {
  /** How this host receives skills. */
  scope: "marketplace" | "project" | "agentsOnly";
  /** The stamped version of the copied skill set (project scope only), else null. */
  installedVersion: string | null;
  /** The version bundled with this app. */
  bundledVersion: string;
  /** True when a copied skill set is present but older than the bundled one. */
  updateAvailable: boolean;
}

/**
 * Report whether a copied skill set is present and outdated (Phase 6.2). Only
 * meaningful for project-scope copies (grok): marketplace hosts manage their own
 * plugin, and agentsOnly hosts read the always-refreshed AGENTS.md block.
 */
export async function skillsStatus(id: ProviderId, projectRoot: string): Promise<SkillsStatus> {
  const provider = providerById(id);
  const bundledVersion = await bundledSkillsVersion();
  const base: SkillsStatus = {
    scope: "marketplace",
    installedVersion: null,
    bundledVersion,
    updateAvailable: false,
  };
  if (!provider || provider.install.kind === "marketplace") return base;
  if (provider.install.skillsScope !== "project" || !provider.install.skillsDir) {
    return { ...base, scope: "agentsOnly" };
  }
  const marker = join(projectRoot, provider.install.skillsDir, SKILLS_VERSION_FILE);
  let installedVersion: string | null = null;
  if (existsSync(marker)) installedVersion = (await readFile(marker, "utf8")).trim() || null;
  return {
    scope: "project",
    installedVersion,
    bundledVersion,
    updateAvailable: installedVersion !== null && isNewerVersion(bundledVersion, installedVersion),
  };
}

/** Re-copy the bundled skills for a provider (the "Update skills" action). */
export async function updateSkills(id: ProviderId, projectRoot: string): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  try {
    const note = await installSkills(provider, projectRoot);
    return { ok: true, command: `update-skills ${id}`, output: note };
  } catch (err) {
    return {
      ok: false,
      command: `update-skills ${id}`,
      output: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Connect a provider: register Kanmer's MCP server (a CLI `mcp add` or a
 * config-file merge) and install the skills (a marketplace CLI, or the AGENTS.md
 * block + a project skills copy). Idempotent — re-running just refreshes.
 */
export async function connectAgent(id: ProviderId, projectRoot: string, boardRoot: string): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  const inv = serverInvocation(boardRoot, projectRoot);
  try {
    let command: string;
    let output: string;
    if (provider.register.kind === "cli") {
      command = provider.register.addCommand(inv, projectRoot);
      for (const cmd of provider.register.removeCommands(projectRoot)) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined); // ignore "not found"
      }
      const { stdout, stderr } = await execAsync(command, { cwd: projectRoot });
      output = (stdout || stderr || "Registered.").trim();
    } else {
      const path = resolveConfigPath(provider.register.configPath, projectRoot);
      const existing = existsSync(path) ? await readFile(path, "utf8") : null;
      await writeAtomic(path, provider.register.merge(existing, inv));
      // Legacy cleanup alongside the merge: codex drains the global
      // `kanmer-<project>` entries older versions wrote. Best-effort — the
      // registration already succeeded, so a stale CLI must not fail it.
      for (const cmd of provider.register.removeCommands?.(projectRoot) ?? []) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined);
      }
      command = `wrote ${provider.register.configPath}`;
      output = `Registered Kanmer in ${provider.register.configPath}.`;
      // codex only reads project config for trusted folders, and trust is
      // recorded globally — so say whether THIS folder is trusted rather than
      // showing an unconditional caveat.
      if (id === "codex") {
        const globalCfg = join(homedir(), ".codex", "config.toml");
        const note = codexTrustNote(
          codexTrustFromConfig(
            existsSync(globalCfg) ? await readFile(globalCfg, "utf8") : null,
            projectRoot,
          ),
        );
        if (note) output += ` ${note}`;
      }
    }
    const skills = await installSkills(provider, projectRoot).catch(
      (e) => `skills failed: ${e instanceof Error ? e.message : e}`,
    );
    return { ok: true, command, output: `${output} ${skills}`.trim() };
  } catch (err) {
    const command =
      provider.register.kind === "cli"
        ? provider.register.addCommand(inv, projectRoot)
        : `edit ${provider.register.configPath}`;
    return { ok: false, command, output: err instanceof Error ? err.message : String(err) };
  }
}

/** Disconnect a provider: unregister the server and remove copied skills + the block. */
export async function disconnectAgent(id: ProviderId, projectRoot: string): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  try {
    const cleanupNotes: string[] = ["provider registration removed"];
    if (provider.register.kind === "cli") {
      for (const cmd of provider.register.removeCommands(projectRoot)) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined);
      }
    } else {
      const path = resolveConfigPath(provider.register.configPath, projectRoot);
      if (existsSync(path)) {
        await writeAtomic(path, provider.register.unmerge(await readFile(path, "utf8")));
      }
      // Disconnect should leave nothing behind, including the legacy global
      // entry a previous version of Kanmer wrote.
      for (const cmd of provider.register.removeCommands?.(projectRoot) ?? []) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined);
      }
    }
    if (provider.install.kind === "copySkills") {
      if (provider.install.skillsScope === "project" && provider.install.skillsDir) {
        await removeBundledSkillsOnly(projectRoot, provider.install.skillsDir);
        cleanupNotes.push("bundled copied skills removed");
      }
      const peerRemains = await hasRegisteredCopySkillsPeer(id, projectRoot);
      if (peerRemains) {
        cleanupNotes.push("AGENTS.md block retained for another connected host");
      } else {
        await dropAgentsBlock(projectRoot);
        cleanupNotes.push("AGENTS.md block removed; no connected copy-skills host remains");
      }
    }
    return { ok: true, command: `disconnect ${id}`, output: cleanupNotes.join("; ") };
  } catch (err) {
    return {
      ok: false,
      command: `disconnect ${id}`,
      output: err instanceof Error ? err.message : String(err),
    };
  }
}
