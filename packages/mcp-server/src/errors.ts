export type KanmerErrorCode = "WRONG_PROJECT" | "REVISION_CONFLICT" | "GATE_BLOCKED";

export class KanmerError extends Error {
  constructor(readonly code: KanmerErrorCode, message: string) {
    super(message);
    this.name = "KanmerError";
  }
}

function classifiedCode(message: string): KanmerErrorCode | undefined {
  if (message.startsWith("Conflict:")) return "REVISION_CONFLICT";
  // Core keeps gate failures as ordinary errors. Match its explicit movement
  // refusal wording, not generic words such as "blocked" in validation text.
  if (/\b(?:entering|leaving)\b[^:\n]*\brequires\b/i.test(message) || /\bcannot move\b.*\bcrosses\b/i.test(message)) return "GATE_BLOCKED";
  return undefined;
}

/** The logical-project block every response carries (FRD-029). */
export interface ResponseProject {
  project_id: string | null;
  board_id: string | null;
  fingerprint: string;
}

/**
 * The sole tool-result builder for caught/explicit errors. `project`, when
 * known, decorates the structured result so even a refusal names the logical
 * project that refused it; the text is unchanged for older clients.
 */
export function failCoded(error: unknown, project?: ResponseProject) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof KanmerError ? error.code : classifiedCode(message);
  const text = message.startsWith("Conflict:") ? message : `Error: ${message}`;
  const structured = {
    ...(code ? { error: { code, message } } : {}),
    ...(project ? { project } : {}),
  };
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
    ...(Object.keys(structured).length ? { structuredContent: structured } : {}),
  };
}
