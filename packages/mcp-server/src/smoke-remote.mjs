// Local-only remote-host smoke.  Its fake tunnel never creates a public route.
import assert from "node:assert/strict";
import { BearerAuthorizer, generateBearerToken } from "../dist/http.js";
import { createKanmerRemoteHost } from "../dist/remote-host.js";

let target;
let resolveExit;
const exited = new Promise((resolve) => { resolveExit = resolve; });
const generated = generateBearerToken();
const remote = createKanmerRemoteHost({
  authorizer: new BearerAuthorizer(generated.verifier),
  hostname: "kanmer.example.test",
  tunnel: {
    start: async (received) => {
      target = received;
      return { exited, stop: async () => resolveExit({ code: 0, signal: null }) };
    },
  },
});
try {
  assert.deepEqual(await remote.start(), { endpoint: "https://kanmer.example.test/mcp" });
  const response = await fetch(target.endpoint, { headers: { authorization: `Bearer ${generated.token}` } });
  assert.equal(response.status, 400, "authenticated loopback host must answer before the tunnel becomes connected");
  process.stdout.write("remote smoke passed (fake provider, no public route)\n");
} finally { await remote.close(); }
