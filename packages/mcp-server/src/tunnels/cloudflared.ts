import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path, { isAbsolute } from "node:path";
import { cloudflaredConfig, type CloudflaredTunnelOptions, validateCloudflaredTunnel } from "./cloudflared-config.js";
import type { TunnelAdapter, TunnelLogEvent, TunnelProcess, TunnelTarget } from "./types.js";

export interface CloudflaredAdapterOptions extends CloudflaredTunnelOptions {
  readonly executable: string;
  readonly onLog?: (event: TunnelLogEvent) => void;
}

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
  constructor(private readonly options: CloudflaredAdapterOptions) {}

  async start(target: TunnelTarget): Promise<TunnelProcess> {
    validateCloudflaredTunnel(this.options, target);
    await validateRegularFile(this.options.executable, "TUNNEL_EXECUTABLE_INVALID", false);
    await validateRegularFile(this.options.credentialsFile, "TUNNEL_CREDENTIALS_FILE_UNSAFE", true);
    const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-"));
    const configPath = path.join(directory, "config.yml");
    try {
      await writeFile(configPath, cloudflaredConfig(this.options, target), { encoding: "utf8", mode: 0o600 });
      await chmod(configPath, 0o600);
      const child: ChildProcess = spawn(this.options.executable, ["--no-autoupdate", "tunnel", "--config", configPath, "run", this.options.tunnelId], {
        cwd: directory,
        env: { PATH: process.env.PATH ?? "" },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (!child.stdout || !child.stderr) throw new Error("TUNNEL_STDIO_UNAVAILABLE");
      child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
      child.stdout.on("data", (line: string) => logLine(this.options.onLog, line));
      child.stderr.on("data", (line: string) => logLine(this.options.onLog, line));
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
      const cleanup = () => rm(directory, { recursive: true, force: true });
      void exited.then(cleanup, cleanup);
      return {
        pid: child.pid,
        exited,
        async stop() { if (!child.killed) child.kill("SIGTERM"); await exited; },
      };
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }
}

export function createCloudflaredAdapter(options: CloudflaredAdapterOptions): CloudflaredAdapter {
  return new CloudflaredAdapter(options);
}
