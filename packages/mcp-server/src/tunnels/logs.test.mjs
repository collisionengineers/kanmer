import assert from "node:assert/strict";
import test from "node:test";
import { TunnelLogBuffer } from "../../dist/tunnels/logs.js";

test("provider log diagnostics are bounded, coalesced, and never retain raw output", () => {
  const logs = new TunnelLogBuffer();
  const canary = "Bearer secret-credential-canary?token=never-surface";
  logs.write(`${JSON.stringify({ level: "error", message: canary })}\n`);
  logs.write(`${canary}\n`);
  logs.write(`${canary}\n`);
  logs.write(`${"x".repeat(4_097)}\n`);
  const snapshot = logs.snapshot();
  assert.equal(JSON.stringify(snapshot).includes(canary), false);
  assert.deepEqual(snapshot.map(({ level, code, count }) => ({ level, code, count })), [
    { level: "error", code: "TUNNEL_PROVIDER_LOG_JSON", count: 1 },
    { level: "info", code: "TUNNEL_PROVIDER_LOG_TEXT", count: 2 },
    { level: "warn", code: "TUNNEL_PROVIDER_LOG_OVERSIZE", count: 1 },
  ]);
});

test("partial final output is classified only when the process drains", () => {
  const logs = new TunnelLogBuffer();
  assert.deepEqual(logs.write('{"level":"warn"}'), []);
  assert.deepEqual(logs.flush().map((event) => event.code), ["TUNNEL_PROVIDER_LOG_JSON"]);
});
