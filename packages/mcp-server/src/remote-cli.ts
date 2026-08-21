import { BearerAuthorizer } from "./http-auth.js";
import { loadTokenMaterial } from "./http-secret.js";
import { createKanmerRemoteHost } from "./remote-host.js";
import { createCloudflaredAdapter } from "./tunnels/cloudflared.js";

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`REMOTE_CONFIG_MISSING_${name}`);
  return value;
};

try {
  if (process.argv.length !== 2) throw new Error("REMOTE_CLI_ACCEPTS_NO_ARGUMENTS");
  if (required("KANMER_TUNNEL_PROVIDER") !== "cloudflared") throw new Error("REMOTE_TUNNEL_PROVIDER_UNSUPPORTED");
  const material = await loadTokenMaterial(required("KANMER_HTTP_TOKEN_FILE"));
  const verifier = material.verifier;
  const remote = createKanmerRemoteHost({
    authorizer: new BearerAuthorizer(verifier),
    authGeneration: () => verifier.fingerprint,
    verifyLocal: async (ready) => {
      const headers = { authorization: `Bearer ${material.token}`, "content-type": "application/json", accept: "application/json, text/event-stream" };
      const response = await fetch(ready.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "kanmer-remote-local-check", version: "1" } } }),
      });
      const session = response.headers.get("mcp-session-id");
      if (!response.ok || !session) throw new Error("REMOTE_LOCAL_HANDSHAKE_FAILED");
      const close = await fetch(ready.endpoint, { method: "DELETE", headers: { authorization: `Bearer ${material.token}`, "mcp-session-id": session, "mcp-protocol-version": "2025-11-25" } });
      if (!close.ok) throw new Error("REMOTE_LOCAL_HANDSHAKE_CLOSE_FAILED");
    },
    hostname: required("KANMER_TUNNEL_HOSTNAME"),
    onStatus: (status) => {
      process.stdout.write(`${JSON.stringify({ kind: "kanmer-mcp-remote-status", version: 1, status })}\n`);
    },
    tunnel: createCloudflaredAdapter({
      executable: required("KANMER_CLOUDFLARED_EXECUTABLE"),
      tunnelId: required("KANMER_CLOUDFLARED_TUNNEL_ID"),
      credentialsFile: required("KANMER_CLOUDFLARED_CREDENTIALS_FILE"),
      hostname: required("KANMER_TUNNEL_HOSTNAME"),
    }),
  });
  const ready = await remote.start();
  process.stdout.write(`${JSON.stringify({ kind: "kanmer-mcp-remote-ready", version: 1, endpoint: ready.endpoint, authRequired: true, tokenId: verifier.tokenId, fingerprint: verifier.fingerprint })}\n`);
  const stop = () => void remote.close().finally(() => process.exit(0));
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
} catch (error) {
  process.stderr.write(`kanmer-mcp-remote fatal: ${error instanceof Error ? error.message : "REMOTE_CONFIG_INVALID"}\n`);
  process.exit(1);
}
