import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadTokenMaterial } from "../../dist/http-secret.js";
import { REMOTE_HTTP_EXCLUDED_TOOLS, remoteHttpToolNames } from "../../dist/index.js";
import { runDoctor } from "../../dist/doctor/index.js";
import { deterministicChecks } from "../../dist/integration/remote-public-evidence.js";

function safeFailure(error) {
  return error instanceof Error && /^(MCP_|REMOTE_|WRONG_PROJECT|fetch failed)/.test(error.message)
    ? error.message.slice(0, 160)
    : "remote client failed";
}

function textResult(value) {
  const content = value && typeof value === "object" ? value.content : undefined;
  const first = Array.isArray(content) ? content[0] : undefined;
  if (!first || first.type !== "text") return undefined;
  try { return JSON.parse(first.text); } catch { return undefined; }
}

function hasToolError(value) {
  return Boolean(value && typeof value === "object" && value.isError === true);
}

async function callTool(client, request) {
  try { return { value: await client.callTool(request), failed: false }; }
  catch { return { value: undefined, failed: true }; }
}

async function runFixtureDoctor({ endpoint, localEndpoint = endpoint, token, expectedProject, tools }) {
  const publicHostname = "fixture.invalid";
  const publicEndpoint = `https://${publicHostname}/mcp`;
  const fixtureCheck = () => ({ status: "pass", details: { reason: "deterministic fixture provider seam" } });
  const route = (requested) => requested === publicEndpoint ? endpoint : requested;
  const checks = Object.fromEntries([
    "TUNNEL_EXECUTABLE_VALID", "TUNNEL_CONFIG_VALID", "TUNNEL_PROCESS_READY",
    "PUBLIC_DNS_RESOLVES", "PUBLIC_TLS_VALID", "PUBLIC_ROUTE_NO_REDIRECT",
  ].map((id) => [id, fixtureCheck]));
  return runDoctor({
    mode: "public",
    totalTimeoutMs: 30_000,
    dependencies: {
      checks,
      resolveProject: async () => ({ fingerprint: expectedProject }),
      validateRemoteConfig: async () => ({ valid: true }),
      validateSecretReference: async () => ({ valid: true }),
      token: async () => token,
      expectedTools: async () => tools,
      canonicalTools: async () => tools,
      tunnelStatus: async () => ({ state: "connected", provider: "fixture", publicEndpoint, projectFingerprint: expectedProject, attempt: 1, changedAt: new Date().toISOString() }),
      localStatus: async () => ({ state: "ready", endpoint: localEndpoint, authRequired: true, projectFingerprint: expectedProject, tools }),
      resolveDns: async () => ["127.0.0.1"],
      tls: async () => ({ protocol: "TLSv1.3", issuer: "deterministic fixture", sanMatch: true, valid: true }),
      probe: async ({ endpoint: requested, authorization }) => {
        const response = await fetch(route(requested), { method: "POST", redirect: "manual", headers: { accept: "application/json, text/event-stream", ...(authorization ? { authorization } : {}) }, body: "{}" });
        await response.body?.cancel();
        return { status: response.status, challenge: response.headers.get("www-authenticate") ?? undefined, location: response.headers.get("location") ?? undefined, contentType: response.headers.get("content-type") ?? undefined };
      },
      mcp: async ({ endpoint: requested, token: credential }) => {
        const diagnostic = new Client({ name: "kanmer-mcp-028-doctor", version: "1" });
        await diagnostic.connect(new StreamableHTTPClientTransport(new URL(route(requested)), { requestInit: { headers: { authorization: `Bearer ${credential}` } } }));
        const status = textResult(await diagnostic.callTool({ name: "get_status", arguments: {} }));
        const listed = (await diagnostic.listTools()).tools.map((tool) => tool.name);
        return { projectFingerprint: status?.project?.fingerprint, tools: listed, close: () => diagnostic.close() };
      },
    },
    config: {
      projectRoot: "deterministic-fixture",
      expectedProject,
      remoteHostname: publicHostname,
      secretReference: "protected-token-reference",
      localEndpoint,
      expectedTools: tools,
      tunnel: { executable: "fixture-cloudflared", tunnelId: "fixture-tunnel", hostname: publicHostname, credentialsFile: "protected-credential-reference", endpoint },
    },
  });
}

