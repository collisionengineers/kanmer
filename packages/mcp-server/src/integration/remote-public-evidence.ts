import { check, evidence, type RemotePublicCheck, type RemotePublicEvidence } from "./remote-public-types.js";

export function serialiseRemotePublicEvidence(value: RemotePublicEvidence): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function deterministicChecks(input: {
  readonly localDoctor: boolean;
  readonly authNegative: boolean;
  readonly initialized: boolean;
  readonly expectedProject: boolean;
  readonly toolsMatch: boolean;
  readonly dispatchExcluded: boolean;
  readonly wrongProjectBlocked: boolean;
  readonly mutation: boolean;
  readonly gateBlocked: boolean;
  readonly lifecycle: boolean;
  readonly cleanup: boolean;
}): readonly RemotePublicCheck[] {
  return [
    check("LOCAL_DOCTOR_PASS", input.localDoctor ? "pass" : "fail", input.localDoctor ? "local fixture is ready" : "local fixture did not become ready"),
    check("PUBLIC_AUTH_NEGATIVE_PASS", input.authNegative ? "pass" : "fail", input.authNegative ? "missing and wrong bearer probes were rejected" : "authentication negative probe failed"),
    check("PUBLIC_MCP_INITIALIZE_PASS", input.initialized ? "pass" : "fail", input.initialized ? "official SDK initialized" : "official SDK initialization failed"),
    check("EXPECTED_PROJECT_PASS", input.expectedProject ? "pass" : "fail", input.expectedProject ? "project fingerprint matched" : "project fingerprint mismatched"),
    check("REMOTE_TOOL_POLICY_PASS", input.toolsMatch ? "pass" : "fail", input.toolsMatch ? "remote tools matched the canonical policy" : "remote tools differed from canonical policy"),
    check("REMOTE_DISPATCH_EXCLUDED", input.dispatchExcluded ? "pass" : "fail", input.dispatchExcluded ? "dispatch is absent from remote discovery" : "dispatch was present in remote discovery"),
    check("WRONG_EXPECTED_PROJECT_BLOCKED", input.wrongProjectBlocked ? "pass" : "fail", input.wrongProjectBlocked ? "wrong expected project was rejected" : "wrong expected project was accepted"),
    check("CONTROLLED_REMOTE_MUTATION_PASS", input.mutation ? "pass" : "fail", input.mutation ? "bounded remote fixture mutation succeeded" : "bounded remote fixture mutation failed"),
    check("REMOTE_GATE_BLOCK_PASS", input.gateBlocked ? "pass" : "fail", input.gateBlocked ? "remote gate refusal was observed" : "remote gate refusal was not observed"),
    check("PUBLIC_SESSION_LIFECYCLE_PASS", input.lifecycle ? "pass" : "fail", input.lifecycle ? "session closed and cleanup remained bounded" : "session lifecycle failed"),
    check("CLEANUP_PASS", input.cleanup ? "pass" : "fail", input.cleanup ? "fixture cleanup completed" : "fixture cleanup reported an error"),
  ];
}

export function inconclusiveProtectedChecks(reason: string): readonly RemotePublicCheck[] {
  return [
    check("EXACT_COMMIT_VERIFIED", "inconclusive", reason),
    check("ROOT_VERIFY_PASS", "inconclusive", reason),
    check("STDIO_REGRESSION_PASS", "inconclusive", reason),
    check("PUBLIC_DNS_TLS_ROUTE_PASS", "inconclusive", reason),
    check("TOKEN_ROTATION_PASS", "inconclusive", reason),
    check("PROCESS_RESTART_SESSION_INVALIDATION_PASS", "inconclusive", reason),
    check("TUNNEL_DEGRADATION_RECOVERY_PASS", "inconclusive", reason),
    check("GUI_MULTI_PROJECT_EVIDENCE_PASS", "inconclusive", reason),
    check("PUBLIC_DOCTOR_FINAL_PASS", "inconclusive", reason),
    check("SECRET_SCAN_PASS", "inconclusive", reason),
  ];
}

export { check, evidence };
