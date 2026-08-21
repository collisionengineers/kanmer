import assert from "node:assert/strict";
import test from "node:test";
import { DOCTOR_CHECK_IDS, runDoctor } from "../dist/doctor/index.js";

test("doctor emits a stable schema-v1 ordered report and explicit public skips", async () => {
  const report = await runDoctor({ mode: "config", config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test", secretReference: "protected-ref" } });
  assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.checks.map((check) => check.id), DOCTOR_CHECK_IDS);
  assert.equal(report.checks.length, 26);
  assert.equal(report.checks.find((check) => check.id === "LOCAL_STATUS_READY").status, "skipped");
  assert.equal(report.exitCode, 0);
});

test("doctor skips dependent checks after an injected prerequisite failure", async () => {
  const report = await runDoctor({ mode: "local", config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture" }, dependencies: { checks: { REMOTE_CONFIG_VALID: async () => ({ status: "fail", details: { reason: "fixture failure" } }) } } });
  assert.equal(report.checks.find((check) => check.id === "REMOTE_CONFIG_VALID").status, "fail");
  assert.equal(report.checks.find((check) => check.id === "TUNNEL_CONFIG_VALID").status, "skipped");
  assert.equal(report.exitCode, 1);
  assert.equal(JSON.stringify(report).includes("fixture failure"), true);
});

test("doctor cancellation produces explicit skipped checks without throwing", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await runDoctor({ mode: "public", signal: controller.signal });
  assert.equal(result.checks.every((check) => check.status === "skipped"), true);
  assert.equal(result.exitCode, 2);
});

test("public mode completes the healthy matrix without per-check overrides", async () => {
  let closes = 0;
  const tools = ["get_status", "list_items"];
  const report = await runDoctor({
    mode: "public",
    config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test", localEndpoint: "http://127.0.0.1:43123/mcp", secretReference: "protected-ref", expectedTools: tools },
    dependencies: {
      resolveProject: async () => ({ fingerprint: "kanmer-proj-v1:fixture" }),
      validateRemoteConfig: async () => ({ valid: true }),
      validateSecretReference: async () => ({ valid: true }),
      localStatus: async () => ({ state: "ready", endpoint: "http://127.0.0.1:43123/mcp", authRequired: true, projectFingerprint: "kanmer-proj-v1:fixture", tools, protocolVersion: "2025-11-25" }),
      tunnelStatus: async () => ({ state: "connected", provider: "fixture", attempt: 1, changedAt: new Date().toISOString(), publicEndpoint: "https://doctor.example.test/mcp", projectFingerprint: "kanmer-proj-v1:fixture" }),
      resolveDns: async () => ["192.0.2.10"],
      tls: async () => ({ valid: true, sanMatch: true, protocol: "TLSv1.3", issuer: "fixture" }),
      probe: async () => ({ status: 401, challenge: "Bearer realm=kanmer" }),
      token: async () => "protected-token",
      mcp: async () => ({ projectFingerprint: "kanmer-proj-v1:fixture", tools, close: async () => { closes++; } }),
      canonicalTools: async () => tools,
    },
  });
  assert.equal(report.status, "warn");
  assert.equal(report.exitCode, 0);
  assert.equal(report.checks.every((check) => check.status !== "fail"), true);
  assert.equal(report.checks.find((check) => check.id === "LOCAL_PUBLIC_CONSISTENT").status, "pass");
  assert.ok(closes >= 1);
});

test("doctor report is allowlisted and redacts canaries from injected details", async () => {
  const report = await runDoctor({ mode: "config", config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test", secretReference: "protected-ref" }, dependencies: { checks: { DIAGNOSTIC_REDACTION: async () => ({ status: "fail", token: "CANARY_SECRET_abcdefghijklmnopqrstuvwxyz", details: { reason: "provider credential CANARY_SECRET_abcdefghijklmnopqrstuvwxyz" } }) } } });
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("CANARY_SECRET"), false);
  assert.equal(serialized.includes('"token"'), false);
});

test("late MCP factories close their client after a per-check timeout", async () => {
  let closes = 0;
  const pass = async () => ({ status: "pass" });
  const checks = Object.fromEntries(["PROJECT_CONFIG_VALID", "REMOTE_CONFIG_VALID", "SECRET_REFERENCE_VALID", "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID", "LOCAL_STATUS_READY", "LOCAL_BIND_LOOPBACK", "AUTH_MISSING_REJECTED", "AUTH_WRONG_REJECTED"].map((id) => [id, pass]));
  const report = await runDoctor({ mode: "local", timeoutMs: 5, config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test", secretReference: "protected-ref" }, dependencies: { checks, token: async () => "protected-token", mcp: async () => { await new Promise((resolve) => setTimeout(resolve, 30)); return { tools: [], close: async () => { closes++; } }; } } });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(report.exitCode, 2);
  assert.equal(closes, 1);
});

test("doctor uses the injected clock for its total deadline", async () => {
  let clock = 1_000;
  const report = await runDoctor({
    mode: "config",
    now: () => clock,
    totalTimeoutMs: 120_000,
    config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test", secretReference: "protected-ref" },
    dependencies: { checks: Object.fromEntries(DOCTOR_CHECK_IDS.map((id) => [id, async () => ({ status: "pass" })])) },
  });
  assert.equal(report.exitCode, 0);
  assert.equal(report.status, "pass");
  assert.equal(report.checks.some((check) => check.details?.reason === "doctor total deadline exceeded"), false);
});
