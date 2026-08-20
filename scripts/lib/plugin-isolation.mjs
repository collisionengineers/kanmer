import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

const DEFAULT_TIMEOUT_MS = 20_000;
const protocolVersion = "2025-11-25";

function fail(message) {
  throw new Error(`plugin isolation: ${message}`);
}

function inside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function requiredEnv(source = process.env) {
  // Keep only the variables Node/the OS may genuinely need. In particular this
  // cannot inherit a workspace loader, NODE_PATH, or an npm cwd hint.
  const names = ["PATH", "SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "PATHEXT", "WINDIR", "TEMP", "TMP", "TMPDIR", "HOME", "USERPROFILE", "LANG", "LC_ALL"];
  const env = { CI: "1", NO_COLOR: "1" };
  for (const name of names) {
    if (source[name] !== undefined) env[name] = source[name];
  }
  return env;
}

export function readPluginMcpEntry(pluginRoot) {
  const manifestPath = join(pluginRoot, ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) fail(`missing manifest ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (typeof manifest.mcpServers !== "string") fail(`${manifestPath} has no mcpServers path`);
  const configPath = resolve(pluginRoot, manifest.mcpServers);
  if (!inside(pluginRoot, configPath) || !existsSync(configPath)) {
    fail(`manifest MCP config escapes or is missing: ${manifest.mcpServers}`);
  }
  const server = JSON.parse(readFileSync(configPath, "utf8"))?.mcpServers?.kanmer;
  if (!server || !Array.isArray(server.args) || typeof server.args[0] !== "string") {
    fail(`missing mcpServers.kanmer entry in ${configPath}`);
  }
  const token = "${CLAUDE_PLUGIN_ROOT}/";
  if (!server.args[0].startsWith(token)) fail(`MCP entry is not plugin-relative: ${server.args[0]}`);
  const entry = resolve(pluginRoot, server.args[0].slice(token.length));
  if (!inside(pluginRoot, entry) || !existsSync(entry)) fail(`MCP entry escapes or is missing: ${entry}`);
  if (typeof server.command !== "string") fail(`MCP command is missing in ${configPath}`);
  return { manifestPath, configPath, command: server.command, entry, args: server.args.slice(1), env: server.env ?? {} };
}

function runnerFromManifest(command) {
  // The supported install contract is Node itself, either directly or through
  // the documented KANMER_NODE fallback. Use this process's absolute Node
  // executable so the test cannot accidentally pass through PATH/global state.
  if (command === "node" || command === "${KANMER_NODE:-node}") return process.execPath;
  fail(`unsupported manifest command for isolated check: ${command}`);
}

function waitForExit(proc) {
  return new Promise((resolveExit) => {
    proc.once("exit", (code, signal) => {
      resolveExit({ code, signal });
    });
  });
}

async function talkToMcp(runner, entry, args, cwd, env, timeoutMs) {
  // The install manifest intentionally omits --root so end users get board
  // discovery. The check supplies only --init, creating a disposable board in
  // the unrelated cwd rather than ever pointing the copied server at a real one.
  const proc = spawn(runner, [entry, ...args, "--init"], { cwd, env, shell: false, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let lineBuffer = "";
  const pending = new Map();
  proc.stdout.setEncoding("utf8");
  proc.stderr.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    stdout += chunk;
    lineBuffer += chunk;
    let newline;
    while ((newline = lineBuffer.indexOf("\n")) !== -1) {
      const line = lineBuffer.slice(0, newline).trim();
      lineBuffer = lineBuffer.slice(newline + 1);
      if (!line) continue;
      try {
        const frame = JSON.parse(line);
        const pendingRequest = pending.get(frame.id);
        if (pendingRequest) {
          pending.delete(frame.id);
          pendingRequest.resolve(frame);
        }
      } catch {
        // The protocol server must not log to stdout; the timeout diagnostic
        // below includes the raw stream if it did.
      }
    }
  });
  proc.stderr.on("data", (chunk) => { stderr += chunk; });
  const exited = waitForExit(proc);
  let id = 0;
  const request = (method, params) => new Promise((resolveRequest, rejectRequest) => {
    const requestId = ++id;
    const timer = setTimeout(() => {
      pending.delete(requestId);
      rejectRequest(new Error(`timed out waiting for ${method}`));
    }, timeoutMs);
    pending.set(requestId, {
      resolve: (frame) => { clearTimeout(timer); resolveRequest(frame); },
    });
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params })}\n`);
  });
  try {
    const initialized = await request("initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "kanmer-plugin-check", version: "0" },
    });
    if (initialized.error || initialized.result?.serverInfo?.name !== "kanmer") {
      fail(`initialize failed (${JSON.stringify(initialized.error ?? initialized.result)})`);
    }
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
    const tools = await request("tools/list", {});
    if (tools.error || !Array.isArray(tools.result?.tools) || tools.result.tools.length === 0) {
      fail(`tools/list failed (${JSON.stringify(tools.error ?? tools.result)})`);
    }
    return { toolCount: tools.result.tools.length };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    fail(`${detail}; entry=${entry}; cwd=${cwd}; stdout=${stdout.slice(-1000)}; stderr=${stderr.slice(-1000)}`);
  } finally {
    proc.stdin.end();
    if (!proc.killed) proc.kill();
    await exited;
  }
}

/**
 * Exercise the exact Claude-installable plugin payload from a hostile-looking
 * location: outside the repo, with a space in its parent and an unrelated cwd.
 */
export async function checkIsolatedPlugin({ sourcePluginRoot, timeoutMs = DEFAULT_TIMEOUT_MS, onTempRoot } = {}) {
  if (!sourcePluginRoot) fail("sourcePluginRoot is required");
  const source = resolve(sourcePluginRoot);
  if (!existsSync(source)) fail(`source plugin root is missing: ${source}`);
  const tempRoot = mkdtempSync(join(tmpdir(), "kanmer plugin isolation "));
  const copiedPluginRoot = join(tempRoot, "payload", basename(source));
  const childCwd = join(tempRoot, "unrelated-cwd");
  try {
    onTempRoot?.(tempRoot);
    mkdirSync(dirname(copiedPluginRoot), { recursive: true });
    cpSync(source, copiedPluginRoot, { recursive: true, dereference: true, filter: (path) => !["node_modules", ".git", ".kanmer"].includes(basename(path)) });
    mkdirSync(childCwd);
    const copiedRoot = resolve(copiedPluginRoot);
    if (inside(source, copiedRoot)) fail("copied payload remained inside source repository");
    const { command, entry, args, env: manifestEnv } = readPluginMcpEntry(copiedRoot);
    const result = await talkToMcp(runnerFromManifest(command), entry, args, childCwd, { ...requiredEnv(), ...manifestEnv }, timeoutMs);
    return { ...result, copiedRoot, childCwd, entry };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export { requiredEnv };
