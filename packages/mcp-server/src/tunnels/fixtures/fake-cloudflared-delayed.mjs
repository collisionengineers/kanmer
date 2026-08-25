// Test fixture only: validates like cloudflared, then deliberately never
// exposes /ready so remote-cli shutdown can be exercised during startup.
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--version") {
  process.stdout.write("cloudflared version 2026.8.1\n");
  process.exit(0);
}
if (args[0] === "tunnel" && args[1] === "--help") {
  process.stdout.write("fake cloudflared tunnel help\n");
  process.exit(0);
}
if (args[0] === "tunnel" && args[1] === "ingress") process.exit(0);
const metricsIndex = args.indexOf("--metrics");
if (metricsIndex < 0 || !/^127\.0\.0\.1:\d+$/.test(args[metricsIndex + 1] ?? "") || !args.includes("run")) process.exit(2);
const stop = () => process.exit(0);
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
await delay(120_000);
