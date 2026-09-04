// The golden-board harness: transport, disposable-board guard, child
// environment, tool `call()`, whole-board digest oracle, scenario recorder and
// Windows-safe teardown (CORE-119, FRD-035, ADR-0021).
//
// Why this file exists at all, and why it copies rather than imports:
// `smoke.mjs` is 4132 lines with zero exports and runs its whole suite as
// top-level side effects ending in `process.exit`, so importing it executes the
// suite. `smoke-protocol.mjs` has the transport but no exports either. The four
// idioms this module needs — `startServer` (smoke-protocol.mjs:50-119),
// `textOf`/`check` (smoke.mjs:22/60), the `KANMER_NODE`/`ELECTRON_RUN_AS_NODE`
// switch (smoke.mjs:39-42) and `directoryDigest` (reconciliation.test.mjs:122)
// — are therefore copied here. Refactoring an authoritative rail file during a
// release window is a large diff with no acceptance value.
//
// The one thing this module adds that no existing smoke has is a mechanical
// enforcement of ADR-0021's "candidate test harnesses must use explicit
// disposable/copied board locations": `assertDisposable` refuses every root
// that is not a fresh `kanmer-golden-` directory under the temp volume, and
// `childEnv` deletes `KANMER_ROOT` from the child environment so an ambient
// value (which on a developer machine points at the LIVE board) can never
// become the board a golden scenario writes to.
//
// `.mjs` under `src/` is invisible to `tsc` and to the esbuild standalone
// bundle, exactly as `smoke.mjs` already is, so nothing here reaches a shipped
// artifact.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { removeTreeWithRetry, removeTreeWithRetrySync } from "../../core/dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Every disposable board root carries this marker in its path. */
export const GOLDEN_PREFIX = "kanmer-golden-";

/** Per-request ceiling, copied from smoke-protocol.mjs:36. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** The server binary under test; `KANMER_SERVER` is the smoke convention. */
export function serverEntry() {
  return process.env.KANMER_SERVER ?? path.join(here, "..", "dist", "index.js");
}

