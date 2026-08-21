import assert from "node:assert/strict";
import test from "node:test";
import { createKanmerRemoteHost } from "../dist/remote-host.js";

test("remote host starts bearer-protected HTTP before giving one loopback target to its tunnel", async () => {
  let target;
  let stop;
  const exited = new Promise((resolve) => { stop = () => resolve({ code: 0, signal: null }); });
  const remote = createKanmerRemoteHost({
    authorizer: { authorize: async () => ({ principal: "test" }) },
    hostname: "kanmer.example.test",
    tunnel: { start: async (received) => { target = received; return { exited, stop: async () => stop() }; } },
  });
  try {
    assert.deepEqual(await remote.start(), { endpoint: "https://kanmer.example.test/mcp" });
    assert.match(target.endpoint, /^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    assert.equal(target.hostname, "kanmer.example.test");
    assert.match(target.projectFingerprint, /^[0-9a-f]{16}$/);
    assert.deepEqual(remote.getStatus(), { local: "ready", provider: "running", publicVerification: "unknown", endpoint: "https://kanmer.example.test/mcp" });
  } finally { await remote.close(); }
});

test("provider startup failure leaves the local authenticated HTTP host available and marks provider failed", async () => {
  const remote = createKanmerRemoteHost({
    authorizer: { authorize: async () => ({ principal: "test" }) }, hostname: "kanmer.example.test",
    tunnel: { start: async () => { throw new Error("provider unavailable"); } },
  });
  try {
    await assert.rejects(() => remote.start(), /provider unavailable/);
    assert.deepEqual(remote.getStatus(), { local: "ready", provider: "failed", publicVerification: "unknown" });
  } finally { await remote.close(); }
});

test("provider readiness loss becomes degraded and a later local-ready poll recovers without restarting", async () => {
  let healthy = true;
  let poll;
  let stop;
  const exited = new Promise((resolve) => { stop = () => resolve({ code: 0, signal: null }); });
  const remote = createKanmerRemoteHost({
    authorizer: { authorize: async () => ({ principal: "test" }) }, hostname: "kanmer.example.test", healthPollMs: 5,
    scheduleHealthPoll: (next) => { poll = next; return () => { poll = undefined; }; },
    tunnel: { start: async () => ({
      exited,
      checkReadiness: async () => { if (!healthy) throw new Error("not ready"); },
      stop: async () => stop(),
    }) },
  });
  try {
    await remote.start();
    healthy = false;
    await poll();
    assert.equal(remote.getStatus().provider, "degraded");
    healthy = true;
    await poll();
    assert.equal(remote.getStatus().provider, "running");
  } finally { await remote.close(); }
});

test("remote shutdown closes the authenticated listener before stopping its tunnel child", async () => {
  let target;
  let stopped = false;
  let resolveExit;
  const exited = new Promise((resolve) => { resolveExit = resolve; });
  const remote = createKanmerRemoteHost({
    authorizer: { authorize: async () => ({ principal: "test" }) }, hostname: "kanmer.example.test",
    tunnel: { start: async (received) => {
      target = received;
      return {
        exited,
        stop: async () => {
          await assert.rejects(() => fetch(target.endpoint), /fetch failed/);
          stopped = true;
          resolveExit({ code: 0, signal: null });
        },
      };
    } },
  });
  await remote.start();
  await remote.close();
  assert.equal(stopped, true);
});
