import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fetchLlmsTxt, LLMS_TXT_POLICY, validateLlmsSource } from "../dist/index.js";

function fakeResponse(body, headers = {}, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/plain", ...headers } });
}

test("llms fetch follows only bounded same-origin direct markdown links", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url) === "https://docs.example.test/llms.txt") {
      return fakeResponse("# Docs\n[guide](guide.md)\n[external](https://other.example.test/nope)", { etag: '"root-1"' });
    }
    if (String(url) === "https://docs.example.test/guide.md") return fakeResponse("# Guide");
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 });
    assert.equal(result.fromCache, false);
    assert.deepEqual(result.documents.map((document) => document.url), [
      "https://docs.example.test/llms.txt",
      "https://docs.example.test/guide.md",
    ]);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(calls, ["https://docs.example.test/llms.txt", "https://docs.example.test/guide.md"]);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("fresh cache avoids network and stale cache revalidates with validators", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls++;
    assert.equal(init?.headers?.["if-none-match"], '"root-1"');
    return fakeResponse("", {}, 304);
  };
  const rootFetch = async () => fakeResponse("# Docs", { etag: '"root-1"' });
  try {
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: rootFetch, now: () => 1_000 });
    const fresh = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 2_000 });
    assert.equal(fresh.fromCache, true);
    assert.equal(calls, 0);
    const revalidated = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 86_401_000 });
    assert.equal(revalidated.fromCache, true);
    assert.equal(calls, 1);
    const cacheFile = (await readdir(cacheDir))[0];
    assert.match(JSON.parse(await readFile(path.join(cacheDir, cacheFile), "utf8")).sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("invalid or unbounded source URLs fail before network access", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    await assert.rejects(
      () => fetchLlmsTxt({ url: "http://docs.example.test/llms.txt", cacheDir, fetchImpl: async () => { throw new Error("network"); } }),
      /HTTPS URL/,
    );
    await assert.rejects(
      () => fetchLlmsTxt({ url: "https://127.0.0.1/llms.txt", cacheDir, fetchImpl: async () => { throw new Error("network"); } }),
      /private or local destination/,
    );
    await assert.rejects(
      () => fetchLlmsTxt({ url: "https://docs.example.test/llms.txt?token=secret", cacheDir, fetchImpl: async () => { throw new Error("network"); } }),
      /query/,
    );
    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir,
        fetchImpl: async () => { throw new Error("network"); },
        lookupImpl: async () => ["10.0.0.8"],
      }),
      /private or local destination/,
    );
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("fails closed for non-global DNS destinations, including mapped IPv4", async () => {
  const addresses = [
    "0.0.0.1",
    "100.64.0.1",
    "192.0.0.1",
    "192.0.2.1",
    "192.31.196.1",
    "192.52.193.1",
    "192.88.99.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "::ffff:c000:0201",
    "::ffff:192.0.2.1",
    "100::1",
    "2001:2::1",
    "2001:10::1",
    "2001:1f::1",
    "2001:20::1",
    "2001:2f::1",
    "2001:db8::1",
    "3fff::1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
  ];
  for (const address of addresses) {
    const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-dns-"));
    try {
      await assert.rejects(
        () => fetchLlmsTxt({
          url: "https://docs.example.test/llms.txt",
          cacheDir,
          fetchImpl: async () => fakeResponse("# should not fetch"),
          lookupImpl: async () => [address],
        }),
        /private or local destination/,
        address,
      );
    } finally {
      await rm(cacheDir, { recursive: true, force: true });
    }
  }
  const publicCache = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-dns-public-"));
  try {
    const result = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir: publicCache,
      fetchImpl: async () => fakeResponse("# public"),
      lookupImpl: async () => ["93.184.216.34"],
    });
    assert.equal(result.documents[0].text, "# public");
  } finally {
    await rm(publicCache, { recursive: true, force: true });
  }
});

