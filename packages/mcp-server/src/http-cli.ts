import { createKanmerHttpHost } from "./http.js";
import { BearerAuthorizer } from "./http-auth.js";
import { loadTokenFile } from "./http-secret.js";

const tokenFile = process.env.KANMER_HTTP_TOKEN_FILE;
if (!tokenFile) {
  process.stderr.write("kanmer-mcp-http fatal: REMOTE_AUTH_MISSING (set protected KANMER_HTTP_TOKEN_FILE)\n");
  process.exit(1);
}
try {
  const verifier = await loadTokenFile(tokenFile);
  const host = createKanmerHttpHost({ authorizer: new BearerAuthorizer(verifier) });
  const ready = await host.start();
  process.stdout.write(`${JSON.stringify({ ...ready, tokenId: verifier.tokenId, fingerprint: verifier.fingerprint })}\n`);
  const stop = () => void host.close().finally(() => process.exit(0));
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
} catch (error) {
  process.stderr.write(`kanmer-mcp-http fatal: ${error instanceof Error ? error.message : "REMOTE_AUTH_INVALID_CONFIG"}\n`);
  process.exit(1);
}
