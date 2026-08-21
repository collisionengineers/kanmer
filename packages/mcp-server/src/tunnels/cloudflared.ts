import { spawn, type ChildProcess } from "node:child_process";
import { chmod, lstat, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path, { isAbsolute } from "node:path";
import { cloudflaredConfig, type CloudflaredTunnelOptions, validateCloudflaredTunnel } from "./cloudflared-config.js";
import { validateTunnelStartInput, type TunnelAdapter, type TunnelLogEvent, type TunnelProcess, type TunnelStatus, type TunnelTarget } from "./types.js";
import { allocateLoopbackPort, waitForTunnelReadiness } from "./readiness.js";
import { validateCloudflaredExecutable, validateCloudflaredIngress } from "./cloudflared-validate.js";
import { TunnelLogBuffer } from "./logs.js";

export { validateTunnelStartInput } from "./types.js";

export interface CloudflaredAdapterOptions extends CloudflaredTunnelOptions {
  readonly executable: string;
  readonly metricsPort?: number;
  readonly waitForReady?: (endpoint: string) => Promise<void>;
  readonly onLog?: (event: TunnelLogEvent) => void;
  readonly validateExecutable?: (executable: string) => Promise<void>;
  /** Optional test seam; production validates the generated rules with cloudflared. */
  readonly validateIngress?: (configPath: string, hostname: string) => Promise<void>;
}

/** Test-only spawn seam; normal construction always uses Node's direct spawn. */
export type CloudflaredSpawner = typeof spawn;

async function validateRegularFile(value: string, errorCode: string, privateFile: boolean): Promise<void> {
  if (!value || /[\u0000-\u001f\u007f]/.test(value) || !isAbsolute(value)) throw new Error(errorCode);
  let metadata;
  try { metadata = await lstat(value); } catch { throw new Error(errorCode); }
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(errorCode);
  // Windows ACLs are not represented by POSIX mode bits.  On POSIX, fail
  // closed when a bearer-adjacent credentials file is group/world accessible.
  if (privateFile && process.platform !== "win32" && (metadata.mode & 0o077) !== 0) throw new Error(errorCode);
}

/** Keep only the executable-search path plus Windows' required system root. */
function minimalEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
  if (process.platform === "win32" && process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  return env;
}

function safeFailureCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return /^TUNNEL_[A-Z0-9_]+$/.test(message) ? message : "TUNNEL_START_FAILED";
}

async function stopOwnedChild(child: ChildProcess, exited: Promise<unknown>): Promise<void> {
  if (!child.killed) child.kill("SIGTERM");
  const graceful = await Promise.race([
    exited.then(() => true),
    new Promise<boolean>((resolve) => { const timer = setTimeout(() => resolve(false), 5_000); timer.unref(); }),
  ]);
  if (graceful) return;
  if (process.platform === "win32" && child.pid) {
    await new Promise<void>((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
      killer.once("error", resolve); killer.once("exit", resolve);
    });
  } else child.kill("SIGKILL");
  await exited;
}

export class CloudflaredAdapter implements TunnelAdapter {
  private readonly diagnostics = new TunnelLogBuffer();
  private readonly listeners = new Set<(status: TunnelStatus) => void>();
  private status: TunnelStatus = { state: "stopped", provider: "cloudflared", attempt: 0, changedAt: new Date().toISOString() };
  private active?: TunnelProcess;
  private starting = false;
  constructor(private readonly options: CloudflaredAdapterOptions, private readonly spawnProcess: CloudflaredSpawner = spawn) {}

