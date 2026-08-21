import { createKanmerHttpHost } from "./http.js";
import { BearerAuthorizer } from "./http-auth.js";
import { loadTokenFile } from "./http-secret.js";
import { safeDiagnosticMessage } from "./http-diagnostics.js";

const tokenFile = process.env.KANMER_HTTP_TOKEN_FILE;
const args = process.argv.slice(2);
const rawTokenEnv = ["KANMER_HTTP_TOKEN", "KANMER_HTTP_TOKEN_VALUE", "KANMER_HTTP_RAW_TOKEN"];
if (args.length > 0 || rawTokenEnv.some((name) => process.env[name] !== undefined)) {
  process.stderr.write("kanmer-mcp-http fatal: REMOTE_AUTH_RAW_TOKEN_FORBIDDEN (use protected KANMER_HTTP_TOKEN_FILE)\n");
  process.exit(1);
}
if (!tokenFile) {
  process.stderr.write("kanmer-mcp-http fatal: REMOTE_AUTH_MISSING (set protected KANMER_HTTP_TOKEN_FILE)\n");
  process.exit(1);
}
try {
  const verifier = await loadTokenFile(tokenFile);
  const host = createKanmerHttpHost({
    authorizer: new BearerAuthorizer(verifier),
    onEvent: (event) => process.stderr.write(`${JSON.stringify(event)}\n`),
  });
  const ready = await host.start();
  process.stdout.write(`${JSON.stringify({ ...ready, tokenId: verifier.tokenId, fingerprint: verifier.fingerprint })}\n`);
  const stop = () => void host.close().finally(() => process.exit(0));
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
} catch (error) {
  process.stderr.write(`kanmer-mcp-http fatal: ${safeDiagnosticMessage(error)}\n`);
  process.exit(1);
}