function casefold(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

/** Both spellings of the temp volume: Windows hands out 8.3 aliases. */
function temporaryRoots() {
  const raw = path.resolve(os.tmpdir());
  const roots = new Set([raw]);
  try {
    roots.add(path.resolve(fs.realpathSync(raw)));
  } catch {
    // An unresolvable tmpdir leaves the literal form as the only anchor.
  }
  return [...roots];
}

/**
 * ADR-0021, enforced rather than assumed. A root is disposable only when it
 * lives *under* the temp volume (with a real separator boundary, so a sibling
 * such as `<tmp>-evil` cannot pass on a substring) and carries the
 * `kanmer-golden-` marker somewhere in its path.
 *
 * Throwing is the whole point: a scenario that resolved the repository root,
 * the board worktree or the live board must die before it opens a handle.
 */
export function assertDisposable(root) {
  if (typeof root !== "string" || root.trim() === "") {
    throw new Error("assertDisposable: a board root is required");
  }
  const resolved = path.resolve(root);
  const folded = casefold(resolved);
  const under = temporaryRoots().some((base) => {
    const prefix = casefold(base.endsWith(path.sep) ? base : base + path.sep);
    return folded.startsWith(prefix);
  });
  if (!under) {
    throw new Error(
      `assertDisposable: "${resolved}" is not under the temporary volume (${temporaryRoots().join(", ")}); ` +
        "golden boards are disposable mkdtemp roots only (ADR-0021).",
    );
  }
  if (!folded.includes(casefold(GOLDEN_PREFIX))) {
    throw new Error(
      `assertDisposable: "${resolved}" does not carry the ${GOLDEN_PREFIX} marker; ` +
        "golden boards are created by disposableBoard() only (ADR-0021).",
    );
  }
  return resolved;
}

/**
 * A fresh disposable directory plus its teardown. `close()` uses
 * `removeTreeWithRetry` and never a bare `fs.rm`: this harness spawns child
 * processes whose cwd is inside the tree, which is the exact `EBUSY`/`ENOTEMPTY`
 * shape AGENTS.md §8 gotcha 20(a) documents.
 */
export function disposableBoard(kind = "board") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${GOLDEN_PREFIX}${kind}-`));
  assertDisposable(root);
  return {
    root,
    kind,
    async close() {
      await removeTreeWithRetry(root);
    },
    closeSync() {
      removeTreeWithRetrySync(root);
    },
  };
}

/**
 * The environment every golden child process gets.
 *
 * `KANMER_ROOT` is deleted, not overwritten: `smoke-discovery.mjs:26` does the
 * same for the same reason, and here it is a safety requirement rather than a
 * convenience — an inherited `KANMER_ROOT` on a developer machine points at the
 * live board, and a server that resolved it would violate ADR-0021 on the first
 * write. `KANMER_ENDPOINT_REGISTRY` is spawn-time configuration (AGENTS.md §8
 * gotcha 16); no request may supply it.
 */
export function childEnv({ registry } = {}) {
  const env = { ...process.env };
  delete env.KANMER_ROOT;
  delete env.KANMER_INIT;
  delete env.KANMER_REPO_ROOT;
  if (registry) env.KANMER_ENDPOINT_REGISTRY = registry;
  else delete env.KANMER_ENDPOINT_REGISTRY;
  if (process.env.KANMER_NODE) env.ELECTRON_RUN_AS_NODE = "1";
  return env;
}

/** The runner that executes the server entry (Electron-as-Node when asked). */
export function serverRunner() {
  return process.env.KANMER_NODE ?? process.execPath;
}

/**
 * Spawn the server on a disposable board and speak newline-delimited JSON-RPC
 * to it. Copied from `smoke-protocol.mjs:50-119`; stdout *is* the transport and
 * is parsed strictly, while stderr is buffered and surfaced only on failure
 * because the server writes its ready banner there.
 */
export function startServer({ root, repoRoot, env, cwd } = {}) {
  assertDisposable(root);
  const argv = [serverEntry(), "--root", root];
  if (repoRoot) argv.push("--repo-root", repoRoot);
  const proc = spawn(serverRunner(), argv, {
    env: env ?? childEnv(),
    cwd: cwd ?? os.tmpdir(),
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
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
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, ...(params ? { params } : {}) })}\n`);
  };

  return {
    root,
    send,
    notify,
    parseErrors,
    stderr: () => stderrBuf,
    stop: () => {
      try {
        proc.stdin.end();
      } catch {
        // The child may already be gone; teardown is best-effort.
      }
      proc.kill();
    },
  };
}

/** Complete the MCP handshake. */
export async function initialize(server, clientName = "kanmer-golden") {
  const response = await server.send("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: clientName, version: "0.0.0" },
  });
  server.notify("notifications/initialized");
  return response;
}

/** The text payload of a tools/call result (smoke.mjs:22). */
export function textOf(result) {
  return (result?.content ?? []).map((chunk) => chunk.text).join("\n");
}

/**
 * One tool call, classified the way MCP-055 makes stable: a SUCCESS payload is
 * read from `content[0].text` (never `structuredContent`, whose successful
 * shape MCP-055 changes), and a REFUSAL's code from
 * `structuredContent.error.code` — the closed eight-value `KanmerErrorCode`
 * union in `errors.ts:1-13`. Message-only refusals (`WORKSPACE_OCCUPIED:`,
 * `REVIEW_RETURN_NEEDS_ATTESTATION:`, `REMEDIATION_BUDGET_EXHAUSTED:`, the
 * `BATCH_*` and `RECOVERY_REFUSED:` families) carry no code and must be matched
 * on `message`; see `errors.ts:27-38`.
 *
 * A refusal is a normal result here and never throws.
 */
