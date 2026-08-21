import assert from "node:assert/strict";
import test from "node:test";
import { validateCloudflaredExecutable, validateCloudflaredIngress } from "../../dist/tunnels/cloudflared-validate.js";

test("validator uses direct version and tunnel-help commands only", async () => {
  const calls = [];
  const result = await validateCloudflaredExecutable({ executable: "C:/tools/cloudflared.exe", exec: async (file, args) => {
    calls.push({ file, args });
    return { stdout: args[0] === "--version" ? "cloudflared version 2026.8.1\n" : "tunnel commands", stderr: "" };
  }});
  assert.deepEqual(result, { version: "2026.8.1" });
  assert.deepEqual(calls, [{ file: "C:/tools/cloudflared.exe", args: ["--version"] }, { file: "C:/tools/cloudflared.exe", args: ["tunnel", "--help"] }]);
});

test("validator fails closed for missing version or rejected help", async () => {
  await assert.rejects(() => validateCloudflaredExecutable({ executable: "x", exec: async () => ({ stdout: "unknown", stderr: "" }) }), /VERSION_UNSUPPORTED/);
  await assert.rejects(() => validateCloudflaredExecutable({ executable: "x", exec: async (_file, args) => {
    if (args[0] === "--version") return { stdout: "cloudflared version 2026.8.1", stderr: "" }; throw new Error("no");
  }}), /HELP_FAILED/);
});

test("ingress validator checks exact host and never uses account-mutating commands", async () => {
  const calls = [];
  await validateCloudflaredIngress({
    executable: "C:/tools/cloudflared.exe",
    configPath: "C:/private/kanmer/config.yml",
    hostname: "kanmer.example.test",
    exec: async (file, args) => { calls.push({ file, args }); return { stdout: "", stderr: "" }; },
  });
  assert.deepEqual(calls, [
    { file: "C:/tools/cloudflared.exe", args: ["tunnel", "--config", "C:/private/kanmer/config.yml", "ingress", "validate"] },
    { file: "C:/tools/cloudflared.exe", args: ["tunnel", "--config", "C:/private/kanmer/config.yml", "ingress", "rule", "https://kanmer.example.test/mcp"] },
  ]);
  await assert.rejects(() => validateCloudflaredIngress({ executable: "C:/tools/cloudflared.exe", configPath: "C:/private/config\n.yml", hostname: "kanmer.example.test", exec: async () => ({ stdout: "", stderr: "" }) }), /TUNNEL_INGRESS_CONFIG_INVALID/);
});
