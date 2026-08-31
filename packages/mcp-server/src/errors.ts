export type KanmerErrorCode =
  | "WRONG_PROJECT"
  | "REVISION_CONFLICT"
  | "GATE_BLOCKED"
  | "LEASE_EXPIRED"
  | "LEASE_CONFLICT"
  // FRD-028 apply refusals (CORE-131): nothing to apply, and the ticket moved
  // under the collection that proposed it. Both are normal outcomes.
  | "RECONCILIATION_INCONCLUSIVE"
  | "RECONCILIATION_DRIFT"
  // FRD-031 release serialization (CORE-132): a second concurrent owner of a
  // release channel. Named in the approved structured-error set.
  | "RELEASE_CHANNEL_HELD";

/**
 * Lease refusals (CORE-115, FRD-030) that mean "the workspace or lease is not
 * yours to write": a live lease held by someone else, an occupied workspace,
 * a reclaim the evidence forbids, or a renew that did not name its lease.
 */
/**
 * Release-serialization refusals (CORE-132, FRD-031 AC4). `RELEASE_CHANNEL_HELD`
 * is its own code because it is in the approved structured-error set; the other
 * two are immutability refusals and classify as lease conflicts, which is what
 * they are — a write to a record that is no longer yours to change.
 */
const RELEASE_HELD_PREFIX = "RELEASE_CHANNEL_HELD:";
const RELEASE_CONFLICT_PREFIXES = [
  "RELEASE_ATTEMPT_TERMINAL:",
  "RELEASE_CANDIDATE_IMMUTABLE:",
  "RELEASE_ATTEMPT_MISSING:",
  "RELEASE_RECORD_UNREADABLE:",
  "RELEASE_TRANSACTION_CONFLICT:",
  "RELEASE_TRANSACTION_PENDING:",
  "RELEASE_TRANSACTION_INVALID:",
  "RELEASE_CHANNEL_CASE_COLLISION:",
];

const LEASE_CONFLICT_PREFIXES = ["LEASE_LIVE:", "CLAIM_LIVE:", "CLAIM_NOT_OWNED:", "WORKSPACE_OCCUPIED:", "RECOVERY_REFUSED:", "LEASE_ID_REQUIRED:", "LEASE_REVISION_REQUIRED:", "BATCH_INVALID:", "BATCH_FROZEN:", "BATCH_OWNER_MISMATCH:", "BATCH_INCONSISTENT:", "BATCH_TRANSACTION_CONFLICT:", "BATCH_TRANSACTION_PENDING:", "BATCH_TRANSACTION_INVALID:", "BATCH_WORKSPACE_MISMATCH:", "BATCH_ACTIVE:"];

export class KanmerError extends Error {
  constructor(readonly code: KanmerErrorCode, message: string) {
    super(message);
    this.name = "KanmerError";
  }
}

function classifiedCode(message: string): KanmerErrorCode | undefined {
  if (message.startsWith("Conflict:")) return "REVISION_CONFLICT";
  if (message.startsWith(RELEASE_HELD_PREFIX)) return "RELEASE_CHANNEL_HELD";
  if (message.startsWith("RELEASE_POLICY_DRIFT:")) return "REVISION_CONFLICT";
  if (message.startsWith("RELEASE_INPUT_INVALID:")) return "RECONCILIATION_INCONCLUSIVE";
  if (message.startsWith("RECONCILIATION_DRIFT:")) return "RECONCILIATION_DRIFT";
  if (message.startsWith("LEASE_EXPIRED:")) return "LEASE_EXPIRED";
  if (RELEASE_CONFLICT_PREFIXES.some((prefix) => message.startsWith(prefix))) return "LEASE_CONFLICT";
  if (LEASE_CONFLICT_PREFIXES.some((prefix) => message.startsWith(prefix))) return "LEASE_CONFLICT";
  // Core keeps gate failures as ordinary errors. Match its explicit movement
  // refusal wording, not generic words such as "blocked" in validation text.
  if (/\b(?:entering|leaving)\b[^:\n]*\brequires\b/i.test(message) || /\bcannot move\b.*\bcrosses\b/i.test(message)) return "GATE_BLOCKED";
  return undefined;
}

/** The logical-project block every response carries (FRD-029). */
export interface ResponseProject {
  project_id: string | null;
  board_id: string | null;
  fingerprint: string;
}

/**
 * The sole tool-result builder for caught/explicit errors. `project`, when
 * known, decorates the structured result so even a refusal names the logical
 * project that refused it; the text is unchanged for older clients.
 */
export function failCoded(error: unknown, project?: ResponseProject) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof KanmerError ? error.code : classifiedCode(message);
  const text = message.startsWith("Conflict:") ? message : `Error: ${message}`;
  const structured = {
    ...(code ? { error: { code, message } } : {}),
    ...(project ? { project } : {}),
  };
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
    ...(Object.keys(structured).length ? { structuredContent: structured } : {}),
  };
}
