import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_READINESS_TIMEOUT_MS, allocateLoopbackPort, reserveLoopbackPort, reserveSpecificLoopbackPort, waitForTunnelReadiness } from "../../dist/tunnels/readiness.js";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";

test("generic readiness remains bounded for recurring health checks", () => {
  assert.equal(DEFAULT_READINESS_TIMEOUT_MS, 10_000);
});

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

test("explicit port lease owns the selected loopback port until release", async () => {
  const seed = await reserveLoopbackPort();
  const port = seed.port;
  await seed.release();
  const lease = await reserveSpecificLoopbackPort(port);
  const contender = createServer();
  try {
    await assert.rejects(() => new Promise((resolve, reject) => {
      contender.once("error", reject);
      contender.listen(port, "127.0.0.1", resolve);
    }), /EADDRINUSE/);
    await lease.release();
    await lease.release();
    await new Promise((resolve, reject) => { contender.once("error", reject); contender.listen(port, "127.0.0.1", resolve); });
  } finally { if (contender.listening) await new Promise((resolve) => contender.close(resolve)); }
});

test("explicit port lease rejects invalid or occupied ports", async () => {
  await assert.rejects(() => reserveSpecificLoopbackPort(0), /TUNNEL_METRICS_PORT_INVALID/);
  const lease = await reserveLoopbackPort();
  try { await assert.rejects(() => reserveSpecificLoopbackPort(lease.port), /TUNNEL_METRICS_PORT_IN_USE/); }
  finally { await lease.release(); }
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

test("readiness accepts a delayed local success without coupling its request deadline to polling", async () => {
  let attempts = 0;
  const server = createHttpServer((request, response) => {
    attempts++;
    const status = attempts === 1 ? 503 : 200;
    setTimeout(() => {
      response.writeHead(status, { "content-type": "text/plain" });
      response.end(status === 200 ? "ready" : "not ready");
    }, status === 200 ? 150 : 0);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await waitForTunnelReadiness({
      endpoint: `http://127.0.0.1:${address.port}/ready`,
      // A wall-clock budget, not a claim about latency: it has to cover a real
      // loopback server, one deliberate 503, and the deliberate 150 ms delay
      // before the 200. Under a concurrent verification rail on Windows those
      // three regularly overran 1 s and the case failed with the very error it
      // is meant to prove does *not* happen, TUNNEL_READINESS_TIMEOUT
      // (CORE-128). The assertions below — two attempts, and a request
      // deadline that is not coupled to the poll interval — are unchanged.
      timeoutMs: 30_000,
      pollMs: 10,
    });
    assert.equal(attempts, 2);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("readiness rejects non-local endpoints and times out on malformed success", async () => {
  for (const endpoint of ["https://127.0.0.1:1/ready", "http://0.0.0.0:1/ready", "http://127.0.0.1:1/status", "http://127.0.0.1:1/ready?a=b"]) {
    await assert.rejects(() => waitForTunnelReadiness({ endpoint }), /TUNNEL_READINESS_ENDPOINT_INVALID/);
  }
  await assert.rejects(() => waitForTunnelReadiness({ endpoint: "http://127.0.0.1:1/ready", timeoutMs: 5, pollMs: 1, fetchImpl: async () => new Response("x".repeat(4_097), { status: 200 }) }), /TUNNEL_READINESS_TIMEOUT/);
});
