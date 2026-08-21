import assert from "node:assert/strict";
import test from "node:test";
import { TunnelSupervisor } from "../../dist/tunnels/supervisor.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("supervisor restarts only a bounded number of unexpected exits and stops its current child", async () => {
  const exits = [];
  const states = [];
  const supervisor = new TunnelSupervisor({
    maxRestarts: 1,
    restartPolicy: { baseDelayMs: 0, maxDelayMs: 0 },
    random: () => 0.5,
    onState: (state) => states.push(state),
    start: async () => {
      const exit = deferred(); exits.push(exit);
      return { exited: exit.promise, stop: async () => exit.resolve({ code: 0, signal: null }) };
    },
  });
  await supervisor.start();
  exits[0].resolve({ code: 1, signal: null });
  await new Promise(setImmediate);
  assert.equal(exits.length, 2);
  exits[1].resolve({ code: 1, signal: null });
  await new Promise(setImmediate);
  assert.deepEqual(states, ["starting", "running", "restarting", "running", "failed"]);
  await supervisor.stop();
  assert.equal(states.at(-1), "stopped");
});

test("default policy is bounded and jitter stays within the documented range", async () => {
  const exits = [];
  const delays = [];
  const supervisor = new TunnelSupervisor({
    maxRestarts: 1,
    restartPolicy: { baseDelayMs: 100, maxDelayMs: 100 },
    random: () => 0,
    wait: async (delay) => { delays.push(delay); },
    start: async () => {
      const exit = deferred(); exits.push(exit);
      return { exited: exit.promise, stop: async () => exit.resolve({ code: 0, signal: null }) };
    },
  });
  await supervisor.start(); exits[0].resolve({ code: 1, signal: null });
  await new Promise(setImmediate);
  assert.deepEqual(delays, [80]);
  await supervisor.stop();
});

test("stop cancels a scheduled production retry before another child starts", async () => {
  const exits = [];
  const supervisor = new TunnelSupervisor({
    maxRestarts: 1,
    restartPolicy: { baseDelayMs: 10_000, maxDelayMs: 10_000 },
    start: async () => {
      const exit = deferred(); exits.push(exit);
      return { exited: exit.promise, stop: async () => exit.resolve({ code: 0, signal: null }) };
    },
  });
  await supervisor.start();
  exits[0].resolve({ code: 1, signal: null });
  await new Promise(setImmediate);
  await supervisor.stop();
  await new Promise(setImmediate);
  assert.equal(exits.length, 1);
});

test("terminal exit classification fails without scheduling an unsafe retry", async () => {
  const exits = [];
  const states = [];
  const supervisor = new TunnelSupervisor({
    classifyExit: () => "terminal",
    onState: (state) => states.push(state),
    start: async () => {
      const exit = deferred(); exits.push(exit);
      return { exited: exit.promise, stop: async () => exit.resolve({ code: 0, signal: null }) };
    },
  });
  await supervisor.start();
  exits[0].resolve({ code: 78, signal: null });
  await new Promise(setImmediate);
  assert.deepEqual(states, ["starting", "running", "failed"]);
  assert.equal(exits.length, 1);
});
