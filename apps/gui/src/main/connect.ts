import { app } from "electron";
import { exec, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { CURRENT_FORMAT } from "@kanmer/core";
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
  antigravityBindingNote,
  antigravityPortableInvocation,
  connectIgnoreEntries,
  portableLauncherInvocation,
  portableLauncherProbeInvocation,
  DEFAULT_BOARD_BRANCH,
  codexTrustFromConfig,
  codexTrustNote,
  classifyLegacyCodexEntry,
  legacyCodexEntries,
  q,
  normalizeBoardBranch,
  type RegistrationState,
  tomlRegistrationState,
  type LegacyCodexFinding,
  type LegacyCodexProbe,
  type NativePluginCommand,
  CLAUDE_MARKETPLACE,
  CLAUDE_PLUGIN_REF,
  type MarketplaceHostState,
  type MarketplaceVersionCheck,
} from "./providers.js";
import { applyManagedBlock, removeManagedBlock } from "./agentsBlock.js";
import { ensureIgnore } from "./gitIgnore.js";
import { remoteProjectIdentity } from "./remoteAccess/identity.js";

const execAsync = promisify(exec);

export type CodexProbeRunner = (
  file: string,
  args: string[],
  options: {
    cwd: string;
    windowsHide: boolean;
    timeout: number;
    maxBuffer: number;
  },
) => Promise<{ stdout: string; stderr: string }>;

const execFileAsync = promisify(execFile) as unknown as CodexProbeRunner;

/** Back-compat alias — the IPC layer still refers to a "connect target". */
export type ConnectTarget = ProviderId;

export interface ConnectResult {
  ok: boolean;
  /** The exact command a user could run by hand (for the copy fallback), or a note. */
  command: string;
  output: string;
}

/**
 * Preflight the installer-owned launcher before any project registration
 * (Codex, Claude Code, OpenCode) touches a project config or legacy
 * registration. The runner is injectable for unit tests; production uses
 * explicit execFile argv with no shell concatenation.
 */
export async function probeLauncher(
  projectRoot: string,
  run: CodexProbeRunner = execFileAsync,
): Promise<ConnectResult> {
  const invocation = portableLauncherProbeInvocation();
  // Keep the fallback directly pasteable in PowerShell. The command is sent as
  // ordinary argv, the same way Codex starts the registered server.
  // A double-quoted PowerShell argument expands `$env:*`, `$LASTEXITCODE`, and
  // `$ErrorActionPreference` in the caller before the child PowerShell sees
  // its script. Quote the payload literally for the copyable fallback.
  const commandPayload = invocation.args[4].replaceAll("'", "''");
  const command = `${invocation.command} ${invocation.args.slice(0, 4).join(" ")} '${commandPayload}'`;
  try {
    const { stdout, stderr } = await run(invocation.command, invocation.args, {
      cwd: projectRoot,
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 32 * 1024,
    });
    return {
      ok: true,
      command,
      output: (stdout || stderr || "Kanmer launcher probe passed.").trim(),
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message.split("\n").slice(0, 2).join(" ") : String(err);
    return {
      ok: false,
      command,
      output:
        `Kanmer launcher probe failed before changing any host configuration: ${detail} ` +
        "Repair or reinstall Kanmer, then retry Connect. No absolute-path fallback was used.",
    };
  }
}

/** @deprecated Pre-GUI-149 name; the probe gates every project registration. */
export const probeCodexLauncher = probeLauncher;

/**
 * The server invocation every project registration writes.
 *
 * One contract for Codex, Claude Code and OpenCode: the installer-owned
 * launcher resolved from `LOCALAPPDATA` on the destination machine, with the
 * project's board branch as the only variable. Until GUI-149 the two JSON
 * hosts still received `process.execPath`, the bundled script path, `--root`
 * and `--repo-root` — four absolute paths that went stale on a reinstall,
 * bypassed the versioned runtime the launcher prefers, and made `.mcp.json`
 * and `opencode.json` unshareable. The board and repo roots are discovered by
 * the server from the host's working directory instead (ADR-0012), which is
 * what the Codex registration has relied on since GUI-100.
 *
 * `boardRoot` and `sourceRoot` are kept in the signature so callers and the
 * branch-change reconcile path are unchanged; nothing about them is serialised.
 */
export function serverInvocation(
  id: ProviderId,
  _boardRoot: string,
  _sourceRoot: string,
  boardBranch = DEFAULT_BOARD_BRANCH,
): Invocation {
  void id;
  return portableLauncherInvocation(boardBranch.trim() || DEFAULT_BOARD_BRANCH);
}

/**
 * Keep the files Connect writes out of the project's history (FRD-012 R1c).
 *
 * Appends the provider's registration file and copied-skills directory to the
 * project's own `.gitignore`, the same way the board machinery already adds
 * `.kanmer/` and `.worktrees/`. Only for a project that is a git checkout, and
 * best-effort: the registration has already succeeded, so a `.gitignore` that
 * cannot be written is reported in the Connect output, never as a failure.
 * Disconnect leaves the lines in place — they are harmless, and removing lines
 * from a user's `.gitignore` is outside "what connect wrote" (R4).
 */
async function ensureConnectIgnore(provider: AgentProvider, projectRoot: string): Promise<string | null> {
  const entries = connectIgnoreEntries(provider);
  if (entries.length === 0 || !existsSync(join(projectRoot, ".git"))) return null;
  try {
    const appended = await ensureIgnore(join(projectRoot, ".gitignore"), entries);
    return appended.length > 0 ? `added ${appended.join(", ")} to .gitignore` : null;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return `could not update .gitignore (${detail}); add ${entries.join(", ")} to it yourself`;
  }
}

/**
 * Where the bundled plugin (skills, and the plugin a marketplace points at)
 * lives — dev vs packaged.
 *
 * Exported only so a test can pin its relationship to `marketplaceRoot()`; the
 * defect these two encode was a mismatch between them, and a mismatch is not
 * observable from either one alone.
 */
export function pluginRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, "plugins", "kanmer");
  return join(resolve(app.getAppPath(), "..", ".."), "plugins", "kanmer");
}

/** The bundled skills reference for the GUI's core staleness read. */
export function bundledSkillsRoot(): string {
  return join(pluginRoot(), "skills");
}

