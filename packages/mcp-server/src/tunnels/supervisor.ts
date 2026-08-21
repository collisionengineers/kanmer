import { DEFAULT_TUNNEL_RESTART_POLICY, type TunnelProcess, type TunnelRestartPolicy } from "./types.js";

export interface TunnelSupervisorOptions {
  readonly start: () => Promise<TunnelProcess>;
  readonly maxRestarts?: number;
  readonly restartPolicy?: Partial<TunnelRestartPolicy>;
  /** Test seam; production uses a cancellable timer. */
  readonly wait?: (delayMs: number) => Promise<void>;
  readonly onState?: (state: "starting" | "running" | "restarting" | "stopped" | "failed") => void;
}

/** Bounded, parent-owned recovery for a single tunnel child. */
export class TunnelSupervisor {
  private readonly maxRestarts: number;
  private readonly policy: TunnelRestartPolicy;
  private process?: TunnelProcess;
  private stopping = false;
  private restarts = 0;

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
    await this.launch();
  }

  private async launch(): Promise<void> {
    const process = await this.options.start();
    this.process = process;
    this.emit("running");
    void process.exited.then(() => this.onExit(process));
  }

  private async onExit(process: TunnelProcess): Promise<void> {
    if (this.process !== process) return;
    this.process = undefined;
    if (this.stopping) { this.emit("stopped"); return; }
    if (this.restarts >= this.maxRestarts) { this.emit("failed"); return; }
    this.restarts++;
    this.emit("restarting");
    const delay = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** (this.restarts - 1));
    try {
      await (this.options.wait?.(delay) ?? new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, delay);
        timer.unref();
      }));
      if (!this.stopping) await this.launch();
    } catch { this.emit("failed"); }
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const process = this.process;
    if (process) await process.stop(); else this.emit("stopped");
  }
}
