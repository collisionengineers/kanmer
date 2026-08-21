/**
 * The dispatch-only provider registry.  Connect registration/install metadata
 * remains a GUI concern; this closed list is the single source of truth for
 * headless provider ids, labels and fixed CLI arguments (FRD-010/MCP-020).
 */

export type DispatchProviderId = "codex" | "claude" | "opencode" | "grok";

export interface DispatchProvider {
  readonly id: DispatchProviderId;
  readonly label: string;
  readonly cli: string;
  readonly args: (prompt: string, sourceRoot: string) => readonly string[];
}

const PROVIDERS: readonly DispatchProvider[] = Object.freeze([
  Object.freeze({ id: "codex", label: "Codex", cli: "codex", args: (prompt: string) => ["exec", prompt] }),
  Object.freeze({ id: "claude", label: "Claude Code", cli: "claude", args: (prompt: string) => ["-p", prompt] }),
  Object.freeze({ id: "opencode", label: "opencode", cli: "opencode", args: (prompt: string) => ["run", prompt] }),
  Object.freeze({ id: "grok", label: "Grok CLI", cli: "grok", args: (prompt: string, sourceRoot: string) => ["-p", prompt, "--cwd", sourceRoot] }),
]);

export const listDispatchProviders = (): DispatchProvider[] => PROVIDERS.map((provider) => ({ ...provider, args: provider.args }));

export function dispatchProviderById(id: string): DispatchProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export function isDispatchProviderId(id: string): id is DispatchProviderId {
  return dispatchProviderById(id) !== undefined;
}
