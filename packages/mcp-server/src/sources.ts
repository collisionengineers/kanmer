import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  SourceDeclarationSchema,
  withExclusiveFileLock,
  writeFileAtomic,
} from "@kanmer/core";

/** The deliberately bounded network/cache policy for project-declared llms.txt sources. */
export const LLMS_TXT_POLICY = Object.freeze({
  maxLinkedPages: 32,
  maxBytes: 2 * 1024 * 1024,
  maxDepth: 1,
  maxRedirects: 5,
  timeoutMs: 10_000,
  cacheTtlMs: 24 * 60 * 60 * 1000,
});

export interface LlmsDocument {
  url: string;
  text: string;
  etag?: string;
  lastModified?: string;
}

export interface LlmsFetchResult {
  sourceUrl: string;
  documents: LlmsDocument[];
  failures: string[];
  fromCache: boolean;
  fetchedAt: string;
}

interface CacheFile {
  url: string;
  fetchedAt: string;
  expiresAt: string;
  etag?: string;
  lastModified?: string;
  sha256?: string;
  documents: LlmsDocument[];
  failures: string[];
}

interface FetchOptions {
  url: string;
  cacheDir: string;
  fetchImpl?: typeof fetch;
  lookupImpl?: (hostname: string) => Promise<string[]>;
  now?: () => number;
  force?: boolean;
}

interface FetchTextResult {
  status: number;
  text: string;
  url: string;
  etag?: string;
  lastModified?: string;
  bytes: number;
}

class ResponseTooLargeError extends Error {
  readonly consumedBytes: number;

  constructor(url: URL, limit: number, consumedBytes: number) {
    super(`${url} exceeds the ${limit}-byte response limit`);
    this.name = "ResponseTooLargeError";
    this.consumedBytes = consumedBytes;
  }
}

function canonicalHttpsUrl(value: string): URL {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error("llms-txt source id must be an HTTPS URL without credentials, query, or fragment");
  }
  parsed.protocol = "https:";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.port === "443") parsed.port = "";
  return parsed;
}

function isPrivateAddress(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^[\[]|[\]]$/g, "");
  const version = isIP(normalized);
  if (version === 4) {
    const octets = normalized.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  if (version !== 6) return false;
  if (normalized.startsWith("::ffff:")) return isPrivateAddress(normalized.slice(7));
  return (
    normalized === "::1" || normalized === "::" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    normalized.startsWith("fe8") || normalized.startsWith("fe9") ||
    normalized.startsWith("fea") || normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  );
}

/** Reject private destinations, including hostnames resolving to them. */
async function assertPublicDestination(
  url: URL,
  lookupImpl?: (hostname: string) => Promise<string[]>,
): Promise<void> {
  const hostname = url.hostname.toLowerCase().replace(/[\[\]]/g, "");
  if (
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
    hostname === "metadata.google.internal" || hostname === "metadata.azure.internal"
  ) {
    throw new Error(`${url} targets a private or local destination`);
  }
  if (isPrivateAddress(hostname)) throw new Error(`${url} targets a private or local destination`);
  if (lookupImpl && !isIP(hostname)) {
    let addresses: string[];
    try {
      addresses = await lookupImpl(hostname);
    } catch {
      throw new Error(`${url} destination could not be resolved`);
    }
    if (addresses.length === 0 || addresses.some((address) => isPrivateAddress(address))) {
      throw new Error(`${url} targets a private or local destination`);
    }
  }
}

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port;
}

function assertSafeFetchTarget(origin: URL, target: URL): void {
  if (
    !sameOrigin(origin, target) ||
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  ) {
    throw new Error(`${origin} redirected outside its declared HTTPS origin`);
  }
}

function cacheDigest(documents: readonly LlmsDocument[]): string {
  return createHash("sha256")
    .update(documents.map((document) => `${document.url}\n${document.text}`).join("\n"))
    .digest("hex");
}

function cachePath(cacheDir: string, url: string): string {
  const key = createHash("sha256").update(url).digest("hex");
  return path.join(cacheDir, `${key}.json`);
}

