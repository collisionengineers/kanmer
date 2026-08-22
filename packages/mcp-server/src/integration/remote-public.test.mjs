import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

const { createRemotePublicFixture } = await import("../../dist/integration/remote-public-fixture.js");
const { runRemotePublicClient } = await import("./remote-public-client.mjs");

test("deterministic Worker-shaped client proves the authenticated remote contract", async () => {
  const fixture = await createRemotePublicFixture();
  try {
    const result = await runRemotePublicClient({
      endpoint: fixture.endpoint,
      token: fixture.token,
      expectedProject: fixture.projectFingerprint,
      mutate: true,
    });
    assert.equal(result.initialized, true);
    assert.equal(result.projectMatched, true);
    assert.equal(result.mutation, true);
    assert.equal(result.gateBlocked, true);
    assert.equal(result.wrongProjectBlocked, true);
    assert.equal(result.mutationProof.documentReadback, true);
    assert.equal(result.mutationProof.itemReadback, true);
    assert.equal(result.mutationProof.archived, true);
    assert.ok(result.mutationProof.activityEntries >= 4);
    assert.equal(result.publicDoctor?.status, "pass");
    assert.equal(result.publicDoctor?.exitCode, 0);
    const byId = new Map(result.boundaryChecks.map((item) => [item.id, item]));
    for (const id of ["PUBLIC_AUTH_NEGATIVE_PASS", "EXPECTED_PROJECT_PASS", "REMOTE_TOOL_POLICY_PASS", "REMOTE_DISPATCH_EXCLUDED"]) {
      assert.equal(byId.get(id)?.status, "pass", id);
    }
  } finally {
    await fixture.close();
    await fixture.close();
    await assert.rejects(() => stat(fixture.root), /ENOENT/);
  }
});

test("descriptor runner rejects inline credential material", async () => {
  const { runRemotePublicDescriptor } = await import("./remote-public-client.mjs");
  await assert.rejects(() => runRemotePublicDescriptor(new URL("data:application/json,%7B%22token%22%3A%22not-a-token%22%7D")), /UNSAFE|ENOENT|invalid/i);
});
