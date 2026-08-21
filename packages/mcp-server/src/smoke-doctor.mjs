import assert from "node:assert/strict";
import { runDoctor } from "../dist/doctor/index.js";

const pass = async () => ({ status: "pass", details: { observed: "fixture" } });
const ids = [
  "PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID",
  "LOCAL_STATUS_READY", "LOCAL_BIND_LOOPBACK", "AUTH_MISSING_REJECTED", "AUTH_WRONG_REJECTED", "AUTH_VALID_ACCEPTED",
  "MCP_INITIALIZE_LOCAL", "PROJECT_FINGERPRINT_LOCAL", "REMOTE_TOOL_POLICY_LOCAL", "SESSION_CLOSE_LOCAL", "TUNNEL_PROCESS_READY",
  "PUBLIC_DNS_RESOLVES", "PUBLIC_TLS_VALID", "PUBLIC_ROUTE_NO_REDIRECT", "AUTH_MISSING_PUBLIC_REJECTED", "MCP_INITIALIZE_PUBLIC",
  "PROJECT_FINGERPRINT_PUBLIC", "REMOTE_TOOL_POLICY_PUBLIC", "SESSION_CLOSE_PUBLIC", "LOCAL_PUBLIC_CONSISTENT", "DIAGNOSTIC_REDACTION", "NO_BOARD_MUTATION",
];
const checks = Object.fromEntries(ids.map((id) => [id, pass]));
const report = await runDoctor({ mode: "public", config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "example.test", secretReference: "protected-ref", tunnel: { tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403", hostname: "example.test", credentialsFile: "C:/protected/credentials.json", endpoint: "http://127.0.0.1:43123/mcp", executable: "C:/protected/cloudflared.exe" } }, dependencies: { checks } });
assert.equal(report.schemaVersion, 1);
assert.equal(report.checks.length, 26);
assert.equal(report.status, "pass");
assert.equal(report.exitCode, 0);
assert.equal(JSON.stringify(report).includes("Bearer"), false);
assert.deepEqual(report.checks.map((check) => check.id), ids);
process.stdout.write("doctor smoke passed (schema-v1, 26 checks, no secret canary)\n");
