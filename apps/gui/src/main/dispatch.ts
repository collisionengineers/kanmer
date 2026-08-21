// GUI adapter for the shared, Electron-free dispatch supervisor. The GUI owns
// the user-data log location, renderer tail sink and ticket-scratch recorder;
// core owns provider arguments, lifecycle, locking, timeout and cancellation.
import { app } from "electron";
import { join } from "node:path";
import {
  DispatchSupervisor,
  dispatchProviderById,
  dispatchTaskById,
  takeTicketPromptText,
  composeDispatchPrompt,
  type DispatchLocalStatus,
  type DispatchStatus as CoreDispatchStatus,
  type DispatchSupervisorOptions,
  type KanmerStore,
} from "@kanmer/core";
import type { DispatchStatus } from "../shared/ipc.js";
import type { ProviderId } from "./providers.js";
import { readSettings, resolveDispatchSettings } from "./settings.js";

let emit: (status: DispatchStatus) => void = () => {};
const stores = new Map<string, KanmerStore>();
let supervisor: DispatchSupervisor | null = null;

function asGuiStatus(status: DispatchLocalStatus): DispatchStatus {
  return { ...status, ...(status.tail ? { tail: status.tail.slice(-50) } : {}) };
}

function terminalSummary(status: CoreDispatchStatus, tail: readonly string[]): string {
  return [
    `## Dispatch ${status.dispatchId} — ${status.provider}`,
    `- state: ${status.state} (exit ${status.exitCode ?? "unknown"})`,
    status.reason ? `- reason: ${status.reason}` : "",
    "",
    "```",
    ...tail.slice(-50),
    "```",
  ].filter(Boolean).join("\n");
}

function getSupervisor(): DispatchSupervisor {
  if (supervisor) return supervisor;
  const options: DispatchSupervisorOptions = {
    logDir: join(app.getPath("userData"), "dispatch"),
    // The GUI historically allowed separate projects to dispatch in parallel;
    // the project+ticket lock still prevents duplicates within each project.
    maxActive: 16,
    statusSink: (status) => emit(asGuiStatus(status)),
    recordTerminal: async (status, tail) => {
      const store = stores.get(status.projectId);
      if (!store) throw new Error(`No open project store for ${status.projectId}`);
      await store.appendScratch(status.ticketId, "dispatch", terminalSummary(status, tail));
    },
  };
  supervisor = new DispatchSupervisor(options);
  return supervisor;
}

export function onDispatchStatus(fn: (status: DispatchStatus) => void): void {
  emit = fn;
}

/** Test seam retained at the GUI boundary; production uses core's native spawn. */
export function __setSpawnForTests(fn: DispatchSupervisorOptions["spawn"] | null): void {
  getSupervisor().setSpawnForTests(fn);
}

export function listDispatches(projectId?: string): DispatchStatus[] {
  return getSupervisor().listLocal(projectId === undefined ? {} : { projectId }).map(asGuiStatus);
}

export async function dispatchTicket(
  store: KanmerStore,
  providerId: ProviderId,
  projectId: string,
  ticketId: string,
  opts: { timeoutMs?: number; taskId?: string } = {},
  sourceRoot: string,
): Promise<DispatchStatus> {
  const provider = dispatchProviderById(providerId);
  if (!provider) throw new Error(`"${providerId}" doesn't support background dispatch.`);
  const item = await store.getItem(ticketId);
  if (!item) throw new Error(`No ticket "${ticketId}".`);
  if (item.taken_at) throw new Error(`${ticketId} is already taken${item.assignee ? ` by ${item.assignee}` : ""} — release it first.`);
  const task = opts.taskId ? dispatchTaskById(opts.taskId) : undefined;
  if (opts.taskId && !task) throw new Error(`Unknown dispatch task "${opts.taskId}".`);
  stores.set(projectId, store);
  const builtInPrompt = task ? task.prompt(ticketId) : takeTicketPromptText(ticketId);
  const config = resolveDispatchSettings(readSettings().dispatch, provider.id, task?.id);
  if (config.model && !provider.modelOption) throw new Error(`Provider "${provider.label}" has no verified model override.`);
  const prompt = composeDispatchPrompt(builtInPrompt, config.promptSuffix);
  const status = await getSupervisor().start({
    projectId,
    sourceRoot,
    ticketId,
    provider: provider.id,
    requestedBy: "gui",
    prompt,
    ...(config.model ? { model: config.model } : {}),
    ...(config.promptCustomized ? { promptCustomized: true } : {}),
    ...(opts.timeoutMs === undefined ? {} : { timeoutMs: opts.timeoutMs }),
    ...(task ? { task: { id: task.id, label: task.label, deliverable: task.deliverable, prompt } } : {}),
  });
  return asGuiStatus(status as DispatchLocalStatus);
}

export function cancelDispatch(dispatchId: string): boolean {
  return getSupervisor().cancel(dispatchId)?.dispatchId === dispatchId;
}

export function killAllDispatches(): void {
  getSupervisor().killAll();
}