async function readCache(file: string): Promise<CacheFile | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const cache = parsed as Partial<CacheFile>;
    if (
      typeof cache.url !== "string" ||
      typeof cache.fetchedAt !== "string" ||
      typeof cache.expiresAt !== "string" ||
      !Array.isArray(cache.documents) ||
      !cache.documents.every(
        (document) =>
          !!document &&
          typeof document === "object" &&
          typeof (document as LlmsDocument).url === "string" &&
          typeof (document as LlmsDocument).text === "string" &&
          ((document as LlmsDocument).etag === undefined || typeof (document as LlmsDocument).etag === "string") &&
          ((document as LlmsDocument).lastModified === undefined || typeof (document as LlmsDocument).lastModified === "string"),
      ) ||
      !Array.isArray(cache.failures) ||
      !cache.failures.every((failure) => typeof failure === "string") ||
      (cache.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(cache.sha256))
    ) {
      return null;
    }
    const documents = cache.documents as LlmsDocument[];
    if (cache.sha256 && cache.sha256 !== cacheDigest(documents)) return null;
    return {
      url: canonicalHttpsUrl(cache.url).toString(),
      fetchedAt: cache.fetchedAt,
      expiresAt: cache.expiresAt,
      etag: cache.etag,
      lastModified: cache.lastModified,
      sha256: cache.sha256,
      documents,
      failures: cache.failures,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    // A cache is derived data, so malformed/tampered bytes are discarded and
    // rebuilt rather than turning a source fetch into a permanent failure.
    if (!code) return null;
    throw error;
  }
}

function markdownLinks(text: string, base: URL): URL[] {
  const urls: URL[] = [];
  const seen = new Set<string>();
  // Images are content, not documentation pages, and must not consume the cap.
  const pattern = /(?<!\!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(pattern)) {
    const href = match[1];
    if (!href) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }
    // Fragments are presentation-only and are removed before validation.
    resolved.hash = "";
    if (!sameOrigin(base, resolved) || resolved.protocol !== "https:" || resolved.search) continue;
    const key = resolved.toString();
    if (!seen.has(key)) {
      seen.add(key);
      urls.push(resolved);
    }
  }
  return urls;
}

async function fetchText(
  url: URL,
  fetchImpl: typeof fetch,
  headers: Record<string, string>,
  timeoutMs: number,
  maxBytes: number = LLMS_TXT_POLICY.maxBytes,
  lookupImpl?: (hostname: string) => Promise<string[]>,
): Promise<FetchTextResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const origin = new URL(url);
  let current = new URL(url);
  let redirects = 0;
  let requestHeaders = headers;
  try {
    while (true) {
      await assertPublicDestination(current, lookupImpl);
      const response = await fetchImpl(current, { headers: requestHeaders, redirect: "manual", signal: controller.signal });
      const responseUrl = response.url ? new URL(response.url) : current;
      assertSafeFetchTarget(origin, responseUrl);
      await assertPublicDestination(responseUrl, lookupImpl);
      if (response.status === 304) {
        return {
          status: 304,
          text: "",
          url: current.toString(),
          etag: response.headers.get("etag") ?? undefined,
          lastModified: response.headers.get("last-modified") ?? undefined,
          bytes: 0,
        };
      }
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirects >= LLMS_TXT_POLICY.maxRedirects) {
          throw new Error(`${url} exceeded the redirect limit or returned a redirect without Location`);
        }
        const next = new URL(location, current);
        assertSafeFetchTarget(origin, next);
        await assertPublicDestination(next, lookupImpl);
        current = next;
        redirects++;
        // Validators belong to the origin representation, not an arbitrary hop.
        requestHeaders = {};
        continue;
      }
      if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
      const rawContentType = response.headers.get("content-type");
      const contentType = rawContentType?.split(";", 1)[0]?.trim().toLowerCase();
      if (!contentType || (!contentType.startsWith("text/") && contentType !== "application/json")) {
        throw new Error(`${url} returned unsupported or missing content type`);
      }
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > maxBytes) {
        throw new ResponseTooLargeError(url, maxBytes, length);
      }
      if (!response.body) {
        const text = await response.text();
        const bytes = Buffer.byteLength(text, "utf8");
        if (bytes > maxBytes) throw new ResponseTooLargeError(url, maxBytes, bytes);
        return {
          status: response.status,
          text,
          url: current.toString(),
          etag: response.headers.get("etag") ?? undefined,
          lastModified: response.headers.get("last-modified") ?? undefined,
          bytes,
        };
      }
      const reader = response.body.getReader();
      const chunks: Buffer[] = [];
      let bytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > maxBytes) {
            await reader.cancel();
            throw new ResponseTooLargeError(url, maxBytes, bytes);
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      return {
        status: response.status,
        text: Buffer.concat(chunks).toString("utf8"),
        url: current.toString(),
        etag: response.headers.get("etag") ?? undefined,
        lastModified: response.headers.get("last-modified") ?? undefined,
        bytes,
      };
    }
  } finally {
    clearTimeout(timer);
  }
}

