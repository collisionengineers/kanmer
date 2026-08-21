import assert from "node:assert/strict";
import test from "node:test";
import { DOCTOR_CHECK_IDS, runDoctor } from "../dist/doctor/index.js";

test("doctor emits a stable schema-v1 ordered report and explicit public skips", async () => {
  const report = await runDoctor({ mode: "config", config: { projectRoot: "fixture", expectedProject: "kanmer-proj-v1:fixture", remoteHostname: "doctor.example.test" } });
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