/**
 * The directory a host's `plugin marketplace add` must be pointed at.
 *
 * It is **not** the plugin directory. The two marketplace manifests —
 * `.claude-plugin/marketplace.json` (Claude Code) and
 * `.agents/plugins/marketplace.json` (codex) — sit at the repo root and each
 * declares its plugin as `./plugins/kanmer`, so the marketplace root is the
 * plugin root minus those two segments, in the dev layout and the packaged one
 * alike (`extraResources` reproduces both under `resources/`).
 *
 * Derived from `pluginRoot()` rather than resolved independently on purpose:
 * this is the invariant that broke. Connect passed `pluginRoot()`, and
 * `claude plugin marketplace add …\plugins\kanmer` exited 1 with "Marketplace
 * file not found" on every release to date (MCP-013). Two path functions each
 * independently correct about a layout are free to drift apart; one derived from
 * the other cannot. The invariant, stated so a future edit has to break it
 * deliberately:
 *
 *     marketplaceRoot() + "/plugins/kanmer"  ===  pluginRoot()
 */
export function marketplaceRoot(): string {
  return resolve(pluginRoot(), "..", "..");
}

/** The marketplace-owned roots Connect stages, and the only ones it refreshes. */
const STAGED_MARKETPLACE_ROOTS = [".claude-plugin", ".agents", "plugins/kanmer"] as const;

/**
 * Where Claude's marketplace is staged: an installer-owned directory that
 * outlives the Connect that wrote it.
 *
 * Staging used to be a `mkdtemp` directory that Connect deleted on the way out
 * (GUI-147). Claude Code records a *directory* marketplace by path, so the
 * deletion turned every later session into
 * `Marketplace kanmer failed to load: cache-miss` — the plugin's skills and its
 * `plugin:kanmer:kanmer` MCP server simply did not load, while Connect had
 * reported success. A staged marketplace has to be as durable as the
 * registration that points at it.
 *
 * `%LOCALAPPDATA%\Kanmer\claude-marketplace` is the sibling of the two
 * installer-owned roots the NSIS installer already writes
 * (`%LOCALAPPDATA%\Kanmer\mcp`, `%LOCALAPPDATA%\Kanmer\bin`; AGENTS.md §8).
 * There is no Node-side resolver for those to reuse — they are `%LOCALAPPDATA%`
 * tokens expanded by `cmd.exe`/NSIS — and Electron's `app.getPath` has no
 * `localAppData` key, so `process.env.LOCALAPPDATA` is the only equivalent. The
 * `homedir()` fallback exists so a non-Windows test run resolves rather than
 * throwing; the app itself ships Windows-only.
 *
 * Exported so a test can assert the location follows the injected environment
 * rather than a literal path.
 */
export function claudeMarketplaceStableRoot(): string {
  const localAppData = process.env.LOCALAPPDATA?.trim();
  const base = localAppData && localAppData !== ""
    ? localAppData
    : join(homedir(), "AppData", "Local");
  return join(base, "Kanmer", "claude-marketplace");
}

/**
 * Stage Claude's marketplace into that stable root with the selected board
 * branch bound into its MCP descriptor. The shipped bundle and the user's
 * global marketplace remain untouched; the host still owns the install.
 *
 * Refreshing is per owned subdirectory, not a delete-and-recreate of the root:
 * the root is the path Claude Code has recorded, and each subdirectory is
 * replaced so a file the bundle has since retired does not linger inside a
 * marketplace the host still trusts.
 */
