/**
 * The dispatch-only provider registry.  Connect registration/install metadata
 * remains a GUI concern; this closed list is the single source of truth for
 * headless provider ids, labels and fixed CLI arguments (FRD-010/MCP-020).
 */

export type DispatchProviderId = "codex" | "claude" | "opencode" | "grok";

export interface DispatchArgsInput {
  prompt: string;
  sourceRoot: string;
  model?: string;
}

export interface DispatchModelOption {
  /** Evidence captured from the installed CLI help during GUI-075. */
  readonly flag: "--model";
  readonly evidence: string;
  readonly buildArgs: (model: string) => readonly string[];
}

export interface DispatchProvider {
  readonly id: DispatchProviderId;
  readonly label: string;
  readonly cli: string;
  readonly buildDispatchArgs: (input: DispatchArgsInput) => readonly string[];
  readonly modelOption: DispatchModelOption;
}

const MODEL = (evidence: string): DispatchModelOption => ({
  flag: "--model",
  evidence,
  buildArgs: (model) => ["--model", model],
});

const PROVIDERS: readonly DispatchProvider[] = Object.freeze([
  Object.freeze({ id: "codex", label: "Codex", cli: "codex", buildDispatchArgs: ({ prompt, model }: DispatchArgsInput) => ["exec", ...(model ? ["--model", model] : []), prompt], modelOption: MODEL("codex exec --help: -m, --model <MODEL>") }),
  Object.freeze({ id: "claude", label: "Claude Code", cli: "claude", buildDispatchArgs: ({ prompt, model }: DispatchArgsInput) => ["-p", prompt, ...(model ? ["--model", model] : [])], modelOption: MODEL("claude --help: --model <model>") }),
  Object.freeze({ id: "opencode", label: "opencode", cli: "opencode", buildDispatchArgs: ({ prompt, model }: DispatchArgsInput) => ["run", ...(model ? ["--model", model] : []), prompt], modelOption: MODEL("opencode run --help: -m, --model <string>") }),
  Object.freeze({ id: "grok", label: "Grok CLI", cli: "grok", buildDispatchArgs: ({ prompt, sourceRoot, model }: DispatchArgsInput) => ["-p", prompt, ...(model ? ["--model", model] : []), "--cwd", sourceRoot], modelOption: MODEL("grok --help: -m, --model <MODEL>") }),
]);

export const listDispatchProviders = (): DispatchProvider[] => PROVIDERS.map((provider) => ({ ...provider }));

export function dispatchProviderById(id: string): DispatchProvider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

export function isDispatchProviderId(id: string): id is DispatchProviderId {
  return dispatchProviderById(id) !== undefined;
}