export async function call(server, tool, args = {}) {
  const started = Date.now();
  const response = await server.send("tools/call", { name: tool, arguments: args });
  const ms = Date.now() - started;
  if (response.error) {
    return {
      ok: false,
      tool,
      transport: true,
      code: null,
      message: String(response.error.message ?? "transport error"),
      text: "",
      payload: null,
      ms,
    };
  }
  const result = response.result ?? {};
  const text = textOf(result);
  if (result.isError) {
    return {
      ok: false,
      tool,
      transport: false,
      code: result.structuredContent?.error?.code ?? null,
      message: text,
      text,
      payload: null,
      structured: result.structuredContent ?? null,
      ms,
    };
  }
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = null;
  }
  return { ok: true, tool, transport: false, code: null, message: "", text, payload, ms };
}

/**
 * A recursive, sorted sha256 over a whole tree — the "did anything change"
 * oracle (`reconciliation.test.mjs:122`). Dry-run inertness is proved with this
 * rather than a spot check so an unexpected `activity.jsonl` append cannot pass.
 */
export async function digest(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      hash.update(relative);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) hash.update(await fsp.readFile(absolute));
    }
  }
  await visit(root);
  return hash.digest("hex");
}

/** Per-file sha256 map, for "these exact bytes did not move" assertions. */
export async function fileDigests(root) {
  const out = new Map();
  async function visit(directory) {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        out.set(relative, createHash("sha256").update(await fsp.readFile(absolute)).digest("hex"));
      }
    }
  }
  await visit(root);
  return out;
}

/**
 * The FRD-035 measurement fields. The FRD says the evaluation *records* them;
 * this is that record — counters in one run's transcript, not a metrics
 * platform (MASTERPLAN's "workflow metrics" non-goal stands).
 */
export function newCounters() {
  return {
    verifiedOutcomes: 0,
    corrections: 0,
    unnecessaryDocuments: 0,
    planDeviations: 0,
    reviewCycles: 0,
    stuckStages: 0,
    recoveredLeases: 0,
    wrongProjectAttempts: 0,
    duplicateWork: 0,
    toolCalls: 0,
    elapsedMs: 0,
  };
}

/**
 * One scenario's evidence: every check with its terminal state, every tool call
 * with its code and duration, and the measurement counters it moved.
 *
 * `check` records `pass`; `simulated` and `unavailable` record a *non-live*
 * terminal state. There is deliberately no `skip`: FRD-035 edge case 1 forbids
 * a fabricated provider pass, and a silent skip is exactly that.
 */
export function Recorder(scenarioId) {
  const checks = [];
  const calls = [];
  const counters = newCounters();
  return {
    scenarioId,
    checks,
    calls,
    counters,
    check(name, cond, detail = "") {
      checks.push({ name, state: cond ? "pass" : "fail", pass: !!cond, detail: String(detail).slice(0, 400) });
      if (cond) counters.verifiedOutcomes += 1;
      return !!cond;
    },
    /** A capability with no offline source, driven from printed injected evidence. */
    simulated(name, cond, injected, detail = "") {
      checks.push({
        name,
        state: cond ? "simulated" : "fail",
        pass: !!cond,
        mode: "simulated",
        injected: typeof injected === "string" ? injected : JSON.stringify(injected),
        detail: String(detail).slice(0, 400),
      });
      if (cond) counters.verifiedOutcomes += 1;
      return !!cond;
    },
    /** A capability this build cannot express at all. Never a pass. */
    unavailable(name, detail = "") {
      checks.push({ name, state: "unavailable", pass: false, detail: String(detail).slice(0, 400) });
      return false;
    },
    record(result) {
      calls.push({ tool: result.tool, ok: result.ok, code: result.code, ms: result.ms });
      counters.toolCalls += 1;
      return result;
    },
    bump(field, by = 1) {
      counters[field] = (counters[field] ?? 0) + by;
    },
  };
}

/** `call` + record in one step, so no scenario can make an unrecorded call. */
export async function tool(server, recorder, name, args = {}) {
  return recorder.record(await call(server, name, args));
}

export { removeTreeWithRetry, removeTreeWithRetrySync };
