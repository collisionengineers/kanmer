import { app } from "electron";
import { join } from "node:path";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dispatchProviderById, DISPATCH_PROMPT_SUFFIX_MAX, DISPATCH_TASKS, type DispatchProviderId, type DispatchTaskId } from "@kanmer/core";
import type { NativeReconnectProvider, NativeReconnectRequirement } from "../shared/ipc.js";

export type Theme = "dark" | "light" | "system";
export type CardDensity = "comfortable" | "compact";

/** App-global UI preferences (Phase 4.4). Mirror of shared/ipc.ts UiPreferences. */
export interface UiPreferences {
  cardDensity: CardDensity;
  confirmOnDelete: boolean;
  defaultPriority: string;
  defaultArea: string;
}

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}

export interface DispatchProviderSettings {
  defaultModel?: string;
  taskModels?: Partial<Record<DispatchTaskId, string>>;
  promptSuffix?: string;
}

export interface DispatchSettings {
  providers: Partial<Record<DispatchProviderId, DispatchProviderSettings>>;
}

export interface AppSettings extends UiPreferences {
  theme: Theme;
  recentProjects: string[];
  /** Native toasts for agent-made board changes (default on). */
  notifications: boolean;
  windowBounds?: WindowBounds;
  /** The open-tab session (project roots) restored on next boot. */
  openTabs: string[];
  /** The active tab's project root. */
  activeTab: string;
  sessionInitialized: boolean;
  kanmerBranch: string;
  gitSyncMinutes: number;
  /** Hosted board-branch handoffs awaiting explicit operator acknowledgement. */
  pendingBoardHandoffs?: Record<string, { from: string; to: string; warning: string }>;
  /** Native providers whose user-scoped staged descriptor needs explicit reconnect. */
  pendingNativeReconnects?: Record<string, NativeReconnectRequirement>;
  /** Last successfully observed board branch for each opened project. */
  lastKnownBoardBranches?: Record<string, string>;
  /** GUI remote-access registry; owned by the remote-access store but preserved by settings writes. */
  remoteAccess?: Record<string, unknown>;
  dispatch: DispatchSettings;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  recentProjects: [],
  notifications: true,
  openTabs: [],
  activeTab: "",
  sessionInitialized: false,
  cardDensity: "comfortable",
  confirmOnDelete: true,
  defaultPriority: "",
  defaultArea: "",
  kanmerBranch: "kanmer-board",
  gitSyncMinutes: 0,
  dispatch: { providers: {} },
};
const MAX_RECENT = 8;
const MAX_MODEL = 200;
const MODEL_CONTROL = /[\u0000-\u001f\u007f]/;
const SUFFIX_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
let settingsQueue: Promise<void> = Promise.resolve();

function cleanText(value: unknown, max: number, control = SUFFIX_CONTROL): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text && text.length <= max && !control.test(text) ? text : undefined;
}

function normalizeProviderSettings(raw: unknown, strict = false): DispatchProviderSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    if (strict) throw new Error("dispatch provider settings must be an object");
    return {};
  }
  const value = raw as Record<string, unknown>;
  const defaultModel = cleanText(value.defaultModel, MAX_MODEL, MODEL_CONTROL);
  const suffix = cleanText(value.promptSuffix, DISPATCH_PROMPT_SUFFIX_MAX);
  if (strict && value.defaultModel !== undefined && defaultModel === undefined) throw new Error("default model is invalid");
  if (strict && value.promptSuffix !== undefined && suffix === undefined) throw new Error("prompt suffix is invalid");
  const taskModels: Partial<Record<DispatchTaskId, string>> = {};
  const knownTasks = new Set(DISPATCH_TASKS.map((task) => task.id));
  if (value.taskModels && typeof value.taskModels === "object" && !Array.isArray(value.taskModels)) {
    for (const [task, model] of Object.entries(value.taskModels as Record<string, unknown>)) {
      if (!knownTasks.has(task as DispatchTaskId)) {
        if (strict) continue;
        continue;
      }
      const clean = cleanText(model, MAX_MODEL, MODEL_CONTROL);
      if (clean) taskModels[task as DispatchTaskId] = clean;
      else if (strict && model !== undefined) throw new Error(`task model for ${task} is invalid`);
    }
  } else if (strict && value.taskModels !== undefined) throw new Error("task models must be an object");
  return {
    ...(defaultModel ? { defaultModel } : {}),
    ...(Object.keys(taskModels).length ? { taskModels } : {}),
    ...(suffix ? { promptSuffix: suffix } : {}),
  };
}

export function normalizeDispatchSettings(raw: unknown, strict = false): DispatchSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    if (strict) throw new Error("dispatch settings must be an object");
    return { providers: {} };
  }
  const providers: Partial<Record<DispatchProviderId, DispatchProviderSettings>> = {};
  const rawProviders = (raw as Record<string, unknown>).providers;
  if (!rawProviders || typeof rawProviders !== "object" || Array.isArray(rawProviders)) {
    if (strict && rawProviders !== undefined) throw new Error("dispatch providers must be an object");
    return { providers };
  }
  for (const [id, value] of Object.entries(rawProviders as Record<string, unknown>)) {
    if (!dispatchProviderById(id)) { if (strict) continue; continue; }
    const clean = normalizeProviderSettings(value, strict);
    if (Object.keys(clean).length) providers[id as DispatchProviderId] = clean;
  }
  return { providers };
}