async function writeCache(file: string, cache: CacheFile): Promise<void> {
  const content = JSON.stringify(cache, null, 2) + "\n";
  await withExclusiveFileLock(`${file}.lock`, () => writeFileAtomic(file, content));
}

function asDocument(response: FetchTextResult): LlmsDocument {
  return {
    url: response.url,
    text: response.text,
    ...(response.etag ? { etag: response.etag } : {}),
    ...(response.lastModified ? { lastModified: response.lastModified } : {}),
  };
}

function failureText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function consumedBytes(error: unknown): number {
  return error instanceof ResponseTooLargeError ? error.consumedBytes : 0;
}

async function revalidateLinkedDocuments(
  cached: CacheFile,
  fetchImpl: typeof fetch,
  failures: string[],
  lookupImpl?: (hostname: string) => Promise<string[]>,
): Promise<LlmsDocument[]> {
  const root = cached.documents[0];
  if (!root) return [];
  const documents: LlmsDocument[] = [root];
  let bytes = Buffer.byteLength(root.text, "utf8");
  for (const cachedDocument of cached.documents.slice(1, LLMS_TXT_POLICY.maxLinkedPages + 1)) {
    if (bytes >= LLMS_TXT_POLICY.maxBytes) {
      failures.push(`${cachedDocument.url} skipped because the aggregate response limit was reached`);
      documents.push(cachedDocument);
      continue;
    }
    const requestHeaders: Record<string, string> = {};
    if (cachedDocument.etag) requestHeaders["if-none-match"] = cachedDocument.etag;
    if (cachedDocument.lastModified) requestHeaders["if-modified-since"] = cachedDocument.lastModified;
    try {
      const response = await fetchText(
        new URL(cachedDocument.url),
        fetchImpl,
        requestHeaders,
        LLMS_TXT_POLICY.timeoutMs,
        LLMS_TXT_POLICY.maxBytes - bytes,
        lookupImpl,
      );
      if (response.status === 304) {
        documents.push(cachedDocument);
      } else {
        bytes += response.bytes;
        documents.push(asDocument(response));
      }
    } catch (error) {
      bytes += consumedBytes(error);
      failures.push(failureText(error));
      documents.push(cachedDocument);
    }
  }
  return documents;
}

