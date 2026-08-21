import { createHash } from "node:crypto";
import path from "node:path";
import type { RemoteProjectIdentity } from "../../shared/remote.js";

export function canonicalProjectPath(input: string): string {
  let value = path.resolve(input).replace(/\\/g, "/");
  value = value.replace(/^([A-Z]):/, (_, drive: string) => `${drive.toLowerCase()}:`);
  if (!/^\/$/.test(value) && !/^[a-z]:\/$/.test(value)) value = value.replace(/\/+$/, "");
  return value;
}

/** Keep this payload byte-for-byte compatible with MCP project-identity.ts. */
export function remoteProjectIdentity(input: {
  boardRoot: string;
  repoRoot: string;
  format: number;
  boardSource: "file" | "default";
}): RemoteProjectIdentity {
  const payload = {
    boardRoot: canonicalProjectPath(input.boardRoot),
    format: input.format,
    repoRoot: canonicalProjectPath(input.repoRoot),
  };
  const fingerprint = `kanmer-proj-v1:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  return { ...payload, boardSource: input.boardSource, fingerprint };
}
