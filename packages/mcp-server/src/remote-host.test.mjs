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
    assert.match(target.projectFingerprint, /^[0-9a-f]{64}$/);
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