  getDiagnostics(): readonly TunnelLogEvent[] { return this.diagnostics.snapshot(); }
  getStatus(): TunnelStatus { return { ...this.status }; }
  subscribe(listener: (status: TunnelStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private transition(state: TunnelStatus["state"], target?: TunnelTarget, patch: Partial<TunnelStatus> = {}): void {
    const { code: priorCode, ...prior } = this.status;
    this.status = {
      ...prior,
      ...(state === "failed" && priorCode ? { code: priorCode } : {}),
      ...patch,
      state,
      changedAt: new Date().toISOString(),
      ...(target ? { projectFingerprint: target.projectFingerprint, authGeneration: target.authGeneration } : {}),
    };
    for (const listener of this.listeners) listener(this.getStatus());
  }

  async start(target: TunnelTarget): Promise<TunnelProcess> {
    if (this.active || this.starting) throw new Error("TUNNEL_ALREADY_ACTIVE");
    this.starting = true;
    const attempt = this.status.attempt + 1;
    this.transition("validating", target, { attempt });
    try {
      validateTunnelStartInput({
        config: {
          provider: "cloudflared", mode: "named-credentials", executable: this.options.executable,
          tunnelId: this.options.tunnelId, hostname: this.options.hostname, credentials: { path: this.options.credentialsFile },
        },
        target,
      });
      validateCloudflaredTunnel(this.options, target);
      await validateRegularFile(this.options.executable, "TUNNEL_EXECUTABLE_INVALID", false);
      await (this.options.validateExecutable?.(this.options.executable) ?? validateCloudflaredExecutable({ executable: this.options.executable }));
      await validateRegularFile(this.options.credentialsFile, "TUNNEL_CREDENTIALS_FILE_UNSAFE", true);
    const metricsPort = this.options.metricsPort ?? await allocateLoopbackPort();
    if (!Number.isSafeInteger(metricsPort) || metricsPort < 1 || metricsPort > 65_535) throw new Error("TUNNEL_METRICS_PORT_INVALID");
    const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-"));
    await chmod(directory, 0o700);
    const configPath = path.join(directory, "config.yml");
    let child: ChildProcess | undefined;
    let childExited: Promise<{ code: number | null; signal: NodeJS.Signals | null }> | undefined;
    try {
      await writeFile(configPath, cloudflaredConfig(this.options, target), { encoding: "utf8", mode: 0o600, flag: "wx" });
      await chmod(configPath, 0o600);
      // In production, run only cloudflared's documented local ingress
      // validation/rule commands.  They inspect the generated file and do not
      // contact the account or mutate DNS.  Injected spawners use the explicit
      // seam so deterministic fixtures do not accidentally invoke a host CLI.
      const ingressValidation = this.options.validateIngress
        ?? (!this.options.validateExecutable && this.spawnProcess === spawn ? (config: string, hostname: string) => validateCloudflaredIngress({ executable: this.options.executable, configPath: config, hostname }) : undefined);
      if (ingressValidation) await ingressValidation(configPath, this.options.hostname);
      this.transition("starting", target, { attempt });
      const spawned = this.spawnProcess(this.options.executable, ["tunnel", "--no-autoupdate", "--metrics", `127.0.0.1:${metricsPort}`, "--config", configPath, "run", this.options.tunnelId], {
        cwd: directory,
        env: minimalEnvironment(),
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      child = spawned;
      if (!spawned.stdout || !spawned.stderr) throw new Error("TUNNEL_STDIO_UNAVAILABLE");
      spawned.stdout.setEncoding("utf8"); spawned.stderr.setEncoding("utf8");
      const emitLogs = (line: string) => this.diagnostics.write(line).forEach((event) => this.options.onLog?.(event));
      spawned.stdout.on("data", emitLogs);
      spawned.stderr.on("data", emitLogs);
      // Register exit before awaiting spawn.  A child can fail between spawn's
      // creation and its event delivery; registering afterward loses that
      // terminal event and can leave readiness hanging forever.
      const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => spawned.once("exit", (code, signal) => resolve({ code, signal })));
      childExited = exited;
      void exited.then(() => this.diagnostics.flush().forEach((event) => this.options.onLog?.(event)));
      await Promise.race([
        new Promise<void>((resolve, reject) => {
        spawned.once("spawn", resolve);
        spawned.once("error", reject);
        }),
        exited.then(() => { throw new Error("TUNNEL_CHILD_EXITED_BEFORE_READY"); }),
      ]);
      // A child that has already exited cannot become ready.  Race readiness
      // against the owned process so a malformed or unavailable metrics
      // endpoint never hides an immediate provider failure behind its timeout.
      const readiness = this.options.waitForReady?.(`http://127.0.0.1:${metricsPort}/ready`)
        ?? waitForTunnelReadiness({ endpoint: `http://127.0.0.1:${metricsPort}/ready` });
      await Promise.race([
        readiness,
        exited.then(() => { throw new Error("TUNNEL_CHILD_EXITED_BEFORE_READY"); }),
      ]);
      const cleanup = () => rm(directory, { recursive: true, force: true });
      const cleanupPromise = exited.then(cleanup, cleanup);
      let intentionalStop = false;
      let stopPromise: Promise<void> | undefined;
      const handle: TunnelProcess = {
        pid: spawned.pid,
        exited,
        checkReadiness: () => this.options.waitForReady?.(`http://127.0.0.1:${metricsPort}/ready`) ?? waitForTunnelReadiness({ endpoint: `http://127.0.0.1:${metricsPort}/ready` }),
        stop: () => stopPromise ??= (async () => {
          intentionalStop = true;
          this.transition("stopping", target, { attempt, pid: spawned.pid });
          await stopOwnedChild(spawned, exited);
          await cleanupPromise;
        })(),
      };
      this.active = handle;
      this.transition("connected", target, { attempt, pid: spawned.pid, publicEndpoint: `https://${target.hostname}/mcp` });
      void exited.then((result) => {
        if (this.active !== handle) return;
        this.active = undefined;
        this.transition(intentionalStop ? "stopped" : "failed", target, {
          attempt,
          pid: spawned.pid,
          ...(intentionalStop ? {} : { code: result.code === null ? "signal" : String(result.code) }),
        });
      });
      return handle;
    } catch (error) {
      if (child && childExited) await stopOwnedChild(child, childExited);
      else if (child && !child.killed) child.kill("SIGTERM");
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
    } catch (error) {
      this.transition("failed", target, { attempt, code: safeFailureCode(error) });
      throw error;
    } finally { this.starting = false; }
  }
}

export function createCloudflaredAdapter(options: CloudflaredAdapterOptions, spawnProcess?: CloudflaredSpawner): CloudflaredAdapter {
  return new CloudflaredAdapter(options, spawnProcess);
}
