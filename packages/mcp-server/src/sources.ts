import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
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
  requestImpl?: BoundFetch;
  timeoutMs?: number;
  now?: () => number;
  force?: boolean;
}

type BoundFetch = (url: URL, init: RequestInit, addresses: string[]) => Promise<Response>;

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

class ResponseReadError extends Error {
  readonly consumedBytes: number;

  constructor(url: URL, cause: unknown, consumedBytes: number) {
    super(`${url} response read failed after ${consumedBytes} bytes: ${failureText(cause)}`);
    this.name = "ResponseReadError";
    this.consumedBytes = consumedBytes;
    this.cause = cause;
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

function isNonGlobalIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [a, b, c, d] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0 && d !== 9 && d !== 10) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && b >= 18 && b <= 19) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function parseIpv6Groups(value: string): number[] | null {
  let normalized = value.toLowerCase();
  const lastColon = normalized.lastIndexOf(":");
  const dotted = normalized.slice(lastColon + 1);
  if (dotted.includes(".")) {
    const octets = dotted.split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    normalized = `${normalized.slice(0, lastColon + 1)}${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":").filter(Boolean).map((group) => Number.parseInt(group, 16)) : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":").filter(Boolean).map((group) => Number.parseInt(group, 16)) : [];
  if ([...left, ...right].some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function isPrivateAddress(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^[\[]|[\]]$/g, "");
  const version = isIP(normalized);
  if (version === 4) return isNonGlobalIpv4(normalized);
  if (version !== 6) return false;
  const groups = parseIpv6Groups(normalized);
  if (!groups) return true;
  const [first, second, third, fourth, fifth, sixth, seventh, eighth] = groups;
  if (first === 0 && second === 0 && third === 0 && fourth === 0 && fifth === 0 && sixth === 0xffff) {
    const mapped = `${(seventh! >> 8) & 0xff}.${seventh! & 0xff}.${(eighth! >> 8) & 0xff}.${eighth! & 0xff}`;
    return isNonGlobalIpv4(mapped);
  }
  if (first === 0x0064 && second === 0xff9b && third === 0 && fourth === 0 && fifth === 0 && sixth === 0) {
    const embedded = `${(seventh! >> 8) & 0xff}.${seventh! & 0xff}.${(eighth! >> 8) & 0xff}.${eighth! & 0xff}`;
    return isNonGlobalIpv4(embedded);
  }
  return (
    first === 0 ||
    (first === 0x100 && second === 0 && third === 0 && fourth === 0) ||
    (first === 0x2001 && second === 0x0002 && third === 0) ||
    (first === 0x0064 && second === 0xff9b && third === 0x0001) ||
    (first === 0x0100 && second === 0 && third === 0 && fourth === 0x0001) ||
    (first >= 0x5f00 && first <= 0x5fff) ||
    (first === 0x2001 && (second! & 0xfff0) === 0x0010) ||
    (first === 0x2001 && second === 0x0db8) ||
    (first >= 0xfc00 && first <= 0xfdff) ||
    (first >= 0xfe80 && first <= 0xfebf) ||
    (first & 0xffc0) === 0xfec0 ||
    first >= 0xff00 ||
    // 3fff::/20 is 3fff:0000:: through 3fff:0fff::; checking only the
    // first group would incorrectly reject the public 3fff:1000::/16 tail.
    (first === 0x3fff && (second! & 0xf000) === 0)
  );
}

/** Reject private destinations, including hostnames resolving to them. */
async function assertPublicDestination(
  url: URL,
  lookupImpl?: (hostname: string) => Promise<string[]>,
  signal?: AbortSignal,
): Promise<string[]> {
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
      addresses = await withDeadline(lookupImpl(hostname), signal);
    } catch {
      if (signal?.aborted) throw new Error(`${url} request timed out`);
      throw new Error(`${url} destination could not be resolved`);
    }
    if (addresses.length === 0 || addresses.some((address) => isPrivateAddress(address))) {
      throw new Error(`${url} targets a private or local destination`);
    }
    return addresses;
  }
  return [hostname];
}

async function withDeadline<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) throw new Error("request timed out");
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("request timed out"));
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Issue the production request with the exact addresses accepted by the
 * preflight. Native fetch performs its own DNS lookup, so it cannot be used at
 * this boundary without reopening the rebinding gap.
 */
async function pinnedFetch(url: URL, init: RequestInit, addresses: string[]): Promise<Response> {
  const address = addresses[0];
  if (!address) throw new Error(`${url} destination could not be resolved`);
  const headers = new Headers(init.headers);
  // The raw https.request seam does not transparently decode compressed
  // responses like fetch does. Keep the byte limit and UTF-8 conversion about
  // the representation we actually receive.
  headers.set("accept-encoding", "identity");
  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: url.hostname,
        port: url.port || "443",
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: Object.fromEntries(headers.entries()),
        servername: url.hostname,
        lookup: (_hostname, _options, callback) => callback(null, address, isIP(address)),
      },
      (response) => {
        settled = true;
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) responseHeaders.set(key, value.join(", "));
          else if (value !== undefined) responseHeaders.set(key, value);
        }
        const body = Readable.toWeb(response) as ReadableStream<Uint8Array>;
        resolve(new Response(body, { status: response.statusCode ?? 599, headers: responseHeaders }));
      },
    );
    const onAbort = () => request.destroy(new Error("request timed out"));
    if (init.signal) {
      if (init.signal.aborted) onAbort();
      else init.signal.addEventListener("abort", onAbort, { once: true });
    }
    request.once("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    request.end();
  });
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

function markdownLinks(text: string, base: URL, maxLinks: number = LLMS_TXT_POLICY.maxLinkedPages): URL[] {
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
      if (urls.length >= maxLinks) break;
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
  boundFetch?: BoundFetch,
  conditionalUrl?: string,
): Promise<FetchTextResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const origin = new URL(url);
  let current = new URL(url);
  let redirects = 0;
  const conditionalTarget = conditionalUrl ?? url.toString();
  const conditionalHeaders = { ...headers, "accept-encoding": "identity" };
  try {
    while (true) {
      const addresses = await assertPublicDestination(current, lookupImpl, controller.signal);
      const requestHeaders = current.toString() === conditionalTarget
        ? conditionalHeaders
        : { "accept-encoding": "identity" };
      const requestInit = { headers: requestHeaders, redirect: "manual" as const, signal: controller.signal };
      const response = boundFetch
        ? await boundFetch(current, requestInit, addresses)
        : await fetchImpl(current, requestInit);
      const responseUrl = response.url ? new URL(response.url) : current;
      try {
        assertSafeFetchTarget(origin, responseUrl);
        await assertPublicDestination(responseUrl, lookupImpl, controller.signal);
      } catch (error) {
        await response.body?.cancel();
        throw error;
      }
      if (response.status === 304) {
        await response.body?.cancel();
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
          await response.body?.cancel();
          throw new Error(`${url} exceeded the redirect limit or returned a redirect without Location`);
        }
        await response.body?.cancel();
        const next = new URL(location, current);
        assertSafeFetchTarget(origin, next);
        current = next;
        redirects++;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`${url} returned HTTP ${response.status}`);
      }
      const rawContentType = response.headers.get("content-type");
      const contentType = rawContentType?.split(";", 1)[0]?.trim().toLowerCase();
      if (!contentType || (!contentType.startsWith("text/") && contentType !== "application/json")) {
        await response.body?.cancel();
        throw new Error(`${url} returned unsupported or missing content type`);
      }
      const length = Number(response.headers.get("content-length"));
      if (Number.isFinite(length) && length > maxBytes) {
        await response.body?.cancel();
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
      } catch (error) {
        if (error instanceof ResponseTooLargeError) throw error;
        try {
          await reader.cancel(error);
        } catch (cancelError) {
          throw new ResponseReadError(url, new AggregateError([error, cancelError], "response cancellation failed"), bytes);
        }
        throw new ResponseReadError(url, error, bytes);
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
  await writeFileAtomic(file, content);
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
  return error && typeof error === "object" && "consumedBytes" in error && typeof error.consumedBytes === "number"
    ? error.consumedBytes
    : 0;
}

async function revalidateLinkedDocuments(
  cached: CacheFile,
  fetchImpl: typeof fetch,
  failures: string[],
  lookupImpl?: (hostname: string) => Promise<string[]>,
  timeoutMs: number = LLMS_TXT_POLICY.timeoutMs,
  boundFetch?: BoundFetch,
): Promise<LlmsDocument[]> {
  const root = cached.documents[0];
  if (!root) return [];
  const documents: LlmsDocument[] = [root];
  let bytes = Buffer.byteLength(root.text, "utf8");
  const cachedByUrl = new Map(cached.documents.slice(1).map((document) => [document.url, document]));
  const candidates = markdownLinks(root.text, new URL(root.url));
  for (const candidate of candidates) {
    const cachedDocument = cachedByUrl.get(candidate.toString());
    const requestHeaders: Record<string, string> = {};
    if (cachedDocument?.etag) requestHeaders["if-none-match"] = cachedDocument.etag;
    if (cachedDocument?.lastModified) requestHeaders["if-modified-since"] = cachedDocument.lastModified;
    try {
      const cachedBytes = cachedDocument ? Buffer.byteLength(cachedDocument.text, "utf8") : 0;
      if (cachedDocument && bytes + cachedBytes > LLMS_TXT_POLICY.maxBytes) {
        failures.push(`${candidate} skipped because the aggregate response limit was reached`);
        continue;
      }
      if (bytes >= LLMS_TXT_POLICY.maxBytes) {
        failures.push(`${candidate} skipped because the aggregate response limit was reached`);
        continue;
      }
      const response = await fetchText(
        candidate,
        fetchImpl,
        requestHeaders,
        timeoutMs,
        LLMS_TXT_POLICY.maxBytes - bytes,
        lookupImpl,
        boundFetch,
        cachedDocument?.url,
      );
      if (response.status === 304) {
        if (!cachedDocument) {
          failures.push(`${candidate} returned HTTP 304 without a cached representation`);
          continue;
        }
        bytes += cachedBytes;
        documents.push(cachedDocument);
      } else {
        bytes += response.bytes;
        documents.push(asDocument(response));
      }
    } catch (error) {
      bytes += consumedBytes(error);
      failures.push(failureText(error));
      if (cachedDocument) {
        const cachedBytes = Buffer.byteLength(cachedDocument.text, "utf8");
        if (bytes + cachedBytes <= LLMS_TXT_POLICY.maxBytes) {
          bytes += cachedBytes;
          documents.push(cachedDocument);
        } else {
          failures.push(`${candidate} stale cache skipped because the aggregate response limit was reached`);
        }
      }
    }
  }
  return documents;
}

const activeRefreshes = new Map<string, Promise<LlmsFetchResult>>();

/** Fetch a declared llms.txt root and bounded same-origin direct links. */
export async function fetchLlmsTxt(options: FetchOptions): Promise<LlmsFetchResult> {
  const root = canonicalHttpsUrl(options.url);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? LLMS_TXT_POLICY.timeoutMs;
  const boundFetch = options.requestImpl ?? (options.fetchImpl ? undefined : pinnedFetch);
  const lookupImpl = options.lookupImpl ?? (fetchImpl === fetch
    ? async (hostname: string) => (await dnsLookup(hostname, { all: true, verbatim: true })).map(({ address }) => address)
    : undefined);
  const now = options.now ?? Date.now;
  const cacheFile = cachePath(options.cacheDir, root.toString());
  const active = activeRefreshes.get(cacheFile);
  if (active) {
    const result = await active;
    if (!options.force) return result.fromCache ? result : { ...result, fromCache: true };
    return fetchLlmsTxt(options);
  }
  const refresh = withExclusiveFileLock(`${cacheFile}.lock`, async () => {
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
      rootResponse = await fetchText(
        root,
        fetchImpl,
        headers,
        timeoutMs,
        LLMS_TXT_POLICY.maxBytes,
        lookupImpl,
        boundFetch,
        cached?.documents[0]?.url,
      );
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
      const documents = await revalidateLinkedDocuments(cached, fetchImpl, failures, lookupImpl, timeoutMs, boundFetch);
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
    const candidates = markdownLinks(rootResponse.text, new URL(rootResponse.url));
    let bytes = rootResponse.bytes;
    for (const candidate of candidates) {
      if (bytes >= LLMS_TXT_POLICY.maxBytes) {
        failures.push(`${candidate} skipped because the aggregate response limit was reached`);
        continue;
      }
      try {
        const remaining = LLMS_TXT_POLICY.maxBytes - bytes;
        const response = await fetchText(candidate, fetchImpl, {}, timeoutMs, remaining, lookupImpl, boundFetch);
        if (response.status === 304) {
          failures.push(`${candidate} returned HTTP 304 without a cached representation`);
          continue;
        }
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
  });
  activeRefreshes.set(cacheFile, refresh);
  try {
    return await refresh;
  } finally {
    if (activeRefreshes.get(cacheFile) === refresh) activeRefreshes.delete(cacheFile);
  }
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
