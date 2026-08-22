import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SourceDeclarationSchema } from "@kanmer/core";

/** The deliberately bounded network/cache policy for project-declared llms.txt sources. */
export const LLMS_TXT_POLICY = Object.freeze({
  maxLinkedPages: 32,
  maxBytes: 2 * 1024 * 1024,
  maxDepth: 1,
  timeoutMs: 10_000,
  cacheTtlMs: 24 * 60 * 60 * 1000,
});

export interface LlmsDocument {
  url: string;
  text: string;
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
  now?: () => number;
  force?: boolean;
}

const cacheWrites = new Map<string, Promise<void>>();

function validateUrl(value: string): URL {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
    throw new Error("llms-txt source id must be an HTTPS URL without credentials or a fragment");
  }
  return parsed;
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
          typeof (document as LlmsDocument).text === "string",
      ) ||
      !Array.isArray(cache.failures) ||
      !cache.failures.every((failure) => typeof failure === "string") ||
      (cache.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(cache.sha256))
    ) {
      return null;
    }
    return {
      url: cache.url,
      fetchedAt: cache.fetchedAt,
      expiresAt: cache.expiresAt,
      etag: cache.etag,
      lastModified: cache.lastModified,
      sha256: cache.sha256,
      documents: cache.documents as LlmsDocument[],
      failures: cache.failures,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function sameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

function markdownLinks(text: string, base: URL): URL[] {
  const urls: URL[] = [];
  const seen = new Set<string>();
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(pattern)) {
    const href = match[1];
    if (!href) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }
    if (!sameOrigin(base, resolved) || resolved.protocol !== "https:" || resolved.hash) continue;
    resolved.hash = "";
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
): Promise<{ status: number; text: string; etag?: string; lastModified?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, redirect: "follow", signal: controller.signal });
    // `redirect: "follow"` is not a trust boundary: reject a final response
    // that escaped the declared origin before accepting any bytes.
    const finalUrl = response.url ? new URL(response.url) : url;
    if (!sameOrigin(url, finalUrl) || finalUrl.protocol !== "https:") {
      throw new Error(`${url} redirected outside its declared HTTPS origin`);
    }
    if (response.status === 304) {
      return { status: 304, text: "" };
    }
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType && !contentType.startsWith("text/") && contentType !== "application/json") {
      throw new Error(`${url} returned unsupported content type ${contentType}`);
    }
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxBytes) {
      throw new Error(`${url} exceeds the ${maxBytes}-byte response limit`);
    }
    if (!response.body) {
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > maxBytes) {
        throw new Error(`${url} exceeds the ${maxBytes}-byte response limit`);
      }
      return {
        status: response.status,
        text,
        etag: response.headers.get("etag") ?? undefined,
        lastModified: response.headers.get("last-modified") ?? undefined,
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
          throw new Error(`${url} exceeds the ${maxBytes}-byte response limit`);
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    const text = Buffer.concat(chunks).toString("utf8");
    return {
      status: response.status,
      text,
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function writeCache(file: string, cache: CacheFile): Promise<void> {
  const content = JSON.stringify(cache, null, 2) + "\n";
  const previous = cacheWrites.get(file);
  const write = () => writeFile(file, content, "utf8");
  const next = previous ? previous.then(write, write) : write();
  cacheWrites.set(file, next);
  try {
    await next;
  } finally {
    if (cacheWrites.get(file) === next) cacheWrites.delete(file);
  }
}

/** Fetch a declared llms.txt root and bounded same-origin direct links. */
export async function fetchLlmsTxt(options: FetchOptions): Promise<LlmsFetchResult> {
  const root = validateUrl(options.url);
  const fetchImpl = options.fetchImpl ?? fetch;
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
  let rootResponse: Awaited<ReturnType<typeof fetchText>>;
  try {
    rootResponse = await fetchText(root, fetchImpl, headers, LLMS_TXT_POLICY.timeoutMs, LLMS_TXT_POLICY.maxBytes);
  } catch (error) {
    if (cached) {
      failures.push(error instanceof Error ? error.message : String(error));
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
    const refreshed: CacheFile = {
      ...cached,
      expiresAt: new Date(nowMs + LLMS_TXT_POLICY.cacheTtlMs).toISOString(),
    };
    await mkdir(options.cacheDir, { recursive: true });
    await writeCache(cacheFile, refreshed);
    return {
      sourceUrl: cached.url,
      documents: cached.documents,
      failures: cached.failures,
      fromCache: true,
      fetchedAt: cached.fetchedAt,
    };
  }
  if (rootResponse.status === 304) {
    throw new Error(`${root} returned HTTP 304 without a cached representation`);
  }

  const documents: LlmsDocument[] = [{ url: root.toString(), text: rootResponse.text }];
  const candidates = markdownLinks(rootResponse.text, root).slice(0, LLMS_TXT_POLICY.maxLinkedPages);
  let bytes = Buffer.byteLength(rootResponse.text, "utf8");
  for (const candidate of candidates) {
    if (bytes >= LLMS_TXT_POLICY.maxBytes) {
      failures.push(`${candidate} skipped because the aggregate response limit was reached`);
      continue;
    }
    try {
      const remaining = LLMS_TXT_POLICY.maxBytes - bytes;
      const response = await fetchText(candidate, fetchImpl, {}, LLMS_TXT_POLICY.timeoutMs, remaining);
      const size = Buffer.byteLength(response.text, "utf8");
      if (bytes + size > LLMS_TXT_POLICY.maxBytes) {
        failures.push(`${candidate} skipped because the aggregate response limit was reached`);
        continue;
      }
      bytes += size;
      documents.push({ url: candidate.toString(), text: response.text });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const fetchedAt = new Date(nowMs).toISOString();
  const cache: CacheFile = {
    url: root.toString(),
    fetchedAt,
    expiresAt: new Date(nowMs + LLMS_TXT_POLICY.cacheTtlMs).toISOString(),
    etag: rootResponse.etag,
    lastModified: rootResponse.lastModified,
    sha256: createHash("sha256")
      .update(documents.map((document) => `${document.url}\n${document.text}`).join("\n"))
      .digest("hex"),
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
