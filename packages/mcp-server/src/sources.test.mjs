import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fetchLlmsTxt } from "../dist/index.js";

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
