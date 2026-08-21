import { DEFAULT_TUNNEL_RESTART_POLICY, type TunnelProcess, type TunnelRestartPolicy } from "./types.js";

export interface TunnelSupervisorOptions {
  readonly start: () => Promise<TunnelProcess>;
  readonly maxRestarts?: number;
  readonly restartPolicy?: Partial<TunnelRestartPolicy>;
  /** Test seam; production uses a cancellable timer. */
  readonly wait?: (delayMs: number) => Promise<void>;
  /** Test seam; production supplies bounded ±20% jitter. */
  readonly random?: () => number;
  readonly onState?: (state: "starting" | "running" | "restarting" | "stopped" | "failed") => void;
}

/** Bounded, parent-owned recovery for a single tunnel child. */
export class TunnelSupervisor {
  private readonly maxRestarts: number;
  private readonly policy: TunnelRestartPolicy;
  private process?: TunnelProcess;
  private stopping = false;
  private restarts = 0;
  private cancelDelay?: () => void;
  private readonly startedAt = new WeakMap<TunnelProcess, number>();

  constructor(private readonly options: TunnelSupervisorOptions) {
    this.maxRestarts = options.maxRestarts ?? options.restartPolicy?.maxRestarts ?? DEFAULT_TUNNEL_RESTART_POLICY.maxRestarts;
    this.policy = { ...DEFAULT_TUNNEL_RESTART_POLICY, ...options.restartPolicy, maxRestarts: this.maxRestarts };
    for (const value of Object.values(this.policy)) if (!Number.isSafeInteger(value) || value < 0) throw new Error("TUNNEL_RESTART_POLICY_INVALID");
    if (this.policy.baseDelayMs > this.policy.maxDelayMs || this.policy.stableResetMs < 1) throw new Error("TUNNEL_RESTART_POLICY_INVALID");
  }

  private emit(state: Parameters<NonNullable<TunnelSupervisorOptions["onState"]>>[0]): void { this.options.onState?.(state); }

  async start(): Promise<void> {
    if (this.process || this.stopping) throw new Error("TUNNEL_SUPERVISOR_NOT_STARTABLE");
    this.emit("starting");
    try { await this.launch(); }
    catch (error) { this.emit("failed"); throw error; }
  }

  private async launch(): Promise<void> {
    const process = await this.options.start();
    this.process = process;
    this.startedAt.set(process, Date.now());
    this.emit("running");
    void process.exited.then(() => this.onExit(process));
  }

  private async onExit(process: TunnelProcess): Promise<void> {
    if (this.process !== process) return;
    this.process = undefined;
    if (this.stopping) { this.emit("stopped"); return; }
    if ((Date.now() - (this.startedAt.get(process) ?? Date.now())) >= this.policy.stableResetMs) this.restarts = 0;
    if (this.restarts >= this.maxRestarts) { this.emit("failed"); return; }
    this.restarts++;
    this.emit("restarting");
    const unjittered = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** (this.restarts - 1));
    const random = this.options.random?.() ?? Math.random();
    if (!Number.isFinite(random) || random < 0 || random > 1) { this.emit("failed"); return; }
    const delay = Math.round(unjittered * (0.8 + random * 0.4));
    try {
      await this.delay(delay);
      if (!this.stopping) await this.launch();
    } catch { this.emit("failed"); }
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
    this.stopping = true;
    this.cancelDelay?.();
    const process = this.process;
    if (process) await process.stop(); else this.emit("stopped");
  }
}
