import { resolve } from "node:path";
import { createTokenFile } from "./http-secret.js";
import { safeDiagnosticMessage } from "./http-diagnostics.js";

const [destination, ...extra] = process.argv.slice(2);
if (!destination || extra.length > 0) {
  process.stderr.write("usage: kanmer-mcp-token <new-token-file>\n");
  process.exit(1);
}
try {
  const result = await createTokenFile(resolve(destination));
  process.stdout.write(`${JSON.stringify({ kind: "kanmer-remote-token", version: 1, fingerprint: result.fingerprint })}\n`);
} catch (error) {
  process.stderr.write(`kanmer-mcp-token fatal: ${safeDiagnosticMessage(error, "REMOTE_AUTH_SECRET_FILE_UNSAFE")}\n`);
  process.exit(1);
}
