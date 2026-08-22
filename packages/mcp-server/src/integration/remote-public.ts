import { check, evidence, type RemotePublicEvidence } from "./remote-public-types.js";

export interface RemotePublicBoundaryInput {
  readonly missingAuthStatus: number;
  readonly wrongAuthStatus: number;
  readonly expectedProjectMatched: boolean;
  readonly remoteTools: readonly string[];
  readonly canonicalTools: readonly string[];
  readonly dispatchTools?: readonly string[];
}

/**
 * Evaluate the client-facing part of the boundary without knowing anything
 * about a provider. The official SDK client supplies initialization and
 * session evidence; this function only compares sanitized observations.
 */
export function evaluateRemotePublicBoundary(input: RemotePublicBoundaryInput): readonly ReturnType<typeof check>[] {
  const remote = [...input.remoteTools].sort();
  const canonical = [...input.canonicalTools].filter((name) => !(input.dispatchTools ?? []).includes(name)).sort();
  const dispatchExcluded = !(input.dispatchTools ?? []).some((name) => input.remoteTools.includes(name));
  return [
    check("PUBLIC_AUTH_NEGATIVE_PASS", input.missingAuthStatus === 401 && input.wrongAuthStatus === 401 ? "pass" : "fail", "missing and wrong bearer probes"),
    check("EXPECTED_PROJECT_PASS", input.expectedProjectMatched ? "pass" : "fail", "project fingerprint comparison"),
    check("REMOTE_TOOL_POLICY_PASS", JSON.stringify(remote) === JSON.stringify(canonical) ? "pass" : "fail", "remote tool policy comparison"),
    check("REMOTE_DISPATCH_EXCLUDED", dispatchExcluded ? "pass" : "fail", "dispatch exposure comparison"),
  ];
}

export function makeProtectedInconclusiveEvidence(reason: string, startedAt = new Date().toISOString()): RemotePublicEvidence {
  const finishedAt = new Date().toISOString();
  return evidence([
    check("PUBLIC_DNS_TLS_ROUTE_PASS", "inconclusive", reason),
    check("TOKEN_ROTATION_PASS", "inconclusive", reason),
    check("PROCESS_RESTART_SESSION_INVALIDATION_PASS", "inconclusive", reason),
    check("TUNNEL_DEGRADATION_RECOVERY_PASS", "inconclusive", reason),
    check("GUI_MULTI_PROJECT_EVIDENCE_PASS", "inconclusive", reason),
  ], { startedAt, finishedAt, environment: "protected-cloudflare" });
}
