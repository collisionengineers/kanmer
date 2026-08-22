/** The small, renderer-only view needed for a failed move popover. */
export interface GateFeedbackRequirement {
  requirement: string;
  /** Existing Editor tab to open, or null when the requirement is ticket metadata. */
  documentType: string | null;
}

export interface GateFeedback {
  targetStatus: string;
  boundary: string;
  requirements: GateFeedbackRequirement[];
}

/**
 * Convert the existing getGateStatus blockedBy strings into an action view.
 * Gate decisions remain in core; this only maps its already-human-readable
 * answer to the Editor's existing document tabs.
 */
export function parseGateFeedback(
  targetStatus: string,
  reasons: readonly string[],
): GateFeedback | null {
  const entries = reasons.flatMap((reason) => {
    const match = /^(.+?): needs (.+)$/.exec(reason);
    if (!match) return [];
    return [{
      boundary: match[1],
      requirements: match[2].split(/,\s*/).map((requirement) => ({
        requirement,
        documentType: editorDocumentType(requirement),
      })),
    }];
  });
  if (entries.length === 0) return null;

  const requirements = entries.flatMap((entry) => entry.requirements).filter(
    (requirement, index, all) => all.findIndex((candidate) => candidate.requirement === requirement.requirement) === index,
  );
  return {
    targetStatus,
    boundary: entries.map((entry) => entry.boundary).join("; "),
    requirements,
  };
}

/** Map a core requirement name to the existing Editor tab, without re-gating. */
export function editorDocumentType(requirement: string): string | null {
  const normalized = requirement.trim().replace(/^["`]|["`]$/g, "");
  if (normalized === "questions-resolved") return "open-questions";
  if (normalized === "governing-doc") return null;
  return normalized.split(/[/:]/, 1)[0] || null;
}

export function gateRequirementLabel(requirement: string): string {
  return requirement.replace(/^["`]|["`]$/g, "");
}
