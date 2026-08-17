// Protocol back-compat smoke test: speaks raw JSON-RPC over stdio, with no
// SDK client at all.
//
// Why raw: the SDK's Client hardcodes LATEST_PROTOCOL_VERSION in its
// initialize (client/index.js), so it cannot pin an older revision — which is
// exactly what a back-compat check has to do. It also lets us send a
// per-request `_meta` that no shipping client emits.
//
// Two things are proven here:
//   1. Every protocol revision the SDK supports still initializes, lists the
//      full tool surface, and attributes the activity actor from clientInfo.
//   2. The forward path: a per-request `_meta` client identity overrides
//      clientInfo. That branch in actorName() is not dead — it is merely
//      un-sent-to by today's hosts.
//
// Same conventions as smoke.mjs: KANMER_SERVER / KANMER_NODE overrides, a
// check() accumulator, PASS/FAIL lines, exit 1 on any failure.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry =
  process.env.KANMER_SERVER ?? path.join(__dirname, "..", "dist", "index.js");
const runner = process.env.KANMER_NODE ?? process.execPath;
const runnerEnv = process.env.KANMER_NODE
  ? { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
  : process.env;

// Mirrors SUPPORTED_PROTOCOL_VERSIONS in the SDK's types.js. The server may
// echo the requested version or downgrade; either is a valid negotiation.
const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
const PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const REQUEST_TIMEOUT_MS = 20_000;

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

/**
 * Spawn the server and talk newline-delimited JSON-RPC to it.
 * stdout is parsed strictly (it *is* the transport); stderr is buffered and
 * only surfaced on failure, because the server writes its "ready" banner
 * there and that line is not a frame.
 */
function startServer(sandbox) {
  const proc = spawn(runner, [serverEntry, "--root", sandbox], {
    env: runnerEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const pending = new Map();
  let stdoutBuf = "";
  let stderrBuf = "";
  const parseErrors = [];

  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    stdoutBuf += chunk;
    let nl;
    while ((nl = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, nl).trim();
      stdoutBuf = stdoutBuf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        parseErrors.push(line.slice(0, 200));
        continue;
      }
      const resolve = msg.id !== undefined ? pending.get(msg.id) : undefined;
      if (resolve) {
        pending.delete(msg.id);
        resolve(msg);
      }
    }
  });
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (chunk) => {
    stderrBuf += chunk;
  });

  let nextId = 1;
  const send = (method, params) => {
    const id = nextId++;
    const frame = { jsonrpc: "2.0", id, method, ...(params ? { params } : {}) };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timed out waiting for ${method}`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      proc.stdin.write(`${JSON.stringify(frame)}\n`);
    });
  };
  const notify = (method, params) => {
    proc.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) })}\n`,
    );
  };

  return {
    send,
    notify,
    parseErrors,
    stderr: () => stderrBuf,
    stop: () => {
      proc.stdin.end();
      proc.kill();
    },
  };
}

function freshSandbox() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-proto-"));
}

/** The text payload of a tools/call result. */
function textOf(result) {
  return (result?.content ?? []).map((c) => c.text).join("\n");
}

async function initialize(server, proto, clientName) {
  return server.send("initialize", {
    protocolVersion: proto,
    capabilities: {},
    clientInfo: { name: clientName, version: "0.0.0" },
  });
}

// ---------------------------------------------------------------------------
// 1. Back-compat across every supported protocol revision.
// ---------------------------------------------------------------------------
for (const proto of PROTOCOLS) {
  const sandbox = freshSandbox();
  const server = startServer(sandbox);
  try {
    const init = await initialize(server, proto, "smoke-oldproto");
    check(
      `initialize succeeds on ${proto}`,
      init.error === undefined && SUPPORTED.includes(init.result?.protocolVersion),
      init.error ? JSON.stringify(init.error) : `negotiated ${init.result?.protocolVersion}`,
    );
    check(
      `serverInfo names kanmer on ${proto}`,
      init.result?.serverInfo?.name === "kanmer",
      init.result?.serverInfo?.name,
    );
    server.notify("notifications/initialized");

    const tools = await server.send("tools/list", {});
    check(
      `tools/list returns 30 tools on ${proto}`,
      tools.result?.tools?.length === 30,
      `got ${tools.result?.tools?.length}`,
    );

    const created = await server.send("tools/call", {
      name: "create_item",
      arguments: { title: "proto probe" },
    });
    const createdOk = created.error === undefined && created.result?.isError !== true;
    check(`create_item works on ${proto}`, createdOk, createdOk ? "" : textOf(created.result));

    const activity = await server.send("tools/call", {
      name: "get_activity",
      arguments: {},
    });
    const entries = JSON.parse(textOf(activity.result));
    check(
      `actor falls back to clientInfo on ${proto}`,
      entries.length > 0 && entries.every((e) => e.actor === "smoke-oldproto"),
      entries.map((e) => e.actor).join(","),
    );

    check(
      `only protocol frames on stdout for ${proto}`,
      server.parseErrors.length === 0,
      server.parseErrors.join(" | "),
    );
  } catch (err) {
    check(`protocol run ${proto}`, false, err instanceof Error ? err.message : String(err));
    process.stderr.write(`--- server stderr (${proto}) ---\n${server.stderr()}\n`);
  } finally {
    server.stop();
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 2. The forward path: a per-request `_meta` client identity beats clientInfo.
//    `io.modelcontextprotocol/client` is the 2026-07-28 spec's identity
//    carrier. No 2025-11-25 host emits it, but the SDK does deliver
//    params._meta to handlers on every protocol — so the branch is live.
// ---------------------------------------------------------------------------
{
  const sandbox = freshSandbox();
  const server = startServer(sandbox);
  try {
    await initialize(server, "2025-11-25", "smoke-oldproto");
    server.notify("notifications/initialized");

    const created = await server.send("tools/call", {
      name: "create_item",
      arguments: { title: "meta probe" },
      _meta: { "io.modelcontextprotocol/client": { name: "future-host" } },
    });
    const metaOk = created.error === undefined && created.result?.isError !== true;
    check("create_item accepts a request carrying _meta", metaOk, metaOk ? "" : textOf(created.result));

    const activity = await server.send("tools/call", {
      name: "get_activity",
      arguments: {},
    });
    const entries = JSON.parse(textOf(activity.result));
    const newest = entries[entries.length - 1];
    check(
      "per-request _meta client identity overrides clientInfo",
      newest?.actor === "future-host",
      `newest actor = ${newest?.actor}`,
    );
  } catch (err) {
    check("_meta probe", false, err instanceof Error ? err.message : String(err));
    process.stderr.write(`--- server stderr (_meta probe) ---\n${server.stderr()}\n`);
  } finally {
    server.stop();
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
