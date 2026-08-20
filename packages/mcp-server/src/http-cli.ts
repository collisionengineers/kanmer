import { createKanmerHttpHost } from "./http.js";

const host = createKanmerHttpHost({
  // MCP-026 replaces this internal bridge with bearer-secret resolution. The
  // process is intentionally unusable unless an embedding parent injects it.
  authorizer: { authorize: async () => { throw new Error("no production authorizer configured"); } },
  port: Number(process.env.KANMER_HTTP_PORT ?? 0),
});

host.start().then((ready) => {
  process.stdout.write(`${JSON.stringify(ready)}\n`);
  const stop = () => void host.close().then(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}).catch((error) => {
  process.stderr.write(`kanmer-mcp-http fatal: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
