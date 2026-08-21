/**
 * The HTTP child is deliberately small, but it has several local diagnostic
 * boundaries (CLI failures, observer failures, and startup errors).  Keep one
 * redaction helper for those boundaries so an error supplied by a filesystem,
 * test double, or parent process can never be printed verbatim.
 */
const SECRET_FIELD = /("?(?:authorization|token|secret|verifier|digest|cookie|session(?:Id|_id)?)"?\s*[:=]\s*)([^,}\s]+)/gi;
const BEARER_VALUE = /\bBearer\s+[A-Za-z0-9_-]{16,}\b/gi;
const LONG_OPAQUE = /\b[A-Za-z0-9_-]{43}\b/g;
const FULL_DIGEST = /\b[a-f0-9]{64}\b/gi;
const SESSION_ID = /\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

export function safeDiagnosticMessage(error: unknown, fallback = "REMOTE_AUTH_INVALID_CONFIG"): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  return raw
    .replace(SECRET_FIELD, "$1[redacted]")
    .replace(BEARER_VALUE, "Bearer [redacted]")
    .replace(LONG_OPAQUE, "[redacted]")
    .replace(FULL_DIGEST, "[redacted]")
    .replace(SESSION_ID, "[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 256);
}