export async function runRemotePublicClient({ endpoint, localEndpoint = endpoint, token, expectedProject, mutate = false }) {
  assert.equal(typeof endpoint, "string");
  assert.equal(typeof token, "string");
  const headers = { authorization: `Bearer ${token}` };
  const missing = await fetch(endpoint, { method: "POST", headers: { accept: "application/json, text/event-stream" }, body: "{}" });
  const wrong = await fetch(endpoint, { method: "POST", headers: { authorization: `Bearer ${"0".repeat(43)}`, accept: "application/json, text/event-stream" }, body: "{}" });
  const client = new Client({ name: "kanmer-mcp-028-worker-client", version: "1" });
  const transport = new StreamableHTTPClientTransport(new URL(endpoint), { requestInit: { headers } });
  let initialized = false;
  let projectMatched = false;
  let mutation = false;
  let gateBlocked = false;
  let wrongProjectBlocked = false;
  let documentReadback = false;
  let itemReadback = false;
  let archived = false;
  let activityEntries = 0;
  let doctorReport;
  let closeError;
  let runError;
  let result;
  try {
    await client.connect(transport);
    initialized = true;
    const tools = (await client.listTools()).tools.map((tool) => tool.name).sort();
    const status = textResult(await client.callTool({ name: "get_status", arguments: {} }));
    projectMatched = status?.project?.fingerprint === expectedProject;
    const wrongProject = await callTool(client, { name: "create_item", arguments: { title: "MCP-028 wrong project probe", expected_project: "kanmer-proj-v1:" + "0".repeat(64) } });
    wrongProjectBlocked = wrongProject.failed || hasToolError(wrongProject.value) || /WRONG_PROJECT|expected project/i.test(JSON.stringify(wrongProject.value));
    if (mutate) {
      const created = await callTool(client, { name: "create_item", arguments: { title: "MCP-028 disposable remote fixture", expected_project: expectedProject, docs_todo: true } });
      const createdItem = textResult(created.value);
      const createdId = createdItem?.id;
      if (createdId) {
        const canary = `mcp028-disposable-${createdId}`;
        const written = await callTool(client, { name: "set_ticket_doc", arguments: { id: createdId, doc: "research", content: `# Disposable remote research\n\nCanary ${canary}`, expected_project: expectedProject } });
        const writtenPayload = textResult(written.value);
        const read = await callTool(client, { name: "get_ticket_doc", arguments: { id: createdId, doc: "research" } });
        const readPayload = textResult(read.value);
        documentReadback = !written.failed && !read.failed && Boolean(writtenPayload?.version) && readPayload?.version === writtenPayload.version && String(readPayload?.content ?? "").includes(canary);
        const updated = await callTool(client, { name: "update_item", arguments: { id: createdId, title: "MCP-028 disposable remote fixture updated", expected_updated: createdItem.updated, expected_project: expectedProject } });
        const updatedItem = textResult(updated.value);
        const readItem = await callTool(client, { name: "get_item", arguments: { id: createdId } });
        const readItemPayload = textResult(readItem.value);
        itemReadback = !updated.failed && !readItem.failed && readItemPayload?.title === "MCP-028 disposable remote fixture updated";
        const gate = await callTool(client, { name: "move_item", arguments: { id: createdId, status: "done", expected_project: expectedProject } });
        gateBlocked = gate.failed || hasToolError(gate.value) || /gate|require|blocked|questions/i.test(JSON.stringify(gate.value));
        const archivedResult = await callTool(client, { name: "update_item", arguments: { id: createdId, archived: true, expected_updated: updatedItem?.updated ?? readItemPayload?.updated, expected_project: expectedProject } });
        const archivedPayload = textResult(archivedResult.value);
        const archivedRead = await callTool(client, { name: "get_item", arguments: { id: createdId } });
        const archivedReadPayload = textResult(archivedRead.value);
        archived = !archivedResult.failed && !archivedRead.failed && (archivedPayload?.archived === true || archivedReadPayload?.archived === true);
        const activity = await callTool(client, { name: "get_activity", arguments: { id: createdId, limit: 50 } });
        const activityPayload = textResult(activity.value);
        activityEntries = Array.isArray(activityPayload) ? activityPayload.length : Array.isArray(activityPayload?.entries) ? activityPayload.entries.length : 0;
        mutation = !created.failed && !hasToolError(created.value) && documentReadback && itemReadback && archived && activityEntries >= 4;
      }
      doctorReport = await runFixtureDoctor({ endpoint, localEndpoint, token, expectedProject, tools });
    }
    result = {
      initialized,
      projectMatched,
      tools,
      mutation,
      mutationProof: { documentReadback, itemReadback, archived, activityEntries },
      gateBlocked,
      wrongProjectBlocked,
      publicDoctor: doctorReport ? { status: doctorReport.status, exitCode: doctorReport.exitCode, counts: doctorReport.counts } : undefined,
      boundaryChecks: deterministicChecks({
        localDoctor: !mutate || doctorReport?.status === "pass",
        authNegative: missing.status === 401 && wrong.status === 401,
        initialized,
        expectedProject: projectMatched,
        toolsMatch: JSON.stringify(tools) === JSON.stringify(remoteHttpToolNames()),
        dispatchExcluded: ![...REMOTE_HTTP_EXCLUDED_TOOLS].some((name) => tools.includes(name)),
        wrongProjectBlocked,
        mutation,
        gateBlocked,
        lifecycle: true,
        cleanup: true,
      }),
    };
    result.outcome = result.boundaryChecks.every((item) => item.status === "pass") ? "pass" : "fail";
  } catch (error) {
    runError = error;
  } finally {
    try { await client.close(); }
    catch { closeError = "remote client session close failed"; }
  }
  if (runError) {
    if (closeError) throw new Error(`${safeFailure(runError)}; ${closeError}`);
    throw runError;
  }
  if (closeError) {
    result = { ...result, cleanupErrors: [closeError], boundaryChecks: deterministicChecks({
      localDoctor: false, authNegative: false, initialized, expectedProject: false, toolsMatch: false, dispatchExcluded: false,
      wrongProjectBlocked: false, mutation: false, gateBlocked: false, lifecycle: false, cleanup: false,
    }) };
    result.outcome = "fail";
  }
  return result;
}

