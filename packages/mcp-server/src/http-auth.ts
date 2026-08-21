import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { HttpAuthorizer } from "./http.js";

const TOKEN_BYTES = 32;
const MAX_AUTHORIZATION_BYTES = 512;
const DUMMY_DIGEST = createHash("sha256").update("kanmer-http-invalid-bearer").digest();

export interface BearerVerifier {
  readonly tokenId: string;
  readonly digest: Buffer;
  readonly fingerprint: string;
}

export interface GeneratedBearerToken {
  readonly token: string;
  readonly verifier: BearerVerifier;
}

export function verifierForToken(token: string, tokenId?: string): BearerVerifier {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("REMOTE_AUTH_INVALID_TOKEN");
  const digest = createHash("sha256").update(token, "ascii").digest();
  const id = tokenId ?? `remote-${digest.toString("hex").slice(0, 24)}`;
  if (!id) throw new Error("REMOTE_AUTH_INVALID_CONFIG");
  const publicMetadata = { tokenId: id, fingerprint: `sha256:${digest.toString("hex").slice(0, 12)}` };
  Object.defineProperty(publicMetadata, "digest", { value: digest, enumerable: false, writable: false, configurable: false });
  return Object.freeze(publicMetadata) as BearerVerifier;
}

export function generateBearerToken(random: (size: number) => Buffer = randomBytes): GeneratedBearerToken {
  const token = random(TOKEN_BYTES).toString("base64url");
  return { token, verifier: verifierForToken(token) };
}

function candidateFromHeaders(headers: IncomingHttpHeaders): string | undefined {
  const value = headers.authorization;
  if (Array.isArray(value) || typeof value !== "string" || Buffer.byteLength(value, "utf8") > MAX_AUTHORIZATION_BYTES) return undefined;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(value);
  return match?.[1];
}

export class BearerAuthorizer implements HttpAuthorizer {
  private active: BearerVerifier | undefined;

  constructor(verifier?: BearerVerifier) { this.active = verifier; }

  async authorize(request: { headers: IncomingHttpHeaders }): Promise<{ principal: string }> {
    const token = candidateFromHeaders(request.headers);
    const digest = token ? createHash("sha256").update(token, "ascii").digest() : DUMMY_DIGEST;
    const expected = this.active?.digest ?? DUMMY_DIGEST;
    const valid = Boolean(token && this.active && digest.length === expected.length && timingSafeEqual(digest, expected));
    if (!valid || !this.active) throw new Error("REMOTE_AUTH_UNAUTHORIZED");
    return { principal: this.active.tokenId };
  }

  metadata(): { tokenId: string; fingerprint: string } | undefined {
    return this.active && { tokenId: this.active.tokenId, fingerprint: this.active.fingerprint };
  }

  replace(verifier: BearerVerifier): string | undefined {
    if (!verifier.tokenId || !Buffer.isBuffer(verifier.digest) || verifier.digest.length !== 32 || !/^sha256:[a-f0-9]{12}$/.test(verifier.fingerprint)) throw new Error("REMOTE_AUTH_INVALID_CONFIG");
    const previous = this.active?.tokenId;
    this.active = verifier;
    return previous;
  }

  revoke(): string | undefined {
    const previous = this.active?.tokenId;
    this.active = undefined;
    return previous;
  }
}

export function unauthorizedHeaders(): Record<string, string> {
  return { "www-authenticate": 'Bearer realm="kanmer"' };
}
