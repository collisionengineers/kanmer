import { BearerAuthorizer } from "./http-auth.js";
import { loadTokenFile } from "./http-secret.js";
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
  const verifier = await loadTokenFile(required("KANMER_HTTP_TOKEN_FILE"));
  const remote = createKanmerRemoteHost({
    authorizer: new BearerAuthorizer(verifier),
    hostname: required("KANMER_TUNNEL_HOSTNAME"),
    tunnel: createCloudflaredAdapter({
      executable: required("KANMER_CLOUDFLARED_EXECUTABLE"),
      metricsPort: Number.parseInt(required("KANMER_CLOUDFLARED_METRICS_PORT"), 10),
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
