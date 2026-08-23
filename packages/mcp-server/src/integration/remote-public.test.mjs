import assert from "node:assert/strict";
import { stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const { createRemotePublicFixture } = await import("../../dist/integration/remote-public-fixture.js");
const { runRemotePublicClient, runRemotePublicDescriptor } = await import("./remote-public-client.mjs");

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
    assert.equal(result.outcome, "pass");
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
    const tokenFile = join(fixture.root, "protected-token.txt");
    const descriptor = join(fixture.root, "descriptor.json");
    await writeFile(tokenFile, `${fixture.token}\n`, { encoding: "ascii", mode: 0o600 });
    await writeFile(descriptor, JSON.stringify({
      endpoint: fixture.endpoint,
      localEndpoint: fixture.endpoint,
      tokenFile,
      expectedProject: fixture.projectFingerprint,
      mutate: true,
    }), { encoding: "utf8", mode: 0o600 });
    const descriptorResult = await runRemotePublicDescriptor(descriptor);
    assert.equal(descriptorResult.outcome, "pass");
    assert.equal(descriptorResult.publicDoctor?.status, "pass");
    assert.equal(descriptorResult.boundaryChecks.find((check) => check.id === "LOCAL_DOCTOR_PASS")?.status, "pass");
  } finally {
    await fixture.close();
    await fixture.close();
    await assert.rejects(() => stat(fixture.root), /ENOENT/);
  }
});

test("descriptor runner rejects inline credential material", async () => {
  await assert.rejects(() => runRemotePublicDescriptor(new URL("data:application/json,%7B%22token%22%3A%22not-a-token%22%7D")), /UNSAFE|ENOENT|invalid/i);
});