/** Fetch a declared llms.txt root and bounded same-origin direct links. */
export async function fetchLlmsTxt(options: FetchOptions): Promise<LlmsFetchResult> {
  const root = canonicalHttpsUrl(options.url);
  const fetchImpl = options.fetchImpl ?? fetch;
  const lookupImpl = options.lookupImpl ?? (fetchImpl === fetch
    ? async (hostname: string) => (await dnsLookup(hostname, { all: true, verbatim: true })).map(({ address }) => address)
    : undefined);
  const now = options.now ?? Date.now;
  const cacheFile = cachePath(options.cacheDir, root.toString());
  const cached = await readCache(cacheFile);
  const nowMs = now();
  if (!options.force && cached && cached.url === root.toString() && Date.parse(cached.expiresAt) > nowMs) {
    return {
      sourceUrl: cached.url,
      documents: cached.documents,
      failures: cached.failures,
      fromCache: true,
      fetchedAt: cached.fetchedAt,
    };
  }

  const headers: Record<string, string> = {};
  if (cached?.etag) headers["if-none-match"] = cached.etag;
  if (cached?.lastModified) headers["if-modified-since"] = cached.lastModified;
  const failures: string[] = [];
  let rootResponse: FetchTextResult;
  try {
    rootResponse = await fetchText(root, fetchImpl, headers, LLMS_TXT_POLICY.timeoutMs, LLMS_TXT_POLICY.maxBytes, lookupImpl);
  } catch (error) {
    if (cached) {
      failures.push(failureText(error));
      return {
        sourceUrl: cached.url,
        documents: cached.documents,
        failures,
        fromCache: true,
        fetchedAt: cached.fetchedAt,
      };
    }
    throw error;
  }
  if (rootResponse.status === 304 && cached) {
    const documents = await revalidateLinkedDocuments(cached, fetchImpl, failures, lookupImpl);
    const refreshed: CacheFile = {
      ...cached,
      fetchedAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + LLMS_TXT_POLICY.cacheTtlMs).toISOString(),
      sha256: cacheDigest(documents),
      documents,
      failures,
    };
    await mkdir(options.cacheDir, { recursive: true });
    await writeCache(cacheFile, refreshed);
    return {
      sourceUrl: cached.url,
      documents,
      failures,
      fromCache: true,
      fetchedAt: refreshed.fetchedAt,
    };
  }
  if (rootResponse.status === 304) {
    throw new Error(`${root} returned HTTP 304 without a cached representation`);
  }

  const documents: LlmsDocument[] = [asDocument(rootResponse)];
  const candidates = markdownLinks(rootResponse.text, new URL(rootResponse.url)).slice(0, LLMS_TXT_POLICY.maxLinkedPages);
  let bytes = rootResponse.bytes;
  for (const candidate of candidates) {
    if (bytes >= LLMS_TXT_POLICY.maxBytes) {
      failures.push(`${candidate} skipped because the aggregate response limit was reached`);
      continue;
    }
    try {
      const remaining = LLMS_TXT_POLICY.maxBytes - bytes;
      const response = await fetchText(candidate, fetchImpl, {}, LLMS_TXT_POLICY.timeoutMs, remaining, lookupImpl);
      bytes += response.bytes;
      if (bytes > LLMS_TXT_POLICY.maxBytes) {
        failures.push(`${candidate} skipped because the aggregate response limit was reached`);
        continue;
      }
      documents.push(asDocument(response));
    } catch (error) {
      bytes += consumedBytes(error);
      failures.push(failureText(error));
    }
  }
  const fetchedAt = new Date(nowMs).toISOString();
  const cache: CacheFile = {
    url: root.toString(),
    fetchedAt,
    expiresAt: new Date(nowMs + LLMS_TXT_POLICY.cacheTtlMs).toISOString(),
    etag: rootResponse.etag,
    lastModified: rootResponse.lastModified,
    sha256: cacheDigest(documents),
    documents,
    failures,
  };
  await mkdir(options.cacheDir, { recursive: true });
  await writeCache(cacheFile, cache);
  return { sourceUrl: root.toString(), documents, failures, fromCache: false, fetchedAt };
}

/** Validate a single declaration at the network boundary as well as at board writes. */
export function validateLlmsSource(source: unknown): asserts source is { kind: "llms-txt"; id: string } {
  // resolveSources enriches declarations with availability/reason/order metadata.
  // Validate the declaration fields strictly without asking the plain declaration
  // schema to reject those resolver-only fields.
  if (!source || typeof source !== "object") throw new Error("invalid source declaration");
  const candidate = source as Record<string, unknown>;
  const parsed = SourceDeclarationSchema.parse({
    kind: candidate.kind,
    id: candidate.id,
    ...(candidate.appliesTo === undefined ? {} : { appliesTo: candidate.appliesTo }),
    ...(candidate.priority === undefined ? {} : { priority: candidate.priority }),
  });
  if (parsed.kind !== "llms-txt") throw new Error("only llms-txt declarations can be fetched");
}
