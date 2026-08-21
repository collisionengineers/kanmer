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

/** Canonicalise only the path details which are intentionally cross-host noisy. */
export function canonicalProjectPath(input: string): string {
  let value = path.resolve(input).replace(/\\/g, "/");
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
