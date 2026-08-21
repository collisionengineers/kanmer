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

/** The sole tool-result builder for caught/explicit errors. */
export function failCoded(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof KanmerError ? error.code : classifiedCode(message);
  const text = message.startsWith("Conflict:") ? message : `Error: ${message}`;
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
    ...(code ? { structuredContent: { error: { code, message } } } : {}),
  };
}
