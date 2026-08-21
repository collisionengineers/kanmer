import { createHash } from "node:crypto";
import path from "node:path";

export interface ProjectIdentityInput {
  boardRoot: string;
  format: number;
  repoRoot: string;
  boardSource: "file" | "default";
}

export interface ProjectIdentity {
  boardRoot: string;
  format: number;
  repoRoot: string;
  boardSource: "file" | "default";
  fingerprint: string;
}

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || /^\\\\/.test(input);
}

/** Canonicalise only the path details which are intentionally cross-host noisy. */
export function canonicalProjectPath(input: string): string {
  // A smoke vector can deliberately be Windows-looking even when the test
  // host is POSIX. Native path.resolve would treat `C:\\...` as a relative
  // filename there, producing a cwd-dependent identity. Resolve explicit
  // Windows drive/UNC paths with win32; native paths keep host semantics.
  let value = (isWindowsAbsolute(input) ? path.win32.resolve(input) : path.resolve(input)).replace(/\\/g, "/");
  value = value.replace(/^([A-Z]):/, (_, drive: string) => `${drive.toLowerCase()}:`);
  if (!/^\/$/.test(value) && !/^[a-z]:\/$/.test(value)) value = value.replace(/\/+$/, "");
  return value;
}

/**
 * A session-local, machine-local board identity. Keep the payload construction
 * in this exact order: its JSON bytes are the compatibility contract.
 */
export function projectIdentity(input: ProjectIdentityInput): ProjectIdentity {
  const payload = {
    boardRoot: canonicalProjectPath(input.boardRoot),
    format: input.format,
    repoRoot: canonicalProjectPath(input.repoRoot),
  };
  const fingerprint = `kanmer-proj-v1:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return { ...payload, boardSource: input.boardSource, fingerprint };
}
