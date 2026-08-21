import assert from "node:assert/strict";
import test from "node:test";
import { dispatchPolicyView, parseDispatchPolicy } from "./dispatch-policy.ts";

const enabled = {
  KANMER_DISPATCH_ENABLED: "true",
  KANMER_DISPATCH_PROVIDERS: "claude,codex",
  KANMER_DISPATCH_TASKS: "research-quick,files",
  KANMER_DISPATCH_MAX_ACTIVE: "2",
  KANMER_DISPATCH_TIMEOUT_MS: "1000",
  KANMER_DISPATCH_MAX_TIMEOUT_MS: "5000",
  KANMER_DISPATCH_APPROVAL: "preapproved",
};

test("dispatch policy is disabled by default", () => {
  const policy = parseDispatchPolicy({});
  assert.equal(policy.enabled, false);
  assert.match(policy.reason, /disabled/);
});

test("valid policy keeps fixed provider/task allowlists and sanitized view", () => {
  const policy = parseDispatchPolicy(enabled);
  assert.deepEqual(policy.providers, ["claude", "codex"]);
  assert.deepEqual(policy.tasks, ["research-quick", "files"]);
  assert.equal(policy.maxActive, 2);
  assert.equal(dispatchPolicyView(policy).reason, undefined);
});

test("invalid opt-in fails closed for malformed providers, tasks, bounds and approval", () => {
  for (const patch of [
    { KANMER_DISPATCH_PROVIDERS: "powershell" },
    { KANMER_DISPATCH_TASKS: "shell" },
    { KANMER_DISPATCH_MAX_ACTIVE: "0" },
    { KANMER_DISPATCH_TIMEOUT_MS: "nope" },
    { KANMER_DISPATCH_APPROVAL: "maybe" },
  ]) {
    const policy = parseDispatchPolicy({ ...enabled, ...patch });
    assert.equal(policy.enabled, false);
    assert.ok(policy.reason);
  }
});
