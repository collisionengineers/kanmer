import {
  dispatchProviderById,
  dispatchTaskById,
  type DispatchProviderId,
} from "@kanmer/core";

export type DispatchApproval = "elicit" | "preapproved";

export interface DispatchPolicy {
  enabled: boolean;
  providers: readonly DispatchProviderId[];
  tasks: readonly string[];
  maxActive: number;
  timeoutMs: number;
  maxTimeoutMs: number;
  approval: DispatchApproval | null;
  reason?: string;
}

export interface DispatchPolicyView {
  enabled: boolean;
  providers: readonly string[];
  tasks: readonly string[];
  maxActive: number;
  timeoutMs: number;
  maxTimeoutMs: number;
  approval: DispatchApproval | null;
  reason?: string;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_MAX_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVE = 16;

function disabled(reason: string): DispatchPolicy {
  return { enabled: false, providers: [], tasks: [], maxActive: 1, timeoutMs: DEFAULT_TIMEOUT_MS, maxTimeoutMs: DEFAULT_MAX_TIMEOUT_MS, approval: null, reason };
}

function csv(value: string | undefined): string[] | null {
  if (!value || value.trim() === "") return null;
  const values = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
  return values.length ? values : null;
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number | null {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** Parse the one operator policy namespace. Invalid opt-in always fails closed. */
export function parseDispatchPolicy(env: NodeJS.ProcessEnv = process.env): DispatchPolicy {
  const enabled = env.KANMER_DISPATCH_ENABLED?.trim().toLowerCase();
  if (enabled === undefined || enabled === "false" || enabled === "0" || enabled === "") return disabled("dispatch is disabled by operator policy");
  if (enabled !== "true" && enabled !== "1") return disabled("KANMER_DISPATCH_ENABLED must be true or false");

  const providers = csv(env.KANMER_DISPATCH_PROVIDERS);
  if (!providers) return disabled("KANMER_DISPATCH_PROVIDERS must name at least one provider");
  const unknownProvider = providers.find((id) => !dispatchProviderById(id));
  if (unknownProvider) return disabled(`unknown dispatch provider "${unknownProvider}"`);
  const tasks = csv(env.KANMER_DISPATCH_TASKS);
  if (!tasks) return disabled("KANMER_DISPATCH_TASKS must name at least one task");
  const unknownTask = tasks.find((id) => !dispatchTaskById(id));
  if (unknownTask) return disabled(`unknown dispatch task "${unknownTask}"`);
  const maxActive = boundedInteger(env.KANMER_DISPATCH_MAX_ACTIVE, 1, 1, MAX_ACTIVE);
  if (maxActive === null) return disabled(`KANMER_DISPATCH_MAX_ACTIVE must be an integer between 1 and ${MAX_ACTIVE}`);
  const timeoutMs = boundedInteger(env.KANMER_DISPATCH_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 1, DEFAULT_MAX_TIMEOUT_MS);
  if (timeoutMs === null) return disabled(`KANMER_DISPATCH_TIMEOUT_MS must be an integer between 1 and ${DEFAULT_MAX_TIMEOUT_MS}`);
  const maxTimeoutMs = boundedInteger(env.KANMER_DISPATCH_MAX_TIMEOUT_MS, Math.max(timeoutMs, DEFAULT_MAX_TIMEOUT_MS), timeoutMs, DEFAULT_MAX_TIMEOUT_MS * 4);
  if (maxTimeoutMs === null) return disabled(`KANMER_DISPATCH_MAX_TIMEOUT_MS must be an integer between ${timeoutMs} and ${DEFAULT_MAX_TIMEOUT_MS * 4}`);
  const approval = env.KANMER_DISPATCH_APPROVAL?.trim().toLowerCase();
  if (approval !== "elicit" && approval !== "preapproved") return disabled("KANMER_DISPATCH_APPROVAL must be elicit or preapproved");
  return { enabled: true, providers: providers as DispatchProviderId[], tasks, maxActive, timeoutMs, maxTimeoutMs, approval };
}

export function dispatchPolicyView(policy: DispatchPolicy): DispatchPolicyView {
  return { enabled: policy.enabled, providers: [...policy.providers], tasks: [...policy.tasks], maxActive: policy.maxActive, timeoutMs: policy.timeoutMs, maxTimeoutMs: policy.maxTimeoutMs, approval: policy.approval, ...(policy.reason ? { reason: policy.reason } : {}) };
}
