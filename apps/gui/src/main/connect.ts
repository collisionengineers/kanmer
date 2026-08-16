import { app } from "electron";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  formatSkillsStamp,
  isNewerVersion,
  parseSkillsStamp,
  providerById,
  RETIRED_SKILL_PATHS,
  SKILLS_VERSION_FILE,
  type AgentProvider,
  type Invocation,
  type ProviderId,
  codexTrustFromConfig,
  codexTrustNote,
  classifyLegacyCodexEntry,
  legacyCodexEntries,
  q,
  tomlRegistrationState,
  type LegacyCodexFinding,
  type LegacyCodexProbe,
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

/**
 * A single path segment that cannot escape the destination it is joined onto.
 * Every name below is read off disk or out of a file a user can edit, so this
 * guard sits between "a name we found" and `rm(..., { recursive: true })`.
 */
function isSafeSkillSegment(name: string): boolean {
  return name !== "" && name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\");
}

/** The skill folders the current bundle ships — direct children only. */
async function bundledSkillNames(bundledSkillsRoot: string): Promise<string[]> {
  const entries = await readdir(bundledSkillsRoot, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && isSafeSkillSegment(e.name)).map((e) => e.name);
}

/** The roster a previous install stamped here, or null when it predates the roster. */
async function recordedRoster(destination: string): Promise<string[] | null> {
  const marker = join(destination, SKILLS_VERSION_FILE);
  if (!existsSync(marker)) return null;
  try {
    const { roster } = parseSkillsStamp(await readFile(marker, "utf8"));
    return roster === null ? null : roster.filter(isSafeSkillSegment);
  } catch {
    return null;
  }
}

/**
 * Remove the closed tombstone list (see `RETIRED_SKILL_PATHS`) — the repair for
 * installs made before the roster existed. Returns what it actually deleted.
 */
async function removeRetiredPaths(destination: string): Promise<string[]> {
  const removed: string[] = [];
  for (const rel of RETIRED_SKILL_PATHS) {
    const segments = rel.split("/").filter((s) => s !== "");
    if (segments.length === 0 || !segments.every(isSafeSkillSegment)) continue;
    const target = join(destination, ...segments);
    if (!existsSync(target)) continue;
    await rm(target, { recursive: true, force: true });
    removed.push(rel);
  }
  return removed;
}

export interface SkillsReconcileResult {
  /** Owned folders that did not exist here before — nothing could have been lost. */
  installed: string[];
  /** Owned folders that existed and were replaced wholesale: any local edit inside them is gone. */
  replaced: string[];
  /** Folders and files removed because Kanmer no longer ships them. */
  removed: string[];
}

/**
 * Make the destination match the bundle **for the skills Kanmer owns**, and
 * touch nothing else. This is the reconciliation that install used to skip:
 * `cp` merges, so it could only ever add.
 *
 * Both roots are parameters rather than resolved from `pluginRoot()` so this is
 * drivable against real directories in a test — the same seam
 * `removeBundledSkillsOnly` already used for its bundle root.
 */
export async function reconcileSkills(
  destination: string,
  bundledSkillsRoot: string,
  version: string,
): Promise<SkillsReconcileResult> {
  const bundled = await bundledSkillNames(bundledSkillsRoot);
  // The recorded roster is the deletion authority. A stamp without one says "I
  // do not know what I own here", and the safe answer is the pre-roster
  // behaviour — the names Kanmer currently ships — which deletes nothing it
  // cannot account for.
  const owned = (await recordedRoster(destination)) ?? bundled;

  const removed = new Set<string>();
  for (const name of owned) {
    if (bundled.includes(name)) continue;
    const target = join(destination, name);
    if (!existsSync(target)) continue;
    await rm(target, { recursive: true, force: true });
    removed.add(name);
  }
  for (const rel of await removeRetiredPaths(destination)) removed.add(rel);

  await mkdir(destination, { recursive: true });
  const installed: string[] = [];
  const replaced: string[] = [];
  for (const name of bundled) {
    const target = join(destination, name);
    const existed = existsSync(target);
    // Replace, never merge. Retirement has a second shape — a file deleted or
    // renamed *inside* a folder that survives — and merging leaves it behind
    // (`kanmer-research/assets/impact-template.md` is exactly that case).
    if (existed) await rm(target, { recursive: true, force: true });
    await cp(join(bundledSkillsRoot, name), target, { recursive: true });
    (existed ? replaced : installed).push(name);
  }

  // Stamped last on purpose: a crash mid-reconcile leaves a stamp that
  // under-claims ownership rather than one claiming folders Kanmer never wrote.
  await writeFile(join(destination, SKILLS_VERSION_FILE), formatSkillsStamp(version, bundled), "utf8");
  return { installed, replaced, removed: [...removed] };
}

