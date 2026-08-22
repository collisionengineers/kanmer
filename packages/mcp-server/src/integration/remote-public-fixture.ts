import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BearerAuthorizer, createKanmerHttpHost, generateBearerToken, type KanmerHttpHost } from "../http.js";

export interface RemotePublicFixture {
  readonly root: string;
  readonly token: string;
  readonly endpoint: string;
  readonly projectFingerprint: string;
  readonly host: KanmerHttpHost;
  close(): Promise<void>;
}

/**
 * A public-boundary-shaped fixture. It deliberately keeps the endpoint on
 * loopback: the protected Cloudflare route is an operator-only environment,
 * while this fixture proves the client/HTTP contract without a tunnel.
 */
export async function createRemotePublicFixture(): Promise<RemotePublicFixture> {
  const root = await mkdtemp(path.join(os.tmpdir(), "kanmer-mcp-028-"));
  process.env.KANMER_ROOT = root;
  const generated = generateBearerToken();
  const host = createKanmerHttpHost({ authorizer: new BearerAuthorizer(generated.verifier), shutdownGraceMs: 250 });
  const ready = await host.start();
  let closed = false;
  return {
    root,
    token: generated.token,
    endpoint: ready.endpoint,
    projectFingerprint: ready.projectFingerprint,
    host,
    async close() {
      if (closed) return;
      closed = true;
      await host.close();
      await rm(root, { recursive: true, force: true });
    },
  };
}
