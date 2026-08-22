import { inconclusiveProtectedChecks } from "./remote-public-evidence.js";
import { evidence, type RemotePublicEvidence } from "./remote-public-types.js";

export function makeProtectedInconclusiveEvidence(reason: string, startedAt = new Date().toISOString()): RemotePublicEvidence {
  const finishedAt = new Date().toISOString();
  return evidence(inconclusiveProtectedChecks(reason), { startedAt, finishedAt, environment: "protected-cloudflare" });
}