/**
 * Remove what Kanmer actually installed here, and nothing else.
 *
 * "Owns" is not "currently ships" — that equation was the bug, and it was
 * written into this function's own doc comment: it enumerated the *live bundle*,
 * so a skill retired since the install was never named and survived the one
 * operation whose job is to leave nothing behind. The destination's stamped
 * roster is the record of what Kanmer wrote. `bundledSkillsRoot` remains as the
 * fallback for a stamp that predates the roster (and as the tests' seam).
 */
export async function removeBundledSkillsOnly(
  root: string,
  skillsDir: string,
  bundledSkillsRoot = join(pluginRoot(), "skills"),
): Promise<void> {
  const destination = join(root, skillsDir);
  if (!existsSync(destination)) return;
  const owned = (await recordedRoster(destination)) ?? (await bundledSkillNames(bundledSkillsRoot));
  for (const name of owned) {
    await rm(join(destination, name), { recursive: true, force: true });
  }
  await removeRetiredPaths(destination);
  await rm(join(destination, SKILLS_VERSION_FILE), { force: true });
  if ((await readdir(destination)).length === 0) await rmdir(destination);
}

/**
 * True only when the provider's project config still names Kanmer.
 *
 * The *shape* question belongs to the provider that owns the file
 * (`register.isRegistered`), not to this function. It used to be answered here
 * with one hardcoded JSON shape, which had two consequences: a TOML-configured
 * host could never be answered for at all, and grok was answered out of
 * `.mcp.json` — Claude's file — so a Claude-only project reported grok
 * registered and kept the AGENTS.md block alive for a host never connected.
 */
async function isRegistered(provider: AgentProvider, root: string): Promise<boolean> {
  if (provider.register.kind !== "configFile") return false;
  const file = resolveConfigPath(provider.register.configPath, root);
  if (!existsSync(file)) return false;
  try {
    // Indeterminate counts as registered here: a malformed configuration must
    // retain the shared instructions rather than have them pulled out from
    // under a host that may well still be connected.
    return provider.register.registrationState(await readFile(file, "utf8")) !== "absent";
  } catch {
    return true;
  }
}

/**
 * Is another copy-skills host still registered?
 *
 * With `skillsDir`, only peers writing that same directory count. That
 * narrower question is the one the skills removal must ask: `.agents/skills`
 * serves opencode **and** antigravity, so disconnecting one while the other is
 * connected would strip a connected host's roster — and ADR-0009 makes the
 * roster's atomicity (every skill cross-references
 * `kanmer-tickets/references/tool-reference.md`) a stated constraint, so a
 * half-removed roster is a real breakage. Without `skillsDir` the question stays
 * the broad one the AGENTS.md block asks: does any copy-skills host remain?
 */
async function hasRegisteredCopySkillsPeer(
  id: ProviderId,
  root: string,
  skillsDir?: string,
): Promise<boolean> {
  const peers = ["opencode", "grok", "antigravity"]
    .map((peerId) => providerById(peerId))
    .filter(
      (peer): peer is AgentProvider =>
        peer !== undefined &&
        peer.id !== id &&
        peer.install.kind === "copySkills" &&
        (skillsDir === undefined || peer.install.skillsDir === skillsDir),
    );
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
    const version = await bundledSkillsVersion();
    // Reconcile, don't overlay: the stamp records the roster so retired skills
    // can be pruned, and it is what lets getSkillsStatus offer "Update skills".
    const { installed, replaced, removed } = await reconcileSkills(dest, join(pluginRoot(), "skills"), version);
    const notes = [`skills v${version} → ${provider.install.skillsDir}`];
    if (installed.length > 0) notes.push(`${installed.length} installed`);
    // Naming the replaced folders is the accountability for replacing them
    // wholesale: a local edit inside a Kanmer-owned skill is discarded, and the
    // user has to learn that from Kanmer rather than by losing it.
    if (replaced.length > 0) notes.push(`replaced, local edits discarded: ${replaced.join(", ")}`);
    if (removed.length > 0) notes.push(`retired, removed: ${removed.join(", ")}`);
    notes.push("AGENTS.md block ensured");
    return notes.join("; ");
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
  // Parse rather than trim the whole file: the stamp now carries the roster
  // below the version line.
  if (existsSync(marker)) {
    installedVersion = parseSkillsStamp(await readFile(marker, "utf8")).version || null;
  }
  return {
    scope: "project",
    installedVersion,
    bundledVersion,
    updateAvailable: installedVersion !== null && isNewerVersion(bundledVersion, installedVersion),
  };
}

/**
 * Re-install the bundled skills for a provider (the "Update skills" action).
 *
 * Deliberately still a one-line wrapper: this affordance exists for "my skills
 * are out of date", and it used to reproduce the overlay bug rather than fix it.
 * Making `installSkills` reconcile is what fixes it here too — there is nothing
 * for this function to do differently.
 */
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

