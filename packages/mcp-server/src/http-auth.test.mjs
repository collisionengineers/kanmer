import assert from "node:assert/strict";
import test from "node:test";
import { BearerAuthorizer, generateBearerToken, verifierForToken } from "../dist/http.js";

test("bearer verifier uses opaque non-serializable digest metadata", async () => {
  const generated = generateBearerToken((size) => Buffer.alloc(size, 7));
  assert.match(generated.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(generated.verifier).includes(generated.token), false);
  assert.equal(JSON.stringify(generated.verifier).includes(generated.verifier.digest.toString("hex")), false);
  assert.deepEqual(verifierForToken(generated.token), generated.verifier);
  const authorizer = new BearerAuthorizer(generated.verifier);
  assert.equal((await authorizer.authorize({ headers: { authorization: `bEaReR ${generated.token}` } })).principal, generated.verifier.tokenId);
  for (const authorization of [undefined, "Basic x", `Bearer ${generated.token} `, `Bearer ${generated.verifier.digest.toString("hex")}`]) {
    await assert.rejects(() => authorizer.authorize({ headers: { authorization } }), /REMOTE_AUTH_UNAUTHORIZED/);
  }
});

test("rotation validates replacement and revocation fails closed", async () => {
  const first = generateBearerToken();
  const second = generateBearerToken();
  const authorizer = new BearerAuthorizer(first.verifier);
  assert.equal(authorizer.replace(second.verifier), first.verifier.tokenId);
  await assert.rejects(() => authorizer.authorize({ headers: { authorization: `Bearer ${first.token}` } }), /UNAUTHORIZED/);
  assert.equal((await authorizer.authorize({ headers: { authorization: `Bearer ${second.token}` } })).principal, second.verifier.tokenId);
  assert.equal(authorizer.revoke(), second.verifier.tokenId);
  assert.equal(authorizer.revoke(), undefined);
  await assert.rejects(() => authorizer.authorize({ headers: { authorization: `Bearer ${second.token}` } }), /UNAUTHORIZED/);
});