export async function runRemotePublicDescriptor(descriptorPath) {
  const raw = JSON.parse(await readFile(descriptorPath, "utf8"));
  const allowedKeys = new Set(["endpoint", "tokenFile", "expectedProject", "localEndpoint", "mutate"]);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some((key) => !allowedKeys.has(key))) {
    throw new Error("REMOTE_PUBLIC_DESCRIPTOR_UNSAFE");
  }
  if (typeof raw.endpoint !== "string" || typeof raw.tokenFile !== "string" || typeof raw.expectedProject !== "string" || typeof raw.localEndpoint !== "string" || (raw.mutate !== undefined && typeof raw.mutate !== "boolean")) {
    throw new Error("REMOTE_PUBLIC_DESCRIPTOR_INVALID");
  }
  const material = await loadTokenMaterial(raw.tokenFile);
  return runRemotePublicClient({ endpoint: raw.endpoint, localEndpoint: raw.localEndpoint, token: material.token, expectedProject: raw.expectedProject, mutate: raw.mutate === true });
}

if (process.argv[1]?.endsWith("remote-public-client.mjs")) {
  const descriptorFlag = process.argv[2];
  if (descriptorFlag !== "--descriptor" || process.argv.length !== 4) {
    process.stderr.write("remote-public-client: use --descriptor <protected-json-reference>\n");
    process.exitCode = 2;
  } else {
    try {
      const result = await runRemotePublicDescriptor(process.argv[3]);
      process.stdout.write(`${JSON.stringify(result)}\n`);
      process.exitCode = result.outcome === "pass" ? 0 : result.outcome === "fail" ? 1 : 2;
    } catch {
      process.stdout.write(`${JSON.stringify({ outcome: "inconclusive", reason: "protected remote client run unavailable" })}\n`);
      process.exitCode = 2;
    }
  }
}
