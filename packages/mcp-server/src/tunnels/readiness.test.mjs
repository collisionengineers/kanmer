import assert from "node:assert/strict";
import test from "node:test";
import { allocateLoopbackPort, reserveLoopbackPort, waitForTunnelReadiness } from "../../dist/tunnels/readiness.js";
import { createServer } from "node:net";

test("allocator returns an unprivileged loopback port", async () => {
  const port = await allocateLoopbackPort();
  assert.ok(Number.isInteger(port) && port > 1024 && port <= 65_535);
});

test("port lease owns the reservation until an idempotent release", async () => {
  const lease = await reserveLoopbackPort();
  const contender = createServer();
  try {
    await assert.rejects(() => new Promise((resolve, reject) => {
      contender.once("error", reject);
      contender.listen(lease.port, "127.0.0.1", resolve);
    }), /EADDRINUSE/);
    await lease.release();
    await lease.release();
    await new Promise((resolve, reject) => { contender.once("error", reject); contender.listen(lease.port, "127.0.0.1", resolve); });
  } finally { if (contender.listening) await new Promise((resolve) => contender.close(resolve)); }
});

test("allocator rejects unbounded retry policies", async () => {
  await assert.rejects(() => reserveLoopbackPort(0), /TUNNEL_METRICS_PORT_POLICY_INVALID/);
  await assert.rejects(() => reserveLoopbackPort(6), /TUNNEL_METRICS_PORT_POLICY_INVALID/);
});

test("readiness accepts only a bounded successful loopback /ready response", async () => {
  let attempts = 0;
  await waitForTunnelReadiness({
    endpoint: "http://127.0.0.1:43123/ready",
    timeoutMs: 100,
    pollMs: 1,
    fetchImpl: async () => {
      attempts++;
      return new Response(attempts === 2 ? "ok" : "not ready", { status: attempts === 2 ? 200 : 503 });
    },
  });
  assert.equal(attempts, 2);
});

test("readiness rejects non-local endpoints and times out on malformed success", async () => {
  for (const endpoint of ["https://127.0.0.1:1/ready", "http://0.0.0.0:1/ready", "http://127.0.0.1:1/status", "http://127.0.0.1:1/ready?a=b"]) {
    await assert.rejects(() => waitForTunnelReadiness({ endpoint }), /TUNNEL_READINESS_ENDPOINT_INVALID/);
  }
  await assert.rejects(() => waitForTunnelReadiness({ endpoint: "http://127.0.0.1:1/ready", timeoutMs: 5, pollMs: 1, fetchImpl: async () => new Response("x".repeat(4_097), { status: 200 }) }), /TUNNEL_READINESS_TIMEOUT/);
});
