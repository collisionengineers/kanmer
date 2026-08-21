import { DEFAULT_TUNNEL_RESTART_POLICY, type TunnelProcess, type TunnelRestartPolicy } from "./types.js";

export interface TunnelSupervisorOptions {
  readonly start: () => Promise<TunnelProcess>;
  readonly maxRestarts?: number;
  readonly restartPolicy?: Partial<TunnelRestartPolicy>;
  /** Test seam; production uses a cancellable timer. */
  readonly wait?: (delayMs: number) => Promise<void>;
  /** Test seam; production supplies bounded ±20% jitter. */
  readonly random?: () => number;
  /** Test seam for stable-period and backoff decisions. */
  readonly now?: () => number;
  /** Security/configuration exits are terminal; only transient exits retry. */
  readonly classifyExit?: (result: Awaited<TunnelProcess["exited"]>) => "transient" | "terminal";
  readonly onState?: (state: "starting" | "running" | "restarting" | "stopped" | "failed") => void;
}

/** Bounded, parent-owned recovery for a single tunnel child. */
export class TunnelSupervisor {
  private readonly maxRestarts: number;
  private readonly policy: TunnelRestartPolicy;
  private process?: TunnelProcess;
  private stopping = false;
  private launching = false;
  private retrying = false;
  private generation = 0;
  private lifecyclePromise?: Promise<void>;
  private restarts = 0;
  private cancelDelay?: () => void;
  private readonly startedAt = new WeakMap<TunnelProcess, number>();

  private now(): number { return this.options.now?.() ?? Date.now(); }

  constructor(private readonly options: TunnelSupervisorOptions) {
    this.maxRestarts = options.maxRestarts ?? options.restartPolicy?.maxRestarts ?? DEFAULT_TUNNEL_RESTART_POLICY.maxRestarts;
    this.policy = { ...DEFAULT_TUNNEL_RESTART_POLICY, ...options.restartPolicy, maxRestarts: this.maxRestarts };
    for (const value of Object.values(this.policy)) if (!Number.isSafeInteger(value) || value < 0) throw new Error("TUNNEL_RESTART_POLICY_INVALID");
    if (this.maxRestarts > 10 || this.policy.baseDelayMs > this.policy.maxDelayMs || this.policy.stableResetMs < 1) throw new Error("TUNNEL_RESTART_POLICY_INVALID");
  }

  private emit(state: Parameters<NonNullable<TunnelSupervisorOptions["onState"]>>[0]): void { this.options.onState?.(state); }

  async start(): Promise<void> {
    if (this.process || this.launching || this.retrying || this.stopping) throw new Error("TUNNEL_SUPERVISOR_NOT_STARTABLE");
    this.emit("starting");
    const generation = this.generation;
    this.launching = true;
    const operation = this.launch(generation);
    this.lifecyclePromise = operation;
    try { await operation; }
    catch (error) { this.emit("failed"); throw error; }
    finally {
      this.launching = false;
      if (this.lifecyclePromise === operation) this.lifecyclePromise = undefined;
    }
  }

  private async launch(generation: number): Promise<void> {
    const process = await this.options.start();
    // A stop or a newer lifecycle generation may arrive while the provider is
    // validating/spawning.  Never publish that child as active; clean up the
    // owned handle before returning to the caller.
    if (this.stopping || generation !== this.generation) {
      await process.stop();
      throw new Error("TUNNEL_SUPERVISOR_STOPPED");
    }
    this.process = process;
    this.startedAt.set(process, this.now());
    this.emit("running");
    void process.exited.then((result) => this.onExit(process, result));
  }

  private async onExit(process: TunnelProcess, result: Awaited<TunnelProcess["exited"]>): Promise<void> {
    if (this.process !== process) return;
    this.process = undefined;
    if (this.stopping) { this.emit("stopped"); return; }
    if ((this.options.classifyExit?.(result) ?? "transient") === "terminal") { this.emit("failed"); return; }
    if ((this.now() - (this.startedAt.get(process) ?? this.now())) >= this.policy.stableResetMs) this.restarts = 0;
    if (this.restarts >= this.maxRestarts) { this.emit("failed"); return; }
    this.restarts++;
    this.emit("restarting");
    const unjittered = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** (this.restarts - 1));
    const random = this.options.random?.() ?? Math.random();
    if (!Number.isFinite(random) || random < 0 || random > 1) { this.emit("failed"); return; }
    const delay = Math.round(unjittered * (0.8 + random * 0.4));
    const generation = this.generation;
    const operation = (async () => {
      await this.delay(delay);
      if (this.stopping || generation !== this.generation) return;
      this.launching = true;
      try { await this.launch(generation); }
      finally { this.launching = false; }
    })();
    this.retrying = true;
    this.lifecyclePromise = operation;
    try { await operation; }
    catch {
      if (this.stopping || generation !== this.generation) this.emit("stopped");
      else this.emit("failed");
    }
    finally {
      this.retrying = false;
      if (this.lifecyclePromise === operation) this.lifecyclePromise = undefined;
    }
  }

  private async delay(delay: number): Promise<void> {
    if (this.options.wait) return this.options.wait(delay);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { this.cancelDelay = undefined; resolve(); }, delay);
      timer.unref();
      this.cancelDelay = () => { clearTimeout(timer); this.cancelDelay = undefined; resolve(); };
    });
  }

  async stop(): Promise<void> {
    if (this.stopping) {
      await this.lifecyclePromise;
      return;
    }
    this.stopping = true;
    this.generation++;
    this.cancelDelay?.();
    const process = this.process;
    if (process) await process.stop();
    try { await this.lifecyclePromise; }
    catch (error) { if (!this.stopping) throw error; }
    if (!process && !this.lifecyclePromise) this.emit("stopped");
  }
}
