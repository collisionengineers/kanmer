import type { DoctorCheckId, DoctorMode, DoctorRepair } from "./types.js";

export interface DoctorCheckDefinition {
  readonly id: DoctorCheckId;
  readonly modes: readonly DoctorMode[];
  readonly prerequisites: readonly DoctorCheckId[];
  readonly severity: "required" | "warning" | "info";
  readonly repair: DoctorRepair;
}

const repair = (code: string, ...actions: string[]): DoctorRepair => ({ code, actions });
const all: readonly DoctorMode[] = ["config", "local", "public"];
const local: readonly DoctorMode[] = ["local", "public"];
const publicOnly: readonly DoctorMode[] = ["public"];

export const DOCTOR_CHECKS: readonly DoctorCheckDefinition[] = [
  { id: "PROJECT_CONFIG_VALID", modes: all, prerequisites: [], severity: "required", repair: repair("PROJECT_CONFIG", "Select one existing Kanmer board and confirm its project fingerprint.") },
  { id: "REMOTE_CONFIG_VALID", modes: all, prerequisites: ["PROJECT_CONFIG_VALID"], severity: "required", repair: repair("REMOTE_CONFIG", "Check the remote profile and exact configured hostname.") },
  { id: "SECRET_REFERENCE_VALID", modes: all, prerequisites: ["PROJECT_CONFIG_VALID"], severity: "required", repair: repair("SECRET_REFERENCE", "Use a protected bearer-token reference; never pass a raw token on the command line.") },
  { id: "TUNNEL_EXECUTABLE_VALID", modes: all, prerequisites: ["REMOTE_CONFIG_VALID"], severity: "required", repair: repair("TUNNEL_EXECUTABLE", "Install or select a supported cloudflared executable.") },
  { id: "TUNNEL_CONFIG_VALID", modes: all, prerequisites: ["REMOTE_CONFIG_VALID", "TUNNEL_EXECUTABLE_VALID"], severity: "required", repair: repair("TUNNEL_CONFIG", "Correct the named-tunnel id, credential reference, hostname, or loopback origin.") },
  { id: "LOCAL_STATUS_READY", modes: local, prerequisites: ["PROJECT_CONFIG_VALID"], severity: "required", repair: repair("LOCAL_STATUS", "Start the local authenticated HTTP host for the selected project.") },
  { id: "LOCAL_BIND_LOOPBACK", modes: local, prerequisites: ["LOCAL_STATUS_READY"], severity: "required", repair: repair("LOCAL_BIND", "Bind the local MCP host only to loopback.") },
  { id: "AUTH_MISSING_REJECTED", modes: local, prerequisites: ["LOCAL_BIND_LOOPBACK"], severity: "required", repair: repair("AUTH_MISSING", "Keep bearer authentication enabled on the local endpoint.") },
  { id: "AUTH_WRONG_REJECTED", modes: local, prerequisites: ["AUTH_MISSING_REJECTED"], severity: "required", repair: repair("AUTH_WRONG", "Verify the local authorizer rejects invalid bearer material.") },
  { id: "AUTH_VALID_ACCEPTED", modes: local, prerequisites: ["AUTH_WRONG_REJECTED"], severity: "required", repair: repair("AUTH_VALID", "Check the protected token reference and local authorizer.") },
  { id: "MCP_INITIALIZE_LOCAL", modes: local, prerequisites: ["AUTH_VALID_ACCEPTED"], severity: "required", repair: repair("MCP_LOCAL", "Confirm the local Streamable HTTP endpoint speaks MCP.") },
  { id: "PROJECT_FINGERPRINT_LOCAL", modes: local, prerequisites: ["MCP_INITIALIZE_LOCAL"], severity: "required", repair: repair("PROJECT_LOCAL", "Reconnect to the selected board; do not infer identity from hostname.") },
  { id: "REMOTE_TOOL_POLICY_LOCAL", modes: local, prerequisites: ["MCP_INITIALIZE_LOCAL"], severity: "required", repair: repair("TOOLS_LOCAL", "Use the canonical read-only remote HTTP tool exposure.") },
  { id: "SESSION_CLOSE_LOCAL", modes: local, prerequisites: ["MCP_INITIALIZE_LOCAL"], severity: "required", repair: repair("SESSION_LOCAL", "Close the diagnostic MCP session and inspect local session cleanup.") },
  { id: "TUNNEL_PROCESS_READY", modes: local, prerequisites: ["TUNNEL_CONFIG_VALID"], severity: "required", repair: repair("TUNNEL_READY", "Inspect provider status/readiness; do not infer readiness from a PID alone.") },
  { id: "PUBLIC_DNS_RESOLVES", modes: publicOnly, prerequisites: ["TUNNEL_PROCESS_READY"], severity: "required", repair: repair("PUBLIC_DNS", "Check configured hostname DNS without changing records.") },
  { id: "PUBLIC_TLS_VALID", modes: publicOnly, prerequisites: ["PUBLIC_DNS_RESOLVES"], severity: "required", repair: repair("PUBLIC_TLS", "Fix the public certificate/hostname chain using standard platform verification.") },
  { id: "PUBLIC_ROUTE_NO_REDIRECT", modes: publicOnly, prerequisites: ["PUBLIC_TLS_VALID"], severity: "required", repair: repair("PUBLIC_ROUTE", "Ensure the configured HTTPS route reaches MCP without a redirect or login page.") },
  { id: "AUTH_MISSING_PUBLIC_REJECTED", modes: publicOnly, prerequisites: ["PUBLIC_ROUTE_NO_REDIRECT"], severity: "required", repair: repair("AUTH_PUBLIC_MISSING", "Keep public bearer enforcement enabled.") },
  { id: "MCP_INITIALIZE_PUBLIC", modes: publicOnly, prerequisites: ["AUTH_MISSING_PUBLIC_REJECTED"], severity: "required", repair: repair("MCP_PUBLIC", "Confirm the public route forwards to the expected MCP host.") },
  { id: "PROJECT_FINGERPRINT_PUBLIC", modes: publicOnly, prerequisites: ["MCP_INITIALIZE_PUBLIC"], severity: "required", repair: repair("PROJECT_PUBLIC", "Confirm the public route reaches the selected board.") },
  { id: "REMOTE_TOOL_POLICY_PUBLIC", modes: publicOnly, prerequisites: ["MCP_INITIALIZE_PUBLIC"], severity: "required", repair: repair("TOOLS_PUBLIC", "Compare public tools with the canonical remote exposure.") },
  { id: "SESSION_CLOSE_PUBLIC", modes: publicOnly, prerequisites: ["MCP_INITIALIZE_PUBLIC"], severity: "required", repair: repair("SESSION_PUBLIC", "Close the public diagnostic session cleanly.") },
  { id: "LOCAL_PUBLIC_CONSISTENT", modes: publicOnly, prerequisites: ["PROJECT_FINGERPRINT_LOCAL", "PROJECT_FINGERPRINT_PUBLIC", "REMOTE_TOOL_POLICY_PUBLIC"], severity: "required", repair: repair("CONSISTENCY", "Reconcile local and public project/tool policy before accepting the route.") },
  { id: "DIAGNOSTIC_REDACTION", modes: all, prerequisites: [], severity: "required", repair: repair("REDACTION", "Remove secret, session, credential, and unsafe path material from diagnostics.") },
  { id: "NO_BOARD_MUTATION", modes: all, prerequisites: [], severity: "required", repair: repair("NO_MUTATION", "Use read-only diagnostics and do not call board mutators.") },
];

export function doctorCheck(id: DoctorCheckId): DoctorCheckDefinition {
  const found = DOCTOR_CHECKS.find((check) => check.id === id);
  if (!found) throw new Error(`DOCTOR_CHECK_UNKNOWN:${id}`);
  return found;
}