/** Where the legacy global codex entries live. */
function globalCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

export interface LegacyCodexScan {
  /** The file that was read, so the UI can name it. */
  configPath: string;
  findings: LegacyCodexFinding[];
}

export interface LegacyCodexRemoval {
  name: string;
  ok: boolean;
  /** The exact command, for the copy-paste fallback when the CLI is missing (FRD-012 AC-4). */
  command: string;
  output: string;
}

export interface LegacyCodexDrainResult {
  removals: LegacyCodexRemoval[];
  /** Names that were asked for but are not currently removable — refused, not attempted. */
  refused: string[];
  /** The state after the attempt; a successful pass leaves nothing behind to find. */
  scan: LegacyCodexScan;
}

/**
 * List the legacy global `kanmer-*` codex registrations and classify each one.
 *
 * Read-only. The global config is parsed for listing and never rewritten — see
 * the comment over `legacyCodexEntries` for the measurement that settled that.
 */
export async function scanLegacyCodexRegistrations(): Promise<LegacyCodexScan> {
  const configPath = globalCodexConfigPath();
  const globalToml = existsSync(configPath) ? await readFile(configPath, "utf8") : null;
  const findings: LegacyCodexFinding[] = [];
  for (const entry of legacyCodexEntries(globalToml)) {
    findings.push(classifyLegacyCodexEntry(entry, await probeLegacyProject(entry.projectRoot, globalToml)));
  }
  return { configPath, findings };
}

/** Everything the classifier needs to know about one entry's project, from disk. */
async function probeLegacyProject(
  projectRoot: string | null,
  globalToml: string | null,
): Promise<LegacyCodexProbe | null> {
  if (projectRoot === null) return null;
  if (!existsSync(projectRoot)) {
    return { exists: false, hasProjectRegistration: false, trust: "unknown" };
  }
  const projectConfig = join(projectRoot, ".codex", "config.toml");
  let hasProjectRegistration = false;
  if (existsSync(projectConfig)) {
    try {
      // Only a positive answer counts. An unreadable project config is not a
      // proven replacement, and the entry stays.
      hasProjectRegistration =
        tomlRegistrationState(await readFile(projectConfig, "utf8")) === "registered";
    } catch {
      hasProjectRegistration = false;
    }
  }
  return {
    exists: true,
    hasProjectRegistration,
    trust: codexTrustFromConfig(globalToml, projectRoot),
  };
}

/**
 * Remove the named legacy entries — the confirmed half of the sweep.
 *
 * Two disciplines this must not lose:
 *
 * 1. **It re-scans and intersects with what is currently removable.** The names
 *    arrive from the renderer, and the one thing the sweep must never do is
 *    remove a project's only registration. A stale list or a UI bug cannot
 *    cause that if the main process re-derives the permission itself.
 * 2. **Failures are reported, never swallowed.** `connectAgent` uses
 *    `.catch(() => undefined)` for its best-effort cleanup, which is right there
 *    and wrong here: a drain that claims success it did not achieve is worse
 *    than no sweep. A machine without `codex` on PATH surfaces as every entry
 *    failing, each with the command to run by hand.
 */
export async function drainLegacyCodexRegistrations(names: string[]): Promise<LegacyCodexDrainResult> {
  const before = await scanLegacyCodexRegistrations();
  const allowed = new Set(before.findings.filter((f) => f.removable).map((f) => f.name));
  const wanted = [...new Set(names)];
  const removals: LegacyCodexRemoval[] = [];
  for (const name of wanted.filter((n) => allowed.has(n))) {
    const command = `codex mcp remove ${q(name)}`;
    try {
      const { stdout, stderr } = await execAsync(command);
      removals.push({ name, ok: true, command, output: (stdout || stderr || "Removed.").trim() });
    } catch (err) {
      removals.push({
        name,
        ok: false,
        command,
        output: err instanceof Error ? err.message.split("\n")[0]! : String(err),
      });
    }
  }
  return {
    removals,
    refused: wanted.filter((n) => !allowed.has(n)),
    scan: await scanLegacyCodexRegistrations(),
  };
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
        const dir = provider.install.skillsDir;
        // One directory can serve two hosts (.agents/skills is opencode's and
        // antigravity's), so removal asks whether a peer writing *this*
        // directory is still connected — not merely whether any copy-skills
        // host is, which would keep grok's directory alive for opencode's sake.
        if (await hasRegisteredCopySkillsPeer(id, projectRoot, dir)) {
          cleanupNotes.push(`copied skills retained in ${dir} for another connected host`);
        } else {
          await removeBundledSkillsOnly(projectRoot, dir);
          cleanupNotes.push("bundled copied skills removed");
        }
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
