import { spawn, type ChildProcess } from "node:child_process";
import { chmod, lstat, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path, { isAbsolute } from "node:path";
import { cloudflaredConfig, type CloudflaredTunnelOptions, validateCloudflaredTunnel } from "./cloudflared-config.js";
import { validateTunnelStartInput, type TunnelAdapter, type TunnelDoctorResult, type TunnelLogEvent, type TunnelProcess, type TunnelStatus, type TunnelTarget } from "./types.js";
import { reserveLoopbackPort, reserveSpecificLoopbackPort, waitForTunnelReadiness, type LoopbackPortLease } from "./readiness.js";
import { validateCloudflaredExecutable, validateCloudflaredIngress } from "./cloudflared-validate.js";
import { TunnelLogBuffer } from "./logs.js";

export { validateTunnelStartInput } from "./types.js";

export interface CloudflaredAdapterOptions extends CloudflaredTunnelOptions {
  readonly executable: string;
  readonly metricsPort?: number;
  readonly waitForReady?: (endpoint: string) => Promise<void>;
  readonly onLog?: (event: TunnelLogEvent) => void;
  readonly validateExecutable?: (executable: string) => Promise<void | { readonly version: string }>;
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

async function stopOwnedChild(child: ChildProcess, exited: Promise<unknown>, settleIfProviderIsSilent?: () => void): Promise<void> {
  if (!child.killed) {
    if (process.platform !== "win32" && child.pid) {
      try { process.kill(-child.pid, "SIGTERM"); }
      catch { child.kill("SIGTERM"); }
    } else child.kill("SIGTERM");
  }
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
  } else if (child.pid) {
    try { process.kill(-child.pid, "SIGKILL"); }
    catch { child.kill("SIGKILL"); }
  } else child.kill("SIGKILL");
  await Promise.race([
    exited,
    new Promise<void>((resolve) => { const timer = setTimeout(resolve, 1_000); timer.unref(); }),
  ]);
  // A force-killed Windows process is not guaranteed to emit Node's exit
  // event.  Settle the owned handle after the bounded wait so shutdown cannot
  // hang forever; the OS taskkill/SIGKILL remains the process-tree authority.
  settleIfProviderIsSilent?.();
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
  async doctor(): Promise<TunnelDoctorResult> {
    const checks: Array<{ id: string; ok: boolean; code?: string }> = [];
    try { await validateRegularFile(this.options.executable, "TUNNEL_EXECUTABLE_INVALID", false); await (this.options.validateExecutable?.(this.options.executable) ?? validateCloudflaredExecutable({ executable: this.options.executable })); checks.push({ id: "executable", ok: true }); }
    catch (error) { checks.push({ id: "executable", ok: false, code: safeFailureCode(error) }); }
    try { await validateRegularFile(this.options.credentialsFile, "TUNNEL_CREDENTIALS_FILE_UNSAFE", true); checks.push({ id: "credentials", ok: true }); }
    catch (error) { checks.push({ id: "credentials", ok: false, code: safeFailureCode(error) }); }
    return { provider: "cloudflared", ok: checks.every((check) => check.ok), checks };
  }
  async stop(): Promise<void> { await this.active?.stop(); }
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
    let metricsLease: LoopbackPortLease | undefined;
    let runtimeDirectory: string | undefined;
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
      const executableValidation = await (this.options.validateExecutable?.(this.options.executable) ?? validateCloudflaredExecutable({ executable: this.options.executable }));
      await validateRegularFile(this.options.credentialsFile, "TUNNEL_CREDENTIALS_FILE_UNSAFE", true);
    metricsLease = this.options.metricsPort === undefined
      ? await reserveLoopbackPort()
      : await reserveSpecificLoopbackPort(this.options.metricsPort);
    const metricsPort = metricsLease.port;
    const directory = runtimeDirectory = await mkdtemp(path.join(os.tmpdir(), "kanmer-cloudflared-"));
    await chmod(directory, 0o700);
    const configPath = path.join(directory, "config.yml");
    let child: ChildProcess | undefined;
    let childExited: Promise<{ code: number | null; signal: NodeJS.Signals | null }> | undefined;
    let settleChildExit: ((result: { code: number | null; signal: NodeJS.Signals | null }) => void) | undefined;
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
      // Release the reservation immediately before spawning the owned child;
      // this bounds the collision window to the direct spawn boundary and
      // guarantees release on every error path below.
      await metricsLease?.release();
      metricsLease = undefined;
      this.transition("starting", target, { attempt });
      const spawned = this.spawnProcess(this.options.executable, ["tunnel", "--no-autoupdate", "--metrics", `127.0.0.1:${metricsPort}`, "--config", configPath, "run", this.options.tunnelId], {
        cwd: directory,
        env: minimalEnvironment(),
        shell: false,
        detached: process.platform !== "win32",
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
      const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => { settleChildExit = resolve; });
      let settled = false;
      const settle = (result: { code: number | null; signal: NodeJS.Signals | null }) => {
        if (settled) return;
        settled = true;
        settleChildExit?.(result);
      };
      spawned.once("exit", (code, signal) => settle({ code, signal }));
      spawned.once("error", () => settle({ code: null, signal: null }));
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
      let handle: TunnelProcess | undefined;
      const checkReadiness = async (): Promise<void> => {
        try {
          await (this.options.waitForReady?.(`http://127.0.0.1:${metricsPort}/ready`)
            ?? waitForTunnelReadiness({ endpoint: `http://127.0.0.1:${metricsPort}/ready` }));
          if (handle && this.active === handle && this.status.state === "degraded") {
            this.transition("connected", target, {
              attempt,
              pid: spawned.pid,
              publicEndpoint: `https://${target.hostname}/mcp`,
              ...(executableValidation && typeof executableValidation.version === "string" ? { providerVersion: executableValidation.version } : {}),
            });
          }
        } catch (error) {
          if (handle && this.active === handle && this.status.state === "connected") {
            this.transition("degraded", target, {
              attempt,
              pid: spawned.pid,
              publicEndpoint: `https://${target.hostname}/mcp`,
              ...(executableValidation && typeof executableValidation.version === "string" ? { providerVersion: executableValidation.version } : {}),
            });
          }
          throw error;
        }
      };
      await Promise.race([
        checkReadiness(),
        exited.then(() => { throw new Error("TUNNEL_CHILD_EXITED_BEFORE_READY"); }),
      ]);
      const cleanup = () => rm(directory, { recursive: true, force: true });
      const cleanupPromise = exited.then(cleanup, cleanup);
      let intentionalStop = false;
      let stopPromise: Promise<void> | undefined;
      handle = {
        pid: spawned.pid,
        exited,
        checkReadiness,
        stop: () => stopPromise ??= (async () => {
          intentionalStop = true;
          this.transition("stopping", target, { attempt, pid: spawned.pid });
          await stopOwnedChild(spawned, exited, () => settle({ code: null, signal: null }));
          await cleanupPromise;
        })(),
      };
      this.active = handle;
      this.transition("connected", target, {
        attempt,
        pid: spawned.pid,
        publicEndpoint: `https://${target.hostname}/mcp`,
        ...(executableValidation && typeof executableValidation.version === "string" ? { providerVersion: executableValidation.version } : {}),
      });
      void exited.then((result) => {
        if (this.active !== handle) return;
        this.active = undefined;
        this.transition(intentionalStop ? "stopped" : "failed", target, {
          attempt,
          pid: spawned.pid,
          ...(intentionalStop ? {} : { code: result.code === null ? "TUNNEL_PROCESS_SIGNAL" : "TUNNEL_PROCESS_EXIT" }),
        });
      });
      return handle;
    } catch (error) {
      if (child && childExited) await stopOwnedChild(child, childExited, () => settleChildExit?.({ code: null, signal: null }));
      else if (child && !child.killed) child.kill("SIGTERM");
      await metricsLease?.release();
      metricsLease = undefined;
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
    } catch (error) {
      await metricsLease?.release();
      if (runtimeDirectory) await rm(runtimeDirectory, { recursive: true, force: true });
      this.transition("failed", target, { attempt, code: safeFailureCode(error) });
      throw error;
    } finally { this.starting = false; }
  }
}

export function createCloudflaredAdapter(options: CloudflaredAdapterOptions, spawnProcess?: CloudflaredSpawner): CloudflaredAdapter {
  return new CloudflaredAdapter(options, spawnProcess);
}
