import { DOCTOR_MODES, renderDoctor, runDoctor, type DoctorMode } from "./doctor/index.js";
import { loadTokenMaterial, validateTokenFileReference } from "./http-secret.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const args = process.argv.slice(2);
const requested = args.find((arg): arg is DoctorMode => (DOCTOR_MODES as readonly string[]).includes(arg));
const mode = requested ?? "config";
const json = args.includes("--json");
const allowed = new Set(["--json", ...DOCTOR_MODES]);
const invalid = args.some((arg) => arg.startsWith("--") && !allowed.has(arg)) || new Set(args.filter((arg) => !arg.startsWith("--"))).size > (requested ? 1 : 0) || (args.some((arg) => !arg.startsWith("--") && !DOCTOR_MODES.includes(arg as DoctorMode)));
if (invalid) {
  process.stderr.write("doctor: invalid invocation; use config|local|public and --json (no raw token, URL, insecure, or mutation flags)\n");
  process.exitCode = 2;
} else {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  const report = await runDoctor({
    mode,
    signal: controller.signal,
    totalTimeoutMs: 120_000,
    dependencies: {
      resolveProject: async () => {
        const { projectFingerprint } = await import("./index.js");
        return { fingerprint: await projectFingerprint() };
      },
      validateSecretReference: async () => {
        const file = process.env.KANMER_TOKEN_FILE;
        if (!file) return { valid: false, reason: "protected secret reference is not supplied" };
        try { await validateTokenFileReference(file); return { valid: true }; }
        catch { return { valid: false, reason: "protected secret reference is unsafe" }; }
      },
      token: async () => {
        const file = process.env.KANMER_TOKEN_FILE;
        if (!file) throw new Error("protected secret reference is not supplied");
        return (await loadTokenMaterial(file)).token;
      },
      mcp: async ({ endpoint, token, signal }) => {
        const client = new Client({ name: "kanmer-doctor", version: "1" });
        const transport = new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers: { authorization: `Bearer ${token}` }, signal } });
        await client.connect(transport);
        const status = await client.callTool({ name: "get_status", arguments: {} });
        const content = (status as unknown as { readonly content?: unknown }).content;
        const first = Array.isArray(content) ? content[0] as { readonly type?: string; readonly text?: string } : undefined;
        const payload = JSON.parse(first?.type === "text" ? first.text ?? "{}" : "{}") as { project?: { fingerprint?: string } };
        const tools = await client.listTools();
        return { projectFingerprint: payload.project?.fingerprint, tools: tools.tools.map((tool) => tool.name), close: () => client.close() };
      },
      canonicalTools: async () => {
        const { remoteHttpToolNames } = await import("./index.js");
        return remoteHttpToolNames();
      },
    },
    config: {
      projectRoot: process.env.KANMER_ROOT,
      expectedProject: process.env.KANMER_EXPECTED_PROJECT,
      remoteHostname: process.env.KANMER_REMOTE_HOSTNAME,
      secretReference: process.env.KANMER_TOKEN_FILE,
      tunnel: {
        executable: process.env.CLOUDFLARED_PATH,
        tunnelId: process.env.CLOUDFLARED_TUNNEL_ID,
        hostname: process.env.KANMER_REMOTE_HOSTNAME,
        credentialsFile: process.env.CLOUDFLARED_CREDENTIALS_FILE,
        endpoint: process.env.KANMER_LOCAL_ENDPOINT,
      },
    },
  });
  process.removeListener("SIGINT", abort);
  process.removeListener("SIGTERM", abort);
  process.stdout.write(json ? `${JSON.stringify(report)}\n` : `${renderDoctor(report)}\n`);
  process.exitCode = report.exitCode;
}