export function resolveDispatchSettings(settings: DispatchSettings, provider: DispatchProviderId, taskId?: DispatchTaskId) {
  const value = settings.providers[provider];
  const model = taskId ? value?.taskModels?.[taskId] ?? value?.defaultModel : value?.defaultModel;
  return { ...(model ? { model } : {}), promptSuffix: value?.promptSuffix ?? "", promptCustomized: Boolean(value?.promptSuffix?.trim()) };
}

function file(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function readSettings(): AppSettings {
  try {
    const parsed = JSON.parse(readFileSync(file(), "utf8")) as Partial<AppSettings>;
    const bounds = parsed.windowBounds;
    return {
      theme:
        parsed.theme === "light" || parsed.theme === "system" ? parsed.theme : "dark",
      recentProjects: Array.isArray(parsed.recentProjects) ? parsed.recentProjects : [],
      notifications: parsed.notifications !== false,
      openTabs: Array.isArray(parsed.openTabs) ? parsed.openTabs : [],
      activeTab: typeof parsed.activeTab === "string" ? parsed.activeTab : "",
      sessionInitialized: parsed.sessionInitialized === true,
      cardDensity: parsed.cardDensity === "compact" ? "compact" : "comfortable",
      confirmOnDelete: parsed.confirmOnDelete !== false,
      defaultPriority: typeof parsed.defaultPriority === "string" ? parsed.defaultPriority : "",
      defaultArea: typeof parsed.defaultArea === "string" ? parsed.defaultArea : "",
      kanmerBranch: typeof parsed.kanmerBranch === "string" && parsed.kanmerBranch.trim() ? parsed.kanmerBranch.trim() : "kanmer-board",
      gitSyncMinutes: Number.isInteger(parsed.gitSyncMinutes) && (parsed.gitSyncMinutes ?? 0) > 0 ? parsed.gitSyncMinutes! : 0,
      ...(parsed.pendingBoardHandoffs && typeof parsed.pendingBoardHandoffs === "object" && !Array.isArray(parsed.pendingBoardHandoffs)
        ? { pendingBoardHandoffs: parsed.pendingBoardHandoffs as AppSettings["pendingBoardHandoffs"] }
        : {}),
      ...(parsed.pendingNativeReconnects && typeof parsed.pendingNativeReconnects === "object" && !Array.isArray(parsed.pendingNativeReconnects)
        ? { pendingNativeReconnects: normalizeNativeReconnectMap(parsed.pendingNativeReconnects) }
        : {}),
      ...(parsed.lastKnownBoardBranches && typeof parsed.lastKnownBoardBranches === "object" && !Array.isArray(parsed.lastKnownBoardBranches)
        ? { lastKnownBoardBranches: normalizeKnownBranches(parsed.lastKnownBoardBranches) }
        : {}),
      ...(parsed.remoteAccess && typeof parsed.remoteAccess === "object" ? { remoteAccess: parsed.remoteAccess as Record<string, unknown> } : {}),
      dispatch: normalizeDispatchSettings(parsed.dispatch),
      ...(bounds && typeof bounds.width === "number" && typeof bounds.height === "number"
        ? { windowBounds: bounds }
        : {}),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist Git board preferences. Invalid intervals deliberately mean sync off. */
export function setKanmerGitPreferences(kanmerBranch: string, gitSyncMinutes: number): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.kanmerBranch = kanmerBranch.trim() || "kanmer-board";
    settings.gitSyncMinutes = Number.isInteger(gitSyncMinutes) && gitSyncMinutes > 0 ? gitSyncMinutes : 0;
    writeSettings(settings);
    return settings;
  });
}

/** Persist the hosted handoff state independently of a project's open context. */
export function setKanmerGitHandoff(
  projectId: string,
  handoff: { from: string; to: string; warning: string } | null,
): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    const pending = { ...(settings.pendingBoardHandoffs ?? {}) };
    if (handoff) pending[projectId] = handoff;
    else delete pending[projectId];
    if (Object.keys(pending).length > 0) settings.pendingBoardHandoffs = pending;
    else delete settings.pendingBoardHandoffs;
    writeSettings(settings);
    return settings;
  });
}

const NATIVE_RECONNECT_PROVIDERS: readonly NativeReconnectProvider[] = ["grok", "antigravity"];

function normalizeNativeReconnect(value: unknown): NativeReconnectRequirement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const branch = cleanText(record.branch, 200, MODEL_CONTROL);
  const providers = Array.isArray(record.providers)
    ? [...new Set(record.providers.filter((id): id is NativeReconnectProvider => NATIVE_RECONNECT_PROVIDERS.includes(id as NativeReconnectProvider)))]
    : [];
  return branch && providers.length > 0 ? { branch, providers } : undefined;
}

