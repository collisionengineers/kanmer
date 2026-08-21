import assert from "node:assert/strict";
import test from "node:test";
import { cloudflaredConfig, validateCloudflaredTunnel } from "../../dist/tunnels/cloudflared-config.js";

const options = {
  tunnelId: "3f9620b4-423e-4f37-a30e-61ffcf91f403",
  credentialsFile: "C:/protected/cloudflared.json",
  hostname: "kanmer.example.test",
};
const target = { hostname: "kanmer.example.test", endpoint: "http://127.0.0.1:43123/mcp" };

test("cloudflared config permits one exact HTTPS hostname and loopback MCP origin", () => {
  assert.deepEqual(validateCloudflaredTunnel(options, target), { hostname: "kanmer.example.test", endpoint: "http://127.0.0.1:43123/mcp" });
  assert.equal(cloudflaredConfig(options, target), [
    `tunnel: ${options.tunnelId}`,
    `credentials-file: ${JSON.stringify(options.credentialsFile)}`,
    "ingress:",
    "  - hostname: kanmer.example.test",
    "    service: http://127.0.0.1:43123/mcp",
    "  - service: http_status:404",
    "",
  ].join("\n"));
});

test("cloudflared config fails closed for broad public routes and non-loopback origins", () => {
  for (const hostname of ["*.example.test", "https://kanmer.example.test", "user@kanmer.example.test", "kanmer.example.test/path", "localhost"]) {
    assert.throws(() => validateCloudflaredTunnel({ ...options, hostname }, { ...target, hostname }), /TUNNEL_HOSTNAME_INVALID/);
  }
  for (const endpoint of ["http://0.0.0.0:43123/mcp", "https://127.0.0.1:43123/mcp", "http://127.0.0.1:43123/other", "http://127.0.0.1/mcp?x=1"]) {
    assert.throws(() => validateCloudflaredTunnel(options, { ...target, endpoint }), /TUNNEL_ORIGIN_INVALID/);
  }
  assert.throws(() => validateCloudflaredTunnel(options, { ...target, hostname: "other.example.test" }), /TUNNEL_HOSTNAME_MISMATCH/);
});
