/**
 * Sanitised evidence contract for MCP-028's disposable public-client run.
 *
 * This is deliberately separate from doctor: doctor describes the current
 * process, while this packet describes a client crossing the public boundary.
 * The packet never contains a URL, token, session id, hostname, or provider
 * credential. A protected environment that cannot be reached is represented
 * as `inconclusive`, not as a passing fixture result.
 */

export const REMOTE_PUBLIC_CHECK_IDS = [
  "EXACT_COMMIT_VERIFIED",
  "ROOT_VERIFY_PASS",
  "STDIO_REGRESSION_PASS",
  "LOCAL_DOCTOR_PASS",
  "PUBLIC_DNS_TLS_ROUTE_PASS",
  "PUBLIC_AUTH_NEGATIVE_PASS",
  "PUBLIC_MCP_INITIALIZE_PASS",
  "EXPECTED_PROJECT_PASS",
  "REMOTE_TOOL_POLICY_PASS",
  "REMOTE_DISPATCH_EXCLUDED",
  "WRONG_EXPECTED_PROJECT_BLOCKED",
  "CONTROLLED_REMOTE_MUTATION_PASS",
  "REMOTE_GATE_BLOCK_PASS",
  "PUBLIC_SESSION_LIFECYCLE_PASS",
  "TOKEN_ROTATION_PASS",
  "PROCESS_RESTART_SESSION_INVALIDATION_PASS",
  "TUNNEL_DEGRADATION_RECOVERY_PASS",
  "GUI_MULTI_PROJECT_EVIDENCE_PASS",
  "PUBLIC_DOCTOR_FINAL_PASS",
  "SECRET_SCAN_PASS",
  "CLEANUP_PASS",
] as const;

export type RemotePublicCheckId = (typeof REMOTE_PUBLIC_CHECK_IDS)[number];
export type RemotePublicCheckStatus = "pass" | "fail" | "inconclusive" | "skipped";

export interface RemotePublicCheck {
  readonly id: RemotePublicCheckId;
  readonly status: RemotePublicCheckStatus;
  readonly reason?: string;
}

export interface RemotePublicEvidence {
  readonly schemaVersion: 1;
  readonly ticket: "MCP-028";
  readonly outcome: "pass" | "fail" | "inconclusive";
  readonly checks: readonly RemotePublicCheck[];
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly environment: "deterministic-fixture" | "protected-cloudflare";
  readonly cleanupErrors?: readonly string[];
}

const SAFE_REASON = /^[A-Za-z0-9 .,:;_()/'-]{1,240}$/;

export function safeReason(reason: string): string {
  const trimmed = reason.trim();
  return SAFE_REASON.test(trimmed) ? trimmed : "redacted diagnostic";
}

export function check(id: RemotePublicCheckId, status: RemotePublicCheckStatus, reason?: string): RemotePublicCheck {
  return { id, status, ...(reason ? { reason: safeReason(reason) } : {}) };
}

export function evidence(
  checks: readonly RemotePublicCheck[],
  options: Pick<RemotePublicEvidence, "startedAt" | "finishedAt" | "environment"> & { readonly cleanupErrors?: readonly string[] },
): RemotePublicEvidence {
  const hasFail = checks.some((item) => item.status === "fail");
  const hasInconclusive = checks.some((item) => item.status === "inconclusive");
  return {
    schemaVersion: 1,
    ticket: "MCP-028",
    outcome: hasFail ? "fail" : hasInconclusive ? "inconclusive" : "pass",
    checks,
    startedAt: options.startedAt,
    finishedAt: options.finishedAt,
    durationMs: Math.max(0, Date.parse(options.finishedAt) - Date.parse(options.startedAt)),
    environment: options.environment,
    ...(options.cleanupErrors?.length ? { cleanupErrors: options.cleanupErrors.map(safeReason) } : {}),
  };
}