function normalizeNativeReconnectMap(value: unknown): Record<string, NativeReconnectRequirement> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, NativeReconnectRequirement> = {};
  for (const [projectId, requirement] of Object.entries(value as Record<string, unknown>)) {
    const clean = normalizeNativeReconnect(requirement);
    if (clean) result[projectId] = clean;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeKnownBranches(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: Record<string, string> = {};
  for (const [projectId, branch] of Object.entries(value as Record<string, unknown>)) {
    const clean = cleanText(branch, 200, MODEL_CONTROL);
    if (clean) result[projectId] = clean;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function writeNativeReconnectState(settings: AppSettings, projectId: string, requirement: NativeReconnectRequirement | null): void {
  const pending = { ...(settings.pendingNativeReconnects ?? {}) };
  if (requirement && requirement.providers.length > 0) pending[projectId] = requirement;
  else delete pending[projectId];
  if (Object.keys(pending).length > 0) settings.pendingNativeReconnects = pending;
  else delete settings.pendingNativeReconnects;
}

/** Observe a successfully opened board branch and retain native reconnect state across reopen. */
export function observeKanmerBoardBranch(projectId: string, branch: string): Promise<NativeReconnectRequirement | null> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    const current = branch.trim() || "kanmer-board";
    const previous = settings.lastKnownBoardBranches?.[projectId];
    const existing = settings.pendingNativeReconnects?.[projectId];
    const providers = new Set<NativeReconnectProvider>(existing?.providers ?? []);
    if (previous && previous !== current) for (const provider of NATIVE_RECONNECT_PROVIDERS) providers.add(provider);
    const known = { ...(settings.lastKnownBoardBranches ?? {}), [projectId]: current };
    settings.lastKnownBoardBranches = known;
    const requirement = providers.size > 0 ? { branch: current, providers: [...providers] } : null;
    writeNativeReconnectState(settings, projectId, requirement);
    writeSettings(settings);
    return requirement;
  });
}

/** Mark both user-scoped native providers stale after an in-app branch rename. */
export function markNativeReconnectRequired(projectId: string, branch: string): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    const current = branch.trim() || "kanmer-board";
    settings.lastKnownBoardBranches = { ...(settings.lastKnownBoardBranches ?? {}), [projectId]: current };
    writeNativeReconnectState(settings, projectId, { branch: current, providers: [...NATIVE_RECONNECT_PROVIDERS] });
    writeSettings(settings);
    return settings;
  });
}

/** Clear only the native provider that successfully completed explicit Connect. */
export function clearNativeReconnectRequired(projectId: string, provider: NativeReconnectProvider): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    const existing = settings.pendingNativeReconnects?.[projectId];
    if (!existing) return settings;
    writeNativeReconnectState(settings, projectId, {
      branch: existing.branch,
      providers: existing.providers.filter((candidate) => candidate !== provider),
    });
    writeSettings(settings);
    return settings;
  });
}

export function setDispatchSettings(dispatch: DispatchSettings): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const normalized = normalizeDispatchSettings(dispatch, true);
    const settings = readSettings();
    settings.dispatch = normalized;
    writeSettings(settings);
    return settings;
  });
}

/** Persist the open-tab session (capped at MAX_RECENT). */
export function setOpenTabs(openTabs: string[], activeTab: string): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.openTabs = openTabs.slice(0, MAX_RECENT);
    settings.activeTab = activeTab;
    settings.sessionInitialized = true;
    writeSettings(settings);
    return settings;
  });
}

function writeSettings(settings: AppSettings): void {
  const target = file();
  mkdirSync(join(app.getPath("userData")), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  renameSync(temporary, target);
}

/** Serialize every settings.json read-modify-write, including remote access. */
export function withSettingsFileLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = settingsQueue;
  const run = previous.catch(() => undefined).then(work);
  settingsQueue = run.then(() => undefined, () => undefined);
  return run;
}

export function setTheme(theme: Theme): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.theme = theme;
    writeSettings(settings);
    return settings;
  });
}

export function setNotifications(on: boolean): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.notifications = on;
    writeSettings(settings);
    return settings;
  });
}

/** Merge a partial UI-preferences patch (Phase 4.4). */
export function setPreferences(patch: Partial<UiPreferences>): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    if (patch.cardDensity === "compact" || patch.cardDensity === "comfortable") settings.cardDensity = patch.cardDensity;
    if (typeof patch.confirmOnDelete === "boolean") settings.confirmOnDelete = patch.confirmOnDelete;
    if (typeof patch.defaultPriority === "string") settings.defaultPriority = patch.defaultPriority;
    if (typeof patch.defaultArea === "string") settings.defaultArea = patch.defaultArea;
    writeSettings(settings);
    return settings;
  });
}

export function setWindowBounds(bounds: WindowBounds): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.windowBounds = bounds;
    writeSettings(settings);
    return settings;
  });
}

/** Record a project as most-recently-opened (dedup, capped). */
export function recordRecentProject(root: string): Promise<AppSettings> {
  return withSettingsFileLock(async () => {
    const settings = readSettings();
    settings.recentProjects = [root, ...settings.recentProjects.filter((p) => p !== root)].slice(0, MAX_RECENT);
    writeSettings(settings);
    return settings;
  });
}