async function stageClaudeMarketplaceRoot(boardBranch: string): Promise<string> {
  const bundledRoot = marketplaceRoot();
  const descriptorPath = join(bundledRoot, "plugins", "kanmer", "mcp", "claude.mcp.json");
  const descriptor = await readFile(descriptorPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(descriptor);
  } catch {
    throw new Error(`Claude marketplace MCP descriptor is not valid JSON: ${descriptorPath}`);
  }
  const entry = (parsed as { mcpServers?: { kanmer?: { env?: unknown } } } | null)?.mcpServers?.kanmer;
  if (!entry || typeof entry !== "object") {
    throw new Error(`Claude marketplace MCP descriptor has no mcpServers.kanmer entry: ${descriptorPath}`);
  }
  const stagedRoot = claudeMarketplaceStableRoot();
  await mkdir(stagedRoot, { recursive: true });
  // Copy only marketplace-owned roots. Copying the repository wholesale can
  // traverse a developer's node_modules and make Connect wait on unrelated
  // files; Claude needs the marketplace manifest and the plugin it names.
  for (const relativeRoot of STAGED_MARKETPLACE_ROOTS) {
    const source = join(bundledRoot, relativeRoot);
    const target = join(stagedRoot, relativeRoot);
    await rm(target, { recursive: true, force: true });
    if (existsSync(source)) await cp(source, target, { recursive: true });
  }
  const stagedDescriptor = join(stagedRoot, "plugins", "kanmer", "mcp", "claude.mcp.json");
  const env = entry.env && typeof entry.env === "object" && !Array.isArray(entry.env)
    ? entry.env as Record<string, unknown>
    : {};
  entry.env = { ...env, KANMER_BOARD_BRANCH: normalizeBoardBranch(boardBranch) };
  await writeFile(stagedDescriptor, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  // A failure above propagates with the directory left as it is. The old
  // rollback deleted the staged root, which is exactly what must not happen now
  // that the root is the one Claude Code has recorded: a half-refreshed
  // marketplace still loads, a deleted one is a `cache-miss` for every session.
  return stagedRoot;
}

/**
 * What Claude Code already records about the Kanmer marketplace and plugin.
 *
 * Read from the host's own two state files under `~/.claude/plugins/`, never
 * from CLI output: MCP-013's lesson is that CLI text is for showing a user
 * verbatim, not for control flow. Both files are optional — a machine that has
 * never installed a plugin has neither — and a missing or malformed file means
 * "not registered"/"not installed", which is the safe reading: the worst it
 * costs is an `add` where an `update` would have done, and the version
 * read-back afterwards is what actually decides whether Connect succeeded.
 */
async function claudeMarketplaceHostState(
  stagedRoot: string,
  options: ConnectOptions,
): Promise<MarketplaceHostState> {
  const stateDir = options.claudePluginStateDir ?? join(homedir(), ".claude", "plugins");
  const known = await readJsonOrNull(join(stateDir, "known_marketplaces.json"));
  const recorded = (known as Record<string, { source?: { source?: unknown; path?: unknown } }> | null)
    ?.[CLAUDE_MARKETPLACE];
  const recordedPath = recorded?.source?.source === "directory" && typeof recorded.source.path === "string"
    ? recorded.source.path
    : null;
  const marketplace = recorded === undefined || recorded === null
    ? "absent"
    : recordedPath !== null && samePath(recordedPath, stagedRoot)
      ? "staged"
      : "elsewhere";
  // `{ version: 2, plugins: { "<plugin>@<marketplace>": [ { scope, version } ] } }`
  // as of claude 2.1.233. The flat fallback keeps an older layout readable
  // rather than reporting a plugin absent because the wrapper moved.
  const installed = await readJsonOrNull(join(stateDir, "installed_plugins.json"));
  const wrapper = installed as { plugins?: unknown } | null;
  const plugins = (wrapper?.plugins && typeof wrapper.plugins === "object"
    ? wrapper.plugins
    : installed) as Record<string, unknown> | null;
  const entries = plugins?.[CLAUDE_PLUGIN_REF];
  const pluginInstalled = Array.isArray(entries)
    && entries.some((entry) => (entry as { scope?: unknown } | null)?.scope === "user");
  return { marketplace, pluginInstalled };
}

/** Parse a host state file, treating absent and malformed alike as "nothing recorded". */
async function readJsonOrNull(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/** Whether two paths name the same directory (Windows compares case-insensitively). */
function samePath(a: string, b: string): boolean {
  const normalize = (value: string) => {
    const resolved = resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
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
  const registration = provider.register;
  const configPath = registration.kind === "configFile"
    ? registration.configPath
    : registration.kind === "cli"
      ? registration.configPath
      : provider.install.kind === "plugin" && provider.install.legacyRegistrationState
        ? provider.install.legacyConfigPath
        : undefined;
  const registrationState = registration.kind === "configFile"
    ? registration.registrationState
    : registration.kind === "cli"
      ? registration.registrationState
      : provider.install.kind === "plugin" ? provider.install.legacyRegistrationState : undefined;
  if (!configPath || !registrationState) return false;
  const file = resolveConfigPath(configPath, root);
  if (!existsSync(file)) return false;
  try {
    // Indeterminate counts as registered here: a malformed configuration must
    // retain the shared instructions rather than have them pulled out from
    // under a host that may well still be connected.
    return registrationState(await readFile(file, "utf8")) !== "absent";
  } catch {
    return true;
  }
}

/**
 * Refresh one existing project registration after the board branch changes.
 *
 * This deliberately stops at the provider-owned registration file. It does
 * not reinstall skills, touch a native user plugin, or inspect another
 * project. A malformed registration is surfaced as indeterminate rather than
 * overwritten, while an absent registration is a no-op.
 */
export async function reconcileProviderRegistration(
  id: ProviderId,
  projectRoot: string,
  boardRoot: string,
  boardBranch = DEFAULT_BOARD_BRANCH,
): Promise<ConnectResult> {
  const provider = providerById(id);
  const command = `reconcile ${id} registration`;
  if (!provider) return { ok: false, command, output: `Unknown provider "${id}"` };

  const registration = provider.register;
  if (registration.kind === "none") {
    return { ok: true, command, output: `${id} has no project registration to refresh.` };
  }
  const configPath = registration.configPath;
  const registrationState = registration.registrationState;
  if (!configPath || !registrationState) {
    return { ok: true, command, output: `${id} has no inspectable project registration.` };
  }

  const path = resolveConfigPath(configPath, projectRoot);
  if (!existsSync(path)) {
    return { ok: true, command, output: `${id} is not registered in this project.` };
  }

  try {
    const existing = await readFile(path, "utf8");
    const state: RegistrationState = registrationState(existing);
    if (state === "absent") {
      return { ok: true, command, output: `${id} is not registered in this project.` };
    }
    if (state === "indeterminate") {
      return {
        ok: false,
        command,
        output: `${id} registration at ${configPath} is malformed or unreadable; reconnect it manually. No file was changed.`,
      };
    }

    const merge = registration.merge;
    if (!merge) {
      return {
        ok: false,
        command,
        output: `${id} registration is present but has no provider-owned refresh path; reconnect it manually. No file was changed.`,
      };
    }
    const invocation = serverInvocation(id, boardRoot, projectRoot, normalizeBoardBranch(boardBranch));
    const next = merge(existing, invocation);
    if (next !== existing) await writeAtomic(path, next);
    const ignoreNote = await ensureConnectIgnore(provider, projectRoot);
    return {
      ok: true,
      command,
      output: `${id} registration refreshed for board branch ${normalizeBoardBranch(boardBranch)}.${ignoreNote ? ` ${ignoreNote}.` : ""}`,
    };
  } catch (error) {
    return { ok: false, command, output: error instanceof Error ? error.message : String(error) };
  }
}

/** Any connected host may still rely on the shared AGENTS.md instructions. */
async function hasRegisteredAgentPeer(id: ProviderId, root: string): Promise<boolean> {
  const peers = (['codex', 'claude', 'opencode', 'grok', 'antigravity'] as ProviderId[])
    .filter((peerId) => peerId !== id)
    .map((peerId) => providerById(peerId))
    .filter((peer): peer is AgentProvider => peer !== undefined);
  for (const peer of peers) if (await isRegistered(peer, root)) return true;
  return false;
}

/**
 * Is another copy-skills host still registered?
 *
 * With `skillsDir`, only peers writing that same directory count. That
 * narrower question is the one the skills removal must ask: if two providers
 * share a destination, disconnecting one while the other is connected would
 * strip a connected host's roster — and ADR-0009 makes the
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

/**
 * What a failed command actually said.
 *
 * `execAsync` rejects with an Error whose `message` is `Command failed: <cmd>`
 * followed by stderr — but these CLIs print their real diagnosis on **stdout**
 * as readily as stderr (`claude plugin marketplace add` prints
 * `✘ Failed to add marketplace: Marketplace file not found at …` and exits 1),
 * so both streams are read and `message` is only the fallback. The user is being
 * shown this text as the reason their install did not happen; truncating it to
 * the first line of `message` — which is what the swallow did — reduces it to
 * "Command failed", which names nothing.
 */
function commandFailureText(err: unknown): string {
  const e = err as { stderr?: unknown; stdout?: unknown; message?: unknown };
  const streams = [e?.stderr, e?.stdout]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .map((s) => s.trim());
  if (streams.length > 0) return streams.join("\n");
  return typeof e?.message === "string" ? e.message : String(err);
}

/**
 * The outcome of installing skills for a provider.
 *
 * `failure` exists because a string could not say "this did not happen". The
 * marketplace branch used to fold a non-zero exit into the note
 * `plugin cmd skipped (…)` on a result still flagged `ok`, so Connect rendered
 * `✓ Connected claude` for an install that had failed outright — and did so for
 * every release, because `claude plugin marketplace add` was being handed the
 * plugin directory rather than the marketplace root (MCP-013).
 */
interface SkillsInstallOutcome {
  /** Human note for the part that did run. */
  note: string;
  /** The command that failed and what it said — null when everything ran. */
  failure: { command: string; output: string } | null;
}

/**
 * Confirm the host installed the version this app ships.
 *
 * The exit code of `claude plugin install` is not the evidence: it is 0 for an
 * already-installed plugin it did not touch, which is how v0.4.0's Connect
 * reported success over a 0.3.12 plugin (GUI-147). Returns the failure to
 * report, or null when the host agrees.
 */
async function verifyInstalledMarketplaceVersion(
  check: MarketplaceVersionCheck,
  expected: string,
  root: string,
  options: ConnectOptions,
): Promise<{ command: string; output: string } | null> {
  const run = options.hostVersionRunner ?? defaultCommandRunner;
  let output: string;
  try {
    const result = await run(check.command, root);
    output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  } catch (err) {
    // Unverifiable is reported as failed, not as success. An install nobody can
    // confirm is the state this ticket exists to end.
    return {
      command: check.repairCommand,
      output:
        `The install ran, but \`${check.command}\` could not be read, so which ` +
        `version this host now has is unknown:\n${commandFailureText(err)}\n\n` +
        `Run this by hand to force version ${expected}:\n${check.repairCommand}`,
    };
  }
  const installed = check.parse(output);
  if (installed === expected) return null;
  return {
    command: check.repairCommand,
    output: installed === null
      ? `The install ran, but \`${check.command}\` reports no Kanmer plugin at all, ` +
        `so this host has no skills and no board server. Expected version ${expected}.\n\n` +
        `Run this by hand:\n${check.repairCommand}`
      : `The install ran, but this host still reports Kanmer plugin version ` +
        `${installed}, not the bundled ${expected} — so its skills and MCP server ` +
        `are the previous release's.\n\nRun this by hand:\n${check.repairCommand}`,
  };
}

/**
 * The version a marketplace host reports having installed, or null when it
 * cannot be read.
 *
 * The soft failure is deliberate and matches the rest of the staleness family
 * (`staleness.ts`: nothing here throws) — a host without its CLI on PATH must
 * render as "unknown", not break the Settings panel. Connect's own
 * verification, which must be loud, is `verifyInstalledMarketplaceVersion`.
 */
async function readMarketplaceInstalledVersion(
  check: MarketplaceVersionCheck,
  root: string,
  options: ConnectOptions,
): Promise<string | null> {
  const run = options.hostVersionRunner ?? defaultCommandRunner;
  try {
    const result = await run(check.command, root);
    return check.parse(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  } catch {
    return null;
  }
}

/** Install skills for a provider; reports what ran and what, if anything, failed. */
async function installSkills(
  provider: AgentProvider,
  root: string,
  boardBranch = DEFAULT_BOARD_BRANCH,
  options: ConnectOptions = {},
): Promise<SkillsInstallOutcome> {
  // FRD-012 R3: this universal orientation layer is independent of how a host
  // receives skills, so marketplace hosts must not bypass it on their early return.
  await ensureAgentsBlock(root);
  if (provider.install.kind === "marketplace") {
    const notes = ["AGENTS.md block ensured"];
    const stagedRoot = provider.id === "claude" ? await stageClaudeMarketplaceRoot(boardBranch) : undefined;
    // The staged root is installer-owned and deliberately outlives this call:
    // it is the path the host records, so deleting it is what broke every
    // session after Connect (GUI-147). Step 2's refresh is its only cleanup.
    const hostState = stagedRoot === undefined
      ? undefined
      : await claudeMarketplaceHostState(stagedRoot, options);
    for (const cmd of provider.install.marketplaceCommands(stagedRoot ?? marketplaceRoot(), hostState)) {
      try {
        await execAsync(cmd, { cwd: root });
        notes.push("plugin installed");
      } catch (e) {
        // Stop at the first failure rather than running the rest. These
        // commands are ordered — `plugin install <name>@<marketplace>` cannot
        // succeed when the `marketplace add` before it did not — so continuing
        // only buys a second error that misdescribes the first one's cause.
        return { note: notes.join("; "), failure: { command: cmd, output: commandFailureText(e) } };
      }
    }
    const check = provider.install.installedVersion;
    if (check) {
      const expected = await bundledSkillsVersion();
      const failure = await verifyInstalledMarketplaceVersion(check, expected, root, options);
      if (failure) return { note: notes.join("; "), failure };
      notes.push(`host reports plugin v${expected}`);
    }
    return { note: notes.join("; "), failure: null };
  }
  // copySkills: copy skills for a project dir after the universal block is ensured.
  if (provider.install.kind === "copySkills" && provider.install.skillsScope === "project" && provider.install.skillsDir) {
    const dest = join(root, provider.install.skillsDir);
    const version = await bundledSkillsVersion();
    // Reconcile, don't overlay: the stamp records the roster so retired skills
    // can be pruned, and it is what lets getSkillsStatus offer "Update skills".
    const { installed, replaced, removed } = await reconcileSkills(dest, bundledSkillsRoot(), version);
    const notes = [`skills v${version} → ${provider.install.skillsDir}`];
    if (installed.length > 0) notes.push(`${installed.length} installed`);
    // Naming the replaced folders is the accountability for replacing them
    // wholesale: a local edit inside a Kanmer-owned skill is discarded, and the
    // user has to learn that from Kanmer rather than by losing it.
    if (replaced.length > 0) notes.push(`replaced, local edits discarded: ${replaced.join(", ")}`);
    if (removed.length > 0) notes.push(`retired, removed: ${removed.join(", ")}`);
    notes.push("AGENTS.md block ensured");
    return { note: notes.join("; "), failure: null };
  }
  return { note: "AGENTS.md block ensured (host reads AGENTS.md for skills)", failure: null };
}

export interface SkillsStatus {
  /** How this host receives skills. */
  scope: "marketplace" | "plugin" | "project" | "agentsOnly";
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
export async function skillsStatus(
  id: ProviderId,
  projectRoot: string,
  options: ConnectOptions = {},
): Promise<SkillsStatus> {
  const provider = providerById(id);
  const bundledVersion = await bundledSkillsVersion();
  const base: SkillsStatus = {
    scope: "marketplace",
    installedVersion: null,
    bundledVersion,
    updateAvailable: false,
  };
  if (!provider || provider.install.kind === "marketplace") {
    // A marketplace host that can be asked what it installed is asked. Claude
    // Code's plugin is the control plane the whole board runs through, and a
    // silent `installedVersion: null` is what let it sit a release behind
    // unnoticed (GUI-147). Nothing here throws: a staleness read that fails is
    // reported as "unknown", the same as every other read in this family.
    const check = provider?.install.kind === "marketplace" ? provider.install.installedVersion : undefined;
    if (!check) return base;
    const installedVersion = await readMarketplaceInstalledVersion(check, projectRoot, options);
    return {
      ...base,
      installedVersion,
      // Any disagreement, not only an older version: a host left on a *newer*
      // plugin than the app that talks to it is the same stale-control-plane
      // fault from the other side, and "Update skills" is still the answer.
      updateAvailable: installedVersion !== null && installedVersion !== bundledVersion,
    };
  }
  if (provider.install.kind === "plugin") return { ...base, scope: "plugin" };
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
export async function updateSkills(
  id: ProviderId,
  projectRoot: string,
  boardBranch = DEFAULT_BOARD_BRANCH,
  options: ConnectOptions = {},
): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  if (provider.install.kind === "plugin") {
    const host = provider.label;
    return {
      ok: false,
      command: `${provider.install.cli} plugin install <plugin-root>`,
      output: `${host} manages Kanmer skills through its user-scoped plugin; use Connect to reinstall it.`,
    };
  }
  try {
    const { note, failure } = await installSkills(provider, projectRoot, boardBranch, options);
    // Same rule as connectAgent: a failed install command is reported as a
    // failure carrying the command, not as a note on a successful result.
    if (failure) return { ok: false, command: failure.command, output: failure.output };
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
export interface ConnectOptions {
  /** Test-only seam for the Codex launcher probe. */
  probeRunner?: CodexProbeRunner;
  /** Test-only seam for provider commands; production uses the host shell. */
  commandRunner?: ConnectCommandRunner;
  /** Test-only seam for provider argv commands; production uses execFile. */
  argvCommandRunner?: NativeCommandRunner;
  /** Test-only argv seam for native plugin commands. */
  nativeCommandRunner?: NativeCommandRunner;
  /** Test-only plugin root seam; production resolves the packaged/dev bundle. */
  pluginRootPath?: string;
  /**
   * Test-only seam for the host's plugin state directory (`~/.claude/plugins`).
   * Production reads the real one — read-only, and only to decide add-vs-update
   * and install-vs-reinstall.
   */
  claudePluginStateDir?: string;
  /**
   * Test-only seam for the read-only installed-version read-back
   * (`claude plugin list`). Production uses the host shell.
   */
  hostVersionRunner?: ConnectCommandRunner;
}

export type ConnectCommandRunner = (
  command: string,
  cwd: string,
) => Promise<{ stdout: string; stderr: string }>;

export type NativeCommandRunner = (
  file: string,
  args: string[],
  cwd: string,
) => Promise<{ stdout: string; stderr: string }>;

const defaultCommandRunner: ConnectCommandRunner = async (command, cwd) => {
  const result = await execAsync(command, { cwd, timeout: 60_000, maxBuffer: 256 * 1024 });
  return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
};

const defaultNativeCommandRunner: NativeCommandRunner = async (file, args, cwd) => {
  const result = await execFileAsync(file, args, {
    cwd,
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 256 * 1024,
  });
  return { stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
};

function nativeCommandText(command: NativePluginCommand): string {
  return [command.file, ...command.args].map(q).join(" ");
}

async function expectedProjectIdentity(boardRoot: string, repoRoot: string) {
  const kanmerRoot = join(boardRoot, ".kanmer");
  const boardFile = join(kanmerRoot, "data", "board.yml");
  const versionFile = join(kanmerRoot, "version.json");
  let format = CURRENT_FORMAT;
  try {
    const version = JSON.parse(await readFile(versionFile, "utf8")) as { format?: unknown };
    if (typeof version.format === "number" && Number.isInteger(version.format) && version.format > 0) {
      format = Math.min(CURRENT_FORMAT, version.format);
    }
  } catch {
    if (existsSync(join(kanmerRoot, "tickets"))) format = 1;
    else if (existsSync(join(kanmerRoot, "areas"))) format = 2;
  }
  return remoteProjectIdentity({
    boardRoot,
    repoRoot,
    format,
    boardSource: existsSync(boardFile) ? "file" : "default",
  });
}

function parseFunctionalIdentity(output: string): {
  fingerprint?: unknown;
  boardRoot?: unknown;
  repoRoot?: unknown;
  format?: unknown;
  boardExpectedBranch?: unknown;
  boardActualBranch?: unknown;
  boardOnExpectedBranch?: unknown;
} | null {
  // Hosts commonly wrap JSON in a sentence or a fenced block. Try the whole
  // payload and one outer object (so nested `project` data is not truncated),
  // but never treat a literal marker as proof.
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const outer = output.match(/\{[\s\S]*\}/)?.[0];
  const candidates = [fenced, output.trim(), outer].filter((candidate, index, all): candidate is string =>
    typeof candidate === "string" && candidate.trim() !== "" && all.indexOf(candidate) === index,
  );
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) continue;
      const value = parsed as Record<string, unknown>;
      const project = value.project && typeof value.project === "object"
        ? value.project as Record<string, unknown>
        : value;
      const fingerprint = value.project_fingerprint ?? project.fingerprint;
      const boardRoot = value.board_root ?? project.boardRoot;
      const repoRoot = value.repo_root ?? project.repoRoot;
      const format = value.format ?? project.format;
      const boardExpectedBranch = value.board_expected_branch ?? project.board_expected_branch ?? project.boardExpectedBranch;
      const boardActualBranch = value.board_actual_branch ?? project.board_actual_branch ?? project.boardActualBranch;
      const boardOnExpectedBranch = value.board_on_expected_branch ?? project.board_on_expected_branch ?? project.boardOnExpectedBranch;
      if (fingerprint !== undefined || boardRoot !== undefined || repoRoot !== undefined || format !== undefined || boardExpectedBranch !== undefined) {
        return { fingerprint, boardRoot, repoRoot, format, boardExpectedBranch, boardActualBranch, boardOnExpectedBranch };
      }
    } catch {
      // Keep scanning output for the one JSON object the prompt requested.
    }
  }
  return null;
}

/**
 * Prevent a legacy project registration from satisfying the native-plugin
 * functional proof. It is restored byte-for-byte before cleanup (or on every
 * failure), so a proof cannot silently consume user state.
 */
async function withLegacyRegistrationDisabled<T>(
  provider: AgentProvider,
  projectRoot: string,
  run: () => Promise<T>,
): Promise<T> {
  if (provider.install.kind !== "plugin") return run();
  const config = resolveConfigPath(provider.install.legacyConfigPath, projectRoot);
  if (!existsSync(config)) return run();
  const existing = await readFile(config, "utf8");
  const state = provider.install.legacyRegistrationState?.(existing);
  if (state === "indeterminate") throw new Error(`Cannot isolate malformed ${provider.label} legacy registration for functional proof`);
  if (state !== "registered") return run();
  const disabled = provider.install.legacyConfigUnmerge(existing);
  if (disabled === existing) throw new Error("Cannot isolate Antigravity legacy registration for functional proof");
  await writeAtomic(config, disabled);
  try {
    return await run();
  } finally {
    await writeAtomic(config, existing);
  }
}

function commandText(result: { stdout: string; stderr: string }): string {
  return (result.stdout || result.stderr || "").trim();
}

function pluginPresent(pluginName: string, output: string): boolean {
  const escaped = pluginName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(output);
}

async function retireLegacyPluginState(
  provider: AgentProvider,
  projectRoot: string,
): Promise<string[]> {
  if (provider.install.kind !== "plugin") return [];
  const legacy = provider.install;
  const notes: string[] = [];
  const config = resolveConfigPath(legacy.legacyConfigPath, projectRoot);
  if (existsSync(config)) {
    const existing = await readFile(config, "utf8");
    const next = legacy.legacyConfigUnmerge(existing);
    if (next !== existing) await writeAtomic(config, next);
    notes.push(`legacy ${legacy.legacyConfigPath} reconciled`);
  }
  await removeBundledSkillsOnly(projectRoot, legacy.legacySkillsDir);
  notes.push(`legacy copied skills removed from ${legacy.legacySkillsDir}; bundled copied skills removed`);
  if (await hasRegisteredAgentPeer(provider.id, projectRoot)) {
    notes.push("AGENTS.md block retained for another connected host");
  } else {
    await dropAgentsBlock(projectRoot);
    notes.push("AGENTS.md block reconciled; no connected copy-skills host remains");
  }
  return notes;
}

/**
 * Prepare a branch-bound native plugin descriptor without modifying the
 * shipped bundle. Native plugins are user-scoped, so the install source must
 * carry the selected branch while the repository checkout remains pristine.
 */
async function stageNativePluginBundle(
  provider: AgentProvider,
  bundledRoot: string,
  boardBranch: string,
): Promise<string> {
  if (provider.install.kind !== "plugin") throw new Error("native plugin provider expected");
  const descriptorPath = provider.install.descriptorPath(bundledRoot);
  const descriptor = await readFile(descriptorPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(descriptor);
  } catch {
    throw new Error(`Kanmer plugin MCP descriptor is not valid JSON: ${descriptorPath}`);
  }
  const entry = (parsed as { mcpServers?: { kanmer?: { env?: unknown } } } | null)?.mcpServers?.kanmer;
  if (!entry || typeof entry !== "object") {
    throw new Error(`Kanmer plugin MCP descriptor has no mcpServers.kanmer entry: ${descriptorPath}`);
  }

  const stagedRoot = await mkdtemp(join(tmpdir(), "kanmer-native-plugin-"));
  try {
    await cp(bundledRoot, stagedRoot, { recursive: true });
    const stagedDescriptor = join(stagedRoot, relative(bundledRoot, descriptorPath));
    const env = entry.env && typeof entry.env === "object" && !Array.isArray(entry.env)
      ? entry.env as Record<string, unknown>
      : {};
    entry.env = { ...env, KANMER_BOARD_BRANCH: normalizeBoardBranch(boardBranch) };
    await writeFile(stagedDescriptor, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    return stagedRoot;
  } catch (error) {
    await rm(stagedRoot, { recursive: true, force: true });
    throw error;
  }
}

async function connectNativePlugin(
  provider: AgentProvider,
  projectRoot: string,
  boardRoot: string,
  options: ConnectOptions,
  boardBranch = DEFAULT_BOARD_BRANCH,
): Promise<ConnectResult> {
  if (provider.install.kind !== "plugin") throw new Error("native plugin provider expected");
  const spec = provider.install;
  const run = options.commandRunner ?? defaultCommandRunner;
  const argv = spec.argv;
  const runArgv = options.nativeCommandRunner ?? defaultNativeCommandRunner;
  const execute = async (command: string, native?: NativePluginCommand) => {
    if (!native) return run(command, projectRoot);
    // The string seam remains useful to existing unit fixtures; production
    // never supplies commandRunner and therefore always takes execFile argv.
    if (options.nativeCommandRunner) return runArgv(native.file, native.args, projectRoot);
    if (options.commandRunner) return run(command, projectRoot);
    return defaultNativeCommandRunner(native.file, native.args, projectRoot);
  };
  const runtime = process.env.KANMER_NODE?.trim() || "node";
  const runtimeCommand = `${q(runtime)} --version`;
  const bundledRoot = options.pluginRootPath ?? pluginRoot();
  let lastCommand = spec.installCommand(bundledRoot);
  let stagedRoot: string | undefined;
  try {
    const version = argv?.version();
    lastCommand = version ? nativeCommandText(version) : `${spec.cli} --version`;
    const cli = await execute(lastCommand, version);
    const help = argv?.help();
    lastCommand = help ? nativeCommandText(help) : spec.helpCommand();
    const pluginHelp = await execute(lastCommand, help);
    const runtimeInvocation = argv?.runtime?.();
    lastCommand = runtimeInvocation ? nativeCommandText(runtimeInvocation) : runtimeCommand;
    const runtimeResult = await execute(lastCommand, runtimeInvocation);
    const required = spec.requiredFiles(bundledRoot);
    const missing = required.filter((path) => !existsSync(path));
    if (missing.length > 0) {
      throw new Error(`Kanmer plugin bundle is incomplete; missing ${missing.join(", ")}`);
    }
    stagedRoot = await stageNativePluginBundle(provider, bundledRoot, boardBranch);
    const descriptorPath = spec.descriptorPath(stagedRoot);
    const descriptor = await readFile(descriptorPath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(descriptor);
    } catch {
      throw new Error(`Kanmer plugin MCP descriptor is not valid JSON: ${descriptorPath}`);
    }
    const entry = (parsed as { mcpServers?: { kanmer?: { command?: unknown; args?: unknown; cwd?: unknown } } } | null)?.mcpServers?.kanmer;
    if (!entry || !Array.isArray(entry.args)) {
      throw new Error(`Kanmer plugin MCP descriptor has no mcpServers.kanmer entry: ${descriptorPath}`);
    }
    if (entry.cwd !== undefined || entry.args.some((arg) => typeof arg === "string" && /^(--root|--repo-root|cwd)$/i.test(arg))) {
      throw new Error("Kanmer plugin MCP descriptor must not pin cwd, --root or --repo-root");
    }
    if (spec.cli === "agy") {
      const launcher = antigravityPortableInvocation();
      if (entry.command !== launcher.command || JSON.stringify(entry.args) !== JSON.stringify(launcher.args)) {
        throw new Error(
          "Antigravity plugin MCP descriptor must use the installer-owned %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd launcher",
        );
      }
    }
    const validate = argv?.validate?.(stagedRoot);
    if (validate || spec.validateCommand) {
      lastCommand = validate ? nativeCommandText(validate) : spec.validateCommand!(stagedRoot);
      await execute(lastCommand, validate);
    }
    const installArgv = argv?.install(stagedRoot);
    const install = installArgv ? nativeCommandText(installArgv) : spec.installCommand(stagedRoot);
    lastCommand = install;
    const installed = await execute(install, installArgv);
    const inspectArgv = argv?.inspect();
    const inspectCommand = inspectArgv ? nativeCommandText(inspectArgv) : spec.inspectCommand();
    lastCommand = inspectCommand;
    const inspect = await execute(inspectCommand, inspectArgv);
    const inspected = commandText(inspect);
    if (!spec.capabilityPresent(inspected)) {
      return {
        ok: false,
        command: inspectCommand,
        output:
          `${spec.cli} plugin install returned success, but ${inspectCommand} did not report ` +
          `${spec.pluginName}. No legacy project state was changed.`,
      };
    }
    const normalizedBranch = normalizeBoardBranch(boardBranch);
    const functionalArgv = argv?.functional(projectRoot, boardRoot, normalizedBranch);
    const functionalCommand = functionalArgv ? nativeCommandText(functionalArgv) : spec.functionalCommand(projectRoot, boardRoot, normalizedBranch);
    lastCommand = functionalCommand;
    const functional = await withLegacyRegistrationDisabled(provider, projectRoot, () => execute(functionalCommand, functionalArgv));
    const functionalOutput = `${functional.stdout}\n${functional.stderr}`.trim();
    const expected = await expectedProjectIdentity(boardRoot, projectRoot);
    const proof = parseFunctionalIdentity(functionalOutput);
    const proofOk = proof !== null &&
      proof.fingerprint === expected.fingerprint &&
      proof.boardRoot === expected.boardRoot &&
      proof.repoRoot === expected.repoRoot &&
      proof.format === expected.format &&
      proof.boardExpectedBranch === normalizedBranch &&
      proof.boardActualBranch === normalizedBranch &&
      proof.boardOnExpectedBranch === true;
    if (!proofOk) {
      return {
        ok: false,
        command: functionalCommand,
        output:
          `${spec.cli} plugin inspect passed, but the fresh functional get_status probe did not return ` +
          "the expected project identity, format and configured board branch. No legacy project state was changed.",
      };
    }
    const cleanup = await retireLegacyPluginState(provider, projectRoot);
    return {
      ok: true,
      command: install,
      output: [
        `${spec.cli} ${commandText(cli) || "CLI preflight passed"}`,
        `plugin help ${commandText(pluginHelp) ? "passed" : "returned no output"}`,
        `runtime ${commandText(runtimeResult) || "preflight passed"}`,
        commandText(installed) || "plugin installed",
        `inspect: ${inspected}`,
        `functional get_status: ${functionalOutput}`,
        ...cleanup,
      ].join("; "),
    };
  } catch (err) {
    return {
      ok: false,
      command: lastCommand,
      output: commandFailureText(err),
    };
  } finally {
    if (stagedRoot) await rm(stagedRoot, { recursive: true, force: true });
  }
}

async function disconnectNativePlugin(
  provider: AgentProvider,
  projectRoot: string,
  options: ConnectOptions = {},
): Promise<ConnectResult> {
  if (provider.install.kind !== "plugin") throw new Error("native plugin provider expected");
  const spec = provider.install;
  const run = options.commandRunner ?? defaultCommandRunner;
  const argv = spec.argv;
  const runArgv = options.nativeCommandRunner ?? defaultNativeCommandRunner;
  const execute = async (command: string, native?: NativePluginCommand) => {
    if (!native) return run(command, projectRoot);
    if (options.nativeCommandRunner) return runArgv(native.file, native.args, projectRoot);
    if (options.commandRunner) return run(command, projectRoot);
    return defaultNativeCommandRunner(native.file, native.args, projectRoot);
  };
  const listArgv = argv?.list();
  const listCommand = listArgv ? nativeCommandText(listArgv) : spec.listCommand();
  const uninstallArgv = argv?.uninstall();
  const uninstallCommand = uninstallArgv ? nativeCommandText(uninstallArgv) : spec.uninstallCommand();
  const inspectArgv = argv?.inspect();
  const inspectCommand = inspectArgv ? nativeCommandText(inspectArgv) : spec.inspectCommand();
  try {
    const before = await execute(listCommand, listArgv);
    const beforeText = commandText(before);
    let uninstall = "plugin already absent";
    if (pluginPresent(spec.pluginName, beforeText)) {
      const result = await execute(uninstallCommand, uninstallArgv);
      uninstall = commandText(result) || "plugin uninstalled";
    }
    const after = await execute(listCommand, listArgv);
    const inspected = await execute(inspectCommand, inspectArgv);
    if (pluginPresent(spec.pluginName, commandText(after)) || pluginPresent(spec.pluginName, commandText(inspected))) {
      return {
        ok: false,
        command: uninstallCommand,
        output: `${spec.cli} still reports ${spec.pluginName} after uninstall; no legacy project state was changed.`,
      };
    }
    const cleanup = await retireLegacyPluginState(provider, projectRoot);
    return {
      ok: true,
      command: uninstallCommand,
      output: [uninstall, "plugin absent from list and inspect", ...cleanup].join("; "),
    };
  } catch (err) {
    return { ok: false, command: uninstallCommand, output: commandFailureText(err) };
  }
}

export async function connectAgent(
  id: ProviderId,
  projectRoot: string,
  boardRoot: string,
  options: ConnectOptions = {},
  boardBranch = DEFAULT_BOARD_BRANCH,
): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  if (provider.install.kind === "plugin") return connectNativePlugin(provider, projectRoot, boardRoot, options, boardBranch);
  const inv = serverInvocation(id, boardRoot, projectRoot, boardBranch);
  try {
    // Every project registration names the installer-owned launcher, so a
    // missing or broken launcher must fail here — before any file is written
    // — for all three hosts, not only Codex (GUI-149).
    const probe = await probeLauncher(projectRoot, options.probeRunner);
    if (!probe.ok) return probe;
    let command: string;
    let output: string;
    if (provider.register.kind === "cli") {
      command = provider.register.addCommand(inv, projectRoot);
      for (const cmd of provider.register.removeCommands(projectRoot)) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined); // ignore "not found"
      }
      const argv = provider.register.addArgv?.(inv, projectRoot);
      const { stdout, stderr } = argv
        ? await (options.argvCommandRunner ?? defaultNativeCommandRunner)(argv.file, argv.args, projectRoot)
        : await execAsync(command, { cwd: projectRoot });
      output = (stdout || stderr || "Registered.").trim();
      // Claude Code approves project-scoped servers per project, and a changed
      // command may be treated as a new server. Say so rather than letting
      // "Pending approval" in `claude mcp list` read as a failed Connect.
      if (id === "claude") {
        output += " Claude Code may ask you to approve this project's kanmer server on its next start.";
      }
    } else if (provider.register.kind === "configFile") {
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
      // Retained for legacy provider specs and migration fixtures. The active
      // Antigravity route is the native plugin lifecycle above, not this
      // project-file branch.
      if (id === "antigravity") output += ` ${antigravityBindingNote(projectRoot)}`;
    } else {
      throw new Error(`Provider ${id} has no project registration; expected native plugin path.`);
    }
    const ignoreNote = await ensureConnectIgnore(provider, projectRoot);
    if (ignoreNote) output += ` ${ignoreNote}.`;
    const skills = await installSkills(provider, projectRoot, boardBranch, options).catch(
      (e): SkillsInstallOutcome => ({
        note: "",
        failure: {
          command: `install skills for ${id}`,
          output: e instanceof Error ? e.message : String(e),
        },
      }),
    );
    // Registration and skill install are two operations, and a half-success is
    // reported as one rather than rounded to either end. `ok: false` is what
    // makes Settings.tsx render the failing command with a copy button — the
    // copy-paste fallback FRD-012 AC-4 has always specified and which the
    // marketplace hosts never got, because their failures arrived as a note on
    // an `ok: true` result and the panel showed "✓ Connected".
    if (skills.failure) {
      const ran = skills.note ? ` ${skills.note}` : "";
      return {
        ok: false,
        command: skills.failure.command,
        output:
          `${output}${ran}\n\nBut installing the skills failed, so this host has ` +
          `the board and not the skills. Run the command above by hand:\n${skills.failure.output}`,
      };
    }
    return { ok: true, command, output: `${output} ${skills.note}`.trim() };
  } catch (err) {
    const command =
      provider.register.kind === "cli"
        ? provider.register.addCommand(inv, projectRoot)
        : provider.register.kind === "configFile"
          ? `edit ${provider.register.configPath}`
          : `connect ${id}`;
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
export async function disconnectAgent(
  id: ProviderId,
  projectRoot: string,
  options: ConnectOptions = {},
): Promise<ConnectResult> {
  const provider = providerById(id);
  if (!provider) return { ok: false, command: "", output: `Unknown provider "${id}"` };
  if (provider.install.kind === "plugin") return disconnectNativePlugin(provider, projectRoot, options);
  try {
    const cleanupNotes: string[] = ["provider registration removed"];
    // FRD-012 R4: disconnect reverses what connect wrote. Connect now leaves a
    // durable marketplace registration and a user-scoped plugin on the host —
    // before GUI-147 there was nothing marketplace-shaped to reverse, because
    // the staged directory was already deleted by the time connect returned.
    //
    // Best-effort, like every other removal here: disconnecting a host that was
    // never connected must not fail. The installer-owned staged directory is
    // deliberately left in place — once the registration is gone it is inert,
    // and the next Connect refreshes it.
    if (provider.install.kind === "marketplace" && provider.install.hostRemoveCommands) {
      const run = options.commandRunner ?? defaultCommandRunner;
      for (const cmd of provider.install.hostRemoveCommands()) {
        await run(cmd, projectRoot).catch(() => undefined);
      }
      cleanupNotes.push("host marketplace registration and plugin removed");
    }
    if (provider.register.kind === "cli") {
      for (const cmd of provider.register.removeCommands(projectRoot)) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined);
      }
    } else if (provider.register.kind === "configFile") {
      const path = resolveConfigPath(provider.register.configPath, projectRoot);
      if (existsSync(path)) {
        await writeAtomic(path, provider.register.unmerge(await readFile(path, "utf8")));
      }
      // Disconnect should leave nothing behind, including the legacy global
      // entry a previous version of Kanmer wrote.
      for (const cmd of provider.register.removeCommands?.(projectRoot) ?? []) {
        await execAsync(cmd, { cwd: projectRoot }).catch(() => undefined);
      }
    } else {
      throw new Error(`Provider ${id} has no project registration; expected native plugin path.`);
    }
    if (provider.install.kind === "copySkills") {
      if (provider.install.skillsScope === "project" && provider.install.skillsDir) {
        const dir = provider.install.skillsDir;
        // A directory may serve multiple hosts, so removal asks whether a peer
        // writing *this* directory is still connected — not merely whether any
        // copy-skills host is, which would retain unrelated provider state.
        if (await hasRegisteredCopySkillsPeer(id, projectRoot, dir)) {
          cleanupNotes.push(`copied skills retained in ${dir} for another connected host`);
        } else {
          await removeBundledSkillsOnly(projectRoot, dir);
          cleanupNotes.push("bundled copied skills removed");
        }
      }
      const peerRemains = await hasRegisteredAgentPeer(id, projectRoot);
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
