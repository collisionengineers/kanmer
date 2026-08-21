import type { TunnelLogEvent } from "./types.js";

const MAX_LINE_BYTES = 4_096;
const MAX_EVENTS = 32;

/** Bounded diagnostics which never retain provider text or secrets. */
export class TunnelLogBuffer {
  private pending = "";
  private readonly events: TunnelLogEvent[] = [];

  write(chunk: string): TunnelLogEvent[] {
    this.pending += chunk;
    if (this.pending.length > MAX_LINE_BYTES * 2 && !this.pending.includes("\n")) {
      this.pending = "";
      return this.record("warn", "TUNNEL_PROVIDER_LOG_OVERSIZE");
    }
    const lines = this.pending.split(/\r?\n/);
    this.pending = lines.pop() ?? "";
    return lines.flatMap((line) => this.accept(line));
  }

  flush(): TunnelLogEvent[] {
    const line = this.pending;
    this.pending = "";
    return line ? this.accept(line) : [];
  }

  snapshot(): readonly TunnelLogEvent[] { return this.events.map((event) => ({ ...event })); }

  private accept(line: string): TunnelLogEvent[] {
    if (line.length > MAX_LINE_BYTES) return this.record("warn", "TUNNEL_PROVIDER_LOG_OVERSIZE");
    if (!line.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(line);
      const level = typeof parsed === "object" && parsed !== null && "level" in parsed && typeof parsed.level === "string" && ["debug", "info", "warn", "error"].includes(parsed.level)
        ? parsed.level as TunnelLogEvent["level"]
        : "info";
      return this.record(level, "TUNNEL_PROVIDER_LOG_JSON");
    } catch {
      return this.record("info", "TUNNEL_PROVIDER_LOG_TEXT");
    }
  }

  private record(level: TunnelLogEvent["level"], code: string): TunnelLogEvent[] {
    const latest = this.events.at(-1);
    if (latest && latest.level === level && latest.code === code) {
      const event: TunnelLogEvent = { ...latest, count: latest.count + 1 };
      this.events[this.events.length - 1] = event;
      return [event];
    }
    const event: TunnelLogEvent = { provider: "cloudflared", level, code, count: 1, message: "provider output received" };
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    return [event];
  }
}
