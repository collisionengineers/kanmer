// Test fixture only. It has no Cloudflare control-plane or DNS behavior.
import { createServer } from "node:http";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("cloudflared version 2026.8.1\n"); process.exit(0);
}
if (args[0] === "tunnel" && args[1] === "--help") {
  process.stdout.write("fake cloudflared tunnel help\n"); process.exit(0);
}
const metricsIndex = args.indexOf("--metrics");
const metrics = metricsIndex >= 0 ? args[metricsIndex + 1] : undefined;
if (!metrics || !/^127\.0\.0\.1:\d+$/.test(metrics) || !args.includes("run")) {
  process.stderr.write("fake-cloudflared: invalid invocation\n"); process.exit(2);
}
const [, portText] = metrics.split(":");
const server = createServer((request, response) => {
  response.writeHead(request.url === "/ready" ? 200 : 404, { "content-type": "text/plain" });
  response.end(request.url === "/ready" ? "ready" : "not found");
});
server.listen(Number(portText), "127.0.0.1", () => process.stdout.write("fake-cloudflared ready\n"));
const stop = () => server.close(() => process.exit(0));
process.once("SIGTERM", stop); process.once("SIGINT", stop);
