import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path, { isAbsolute } from "node:path";
import { cloudflaredConfig, type CloudflaredTunnelOptions, validateCloudflaredTunnel } from "./cloudflared-config.js";
import type { TunnelAdapter, TunnelLogEvent, TunnelProcess, TunnelTarget } from "./types.js";
import { allocateLoopbackPort, waitForTunnelReadiness } from "./readiness.js";

export interface CloudflaredAdapterOptions extends CloudflaredTunnelOptions {
  readonly executable: string;
  readonly metricsPort?: number;
  readonly waitForReady?: (endpoint: string) => Promise<void>;
  readonly onLog?: (event: TunnelLogEvent) => void;
}

/** Test-only spawn seam; normal construction always uses Node's direct spawn. */
export type CloudflaredSpawner = typeof spawn;

async function validateRegularFile(value: string, errorCode: string, privateFile: boolean): Promise<void> {
  if (!value || value.includes("\0") || !isAbsolute(value)) throw new Error(errorCode);
  let metadata;
  try { metadata = await stat(value); } catch { throw new Error(errorCode); }
  if (!metadata.isFile()) throw new Error(errorCode);
  // Windows ACLs are not represented by POSIX mode bits.  On POSIX, fail
  // closed when a bearer-adjacent credentials file is group/world accessible.
  if (privateFile && process.platform !== "win32" && (metadata.mode & 0o077) !== 0) throw new Error(errorCode);
}

function logLine(onLog: CloudflaredAdapterOptions["onLog"], line: string): void {
  // Provider diagnostics are untrusted: they can contain configuration or
  // access material.  Preserve only the fact that output occurred.
  if (line.trim()) onLog?.({ provider: "cloudflared", level: "info", message: "provider output received" });
}

export class CloudflaredAdapter implements TunnelAdapter {
  constructor(private readonly options: CloudflaredAdapterOptions, private readonly spawnProcess: CloudflaredSpawner = spawn) {}

  async start(target: TunnelTarget): Promise<TunnelProcess> {
    validateCloudflaredTunnel(this.options, target);
    await validateRegularFile(this.options.executable, "TUNNEL_EXECUTABLE_INVALID", false);
    await validateRegularFile(this.options.credentialsFile, "TUNNEL_CREDENTIALS_FILE_UNSAFE", true);
    const metricsPort = this.options.metricsPort ?? await allocateLoopbackPort();
    if (!Number.isSafeInteger(metricsPort) || metricsPort < 1 || metricsPort > 65_535) throw new Error("TUNNEL_METRICS_PORT_INVALID");
    const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-"));
    const configPath = path.join(directory, "config.yml");
    let child: ChildProcess | undefined;
    try {
      await writeFile(configPath, cloudflaredConfig(this.options, target), { encoding: "utf8", mode: 0o600 });
      await chmod(configPath, 0o600);
      const spawned = this.spawnProcess(this.options.executable, ["tunnel", "--no-autoupdate", "--metrics", `127.0.0.1:${metricsPort}`, "--config", configPath, "run", this.options.tunnelId], {
        cwd: directory,
        env: { PATH: process.env.PATH ?? "" },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child = spawned;
      if (!spawned.stdout || !spawned.stderr) throw new Error("TUNNEL_STDIO_UNAVAILABLE");
      spawned.stdout.setEncoding("utf8"); spawned.stderr.setEncoding("utf8");
      spawned.stdout.on("data", (line: string) => logLine(this.options.onLog, line));
      spawned.stderr.on("data", (line: string) => logLine(this.options.onLog, line));
      await new Promise<void>((resolve, reject) => {
        spawned.once("spawn", resolve);
        spawned.once("error", reject);
      });
      const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => spawned.once("exit", (code, signal) => resolve({ code, signal })));
      await (this.options.waitForReady?.(`http://127.0.0.1:${metricsPort}/ready`) ?? waitForTunnelReadiness({ endpoint: `http://127.0.0.1:${metricsPort}/ready` }));
      const cleanup = () => rm(directory, { recursive: true, force: true });
      void exited.then(cleanup, cleanup);
      return {
        pid: spawned.pid,
        exited,
        async stop() { if (!spawned.killed) spawned.kill("SIGTERM"); await exited; },
      };
    } catch (error) {
      if (child && !child.killed) child.kill("SIGTERM");
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }
}

export function createCloudflaredAdapter(options: CloudflaredAdapterOptions, spawnProcess?: CloudflaredSpawner): CloudflaredAdapter {
  return new CloudflaredAdapter(options, spawnProcess);
}
