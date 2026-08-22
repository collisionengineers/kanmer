import { SourceDeclarationArraySchema, type SourceDeclaration, type SourceKind, type SourceSelector } from "./types.js";

/** Host observations are caller-supplied and never inferred by core. */
export interface SourceAvailabilityContext {
  connectedMcp?: readonly string[];
  installedPlugins?: readonly string[];
}

export type SourceAvailability = "available" | "unavailable" | "unknown";

export interface ResolvedSource extends SourceDeclaration {
  availability: SourceAvailability;
  reason: string;
  declarationOrder: number;
}

export interface SourceResolutionContext extends SourceAvailabilityContext {
  area?: string;
  labels?: readonly string[];
}

/** Validate an externally supplied declaration list with the board contract. */
export function validateSourceDeclarations(sources: readonly SourceDeclaration[]): SourceDeclaration[] {
  return SourceDeclarationArraySchema.parse(sources);
}

function selectorMatches(selector: SourceSelector | undefined, context: SourceResolutionContext): boolean {
  if (!selector) return true;
  if (selector.areas?.length && (!context.area || !selector.areas.includes(context.area))) return false;
  if (selector.labels?.length && !selector.labels.some((label) => context.labels?.includes(label))) return false;
  return true;
}

function sourceAvailability(
  source: SourceDeclaration,
  context: SourceAvailabilityContext,
): { availability: SourceAvailability; reason: string } {
  if (source.kind === "llms-txt") {
    return { availability: "available", reason: "declared HTTPS documentation manifest" };
  }
  const observed = source.kind === "mcp" ? context.connectedMcp : context.installedPlugins;
  if (!observed) {
    return {
      availability: "unknown",
      reason: source.kind === "mcp" ? "host did not report connected MCP namespaces" : "host did not report installed plugins",
    };
  }
  if (observed.includes(source.id)) {
    return { availability: "available", reason: source.kind === "mcp" ? "already connected to this host" : "already installed on this host" };
  }
  return {
    availability: "unavailable",
    reason: source.kind === "mcp" ? "not connected to this host; declaration does not enable it" : "not installed on this host; declaration does not install it",
  };
}

/**
 * Resolve applicable declarations in deterministic priority/order sequence.
 * This function performs no IO and grants no authority; it only ranks what the
 * project declared against explicit host observations.
 */
export function resolveSources(
  sources: readonly SourceDeclaration[] | undefined,
  context: SourceResolutionContext = {},
): ResolvedSource[] {
  const validated = validateSourceDeclarations(sources ?? []);
  return validated
    .map((source, declarationOrder) => {
      const status = sourceAvailability(source, context);
      return { ...source, ...status, declarationOrder };
    })
    .filter((source) => selectorMatches(source.appliesTo, context))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.declarationOrder - b.declarationOrder);
}

export function sourceKey(source: Pick<SourceDeclaration, "kind" | "id">): string {
  return `${source.kind}:${source.id}`;
}

export function sourceKindLabel(kind: SourceKind): string {
  return kind === "llms-txt" ? "llms.txt" : kind;
}