test("validates each redirect hop and resolves relative links from the final URL", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    let calls = 0;
    const fetchImpl = async (url) => {
      calls++;
      if (String(url) === "https://docs.example.test/llms.txt") {
        return { status: 302, ok: false, url: String(url), headers: new Headers({ location: "/nested/llms.txt" }) };
      }
      if (String(url) === "https://docs.example.test/nested/llms.txt") {
        return { status: 200, ok: true, url: String(url), headers: new Headers({ "content-type": "text/plain" }), text: async () => "[guide](guide.md)" };
      }
      return fakeResponse("# Guide");
    };
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl });
    assert.deepEqual(result.documents.map((document) => document.url), [
      "https://docs.example.test/nested/llms.txt",
      "https://docs.example.test/nested/guide.md",
    ]);
    assert.equal(calls, 3);

    const redirectCache = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir: redirectCache,
        fetchImpl: async (url) => String(url) === "https://docs.example.test/llms.txt"
          ? { status: 302, ok: false, url: String(url), headers: new Headers({ location: "https://evil.example.test/nope" }) }
          : fakeResponse("never"),
      }),
      /redirected outside/,
    );

    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir: redirectCache,
        fetchImpl: async (url) => String(url) === "https://docs.example.test/llms.txt"
          ? { status: 302, ok: false, url: String(url), headers: new Headers({ location: "/nested/llms.txt?token=secret" }) }
          : fakeResponse("never"),
      }),
      /redirected outside/,
    );
    await rm(redirectCache, { recursive: true, force: true });
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("filters images, clears fragments, and rejects credential-bearing linked queries", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  const calls = [];
  try {
    const fetchImpl = async (url) => {
      calls.push(String(url));
      if (calls.length === 1) return fakeResponse("![image](image.png)\n[guide](guide.md#section)\n[secret](guide.md?token=secret)");
      return fakeResponse("# Guide");
    };
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl });
    assert.deepEqual(result.documents.map((document) => document.url), [
      "https://docs.example.test/llms.txt",
      "https://docs.example.test/guide.md",
    ]);
    assert.deepEqual(calls, ["https://docs.example.test/llms.txt", "https://docs.example.test/guide.md"]);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("requires an explicit supported content type", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir,
        fetchImpl: async () => ({ status: 200, ok: true, url: "https://docs.example.test/llms.txt", headers: new Headers(), text: async () => "# Docs" }),
      }),
      /missing content type/,
    );
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("root 304 revalidates cached linked documents and keeps cache digest", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    const first = async (url) => {
      if (String(url).endsWith("llms.txt")) return fakeResponse("[guide](guide.md)", { etag: '"root-1"' });
      return fakeResponse("old", { etag: '"guide-1"' });
    };
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: first, now: () => 1_000 });
    const calls = [];
    const second = async (url, init) => {
      calls.push(String(url));
      if (String(url).endsWith("llms.txt")) return { status: 304, ok: false, url: String(url), headers: new Headers(), text: async () => "" };
      assert.equal(init?.headers?.["if-none-match"], '"guide-1"');
      return fakeResponse("new", { etag: '"guide-2"' });
    };
    const refreshed = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: second, force: true, now: () => 86_401_000 });
    assert.deepEqual(calls, ["https://docs.example.test/llms.txt", "https://docs.example.test/guide.md"]);
    assert.equal(refreshed.documents[1].text, "new");
    const cacheFile = (await readdir(cacheDir)).find((name) => name.endsWith(".json"));
    assert.match(JSON.parse(await readFile(path.join(cacheDir, cacheFile), "utf8")).sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("ignores malformed or tampered cache JSON and rebuilds it atomically", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      return fakeResponse("# Docs");
    };
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 });
    const cacheFile = (await readdir(cacheDir)).find((name) => name.endsWith(".json"));
    await (await import("node:fs/promises")).writeFile(path.join(cacheDir, cacheFile), "{not-json", "utf8");
    const rebuilt = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 2_000 });
    assert.equal(rebuilt.fromCache, false);
    assert.equal(calls, 2);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("final redirects cannot leave the declared origin and concurrent cache writes stay valid", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    const redirected = async () => ({
      status: 200,
      ok: true,
      url: "https://evil.example.test/llms.txt",
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "# should not be trusted",
    });
    await assert.rejects(
      () => fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: redirected }),
      /redirected outside its declared HTTPS origin/,
    );

    const fetchImpl = async () => fakeResponse("# Docs");
    await Promise.all([
      fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 2_000 }),
      fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 3_000 }),
    ]);
    const files = await readdir(cacheDir);
    assert.equal(files.length, 1);
    const cache = JSON.parse(await readFile(path.join(cacheDir, files[0]), "utf8"));
    assert.equal(cache.url, "https://docs.example.test/llms.txt");
    assert.equal(Array.isArray(cache.documents), true);
    assert.match(cache.sha256, /^[a-f0-9]{64}$/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("a validator response without a cached representation is surfaced", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir,
        fetchImpl: async () => ({
          status: 304,
          ok: false,
          url: "https://docs.example.test/llms.txt",
          headers: new Headers(),
          text: async () => "",
        }),
      }),
      /304 without a cached representation/,
    );
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("fetch validation accepts resolver-enriched llms declarations", () => {
  assert.doesNotThrow(() => validateLlmsSource({
    kind: "llms-txt",
    id: "https://docs.example.test/llms.txt",
    availability: "available",
    reason: "declared HTTPS documentation manifest",
    declarationOrder: 0,
  }));
});

test("aggregate byte budget is enforced while reading linked responses", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
  try {
    let linkedReads = 0;
    const fetchImpl = async (url) => {
      if (String(url) === "https://docs.example.test/llms.txt") {
        return fakeResponse("# Docs\n[large](large.md)");
      }
      linkedReads++;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(LLMS_TXT_POLICY.maxBytes));
          controller.enqueue(new Uint8Array(LLMS_TXT_POLICY.maxBytes));
          controller.close();
        },
      });
      return new Response(stream, { headers: { "content-type": "text/plain" } });
    };
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 });
    assert.equal(linkedReads, 1);
    assert.equal(result.documents.length, 1);
    assert.match(result.failures[0], /exceeds the .*byte response limit/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
