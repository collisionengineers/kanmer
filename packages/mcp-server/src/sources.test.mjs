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
    "192.88.99.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "::ffff:c000:0201",
    "::ffff:192.0.2.1",
    "100::1",
    "2001:2::1",
    "64:ff9b:1::1",
    "64:ff9b::a00:1",
    "100:0:0:1::1",
    "5f00::1",
    "5fff::1",
    "2001:10::1",
    "2001:1f::1",
    "2001:db8::1",
    "3fff::1",
    "3fff:0fff::1",
    "fc00::1",
    "fe80::1",
    "fec0::1",
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
    for (const address of [
      "93.184.216.34",
      "192.0.0.9",
      "192.0.0.10",
      "192.31.196.1",
      "192.52.193.1",
      "192.175.48.1",
      "3fff:1000::1",
      "2001:20::1",
      "2001:2f::1",
      "64:ff9b::5db8:d822",
    ]) {
      const result = await fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir: path.join(publicCache, address.replaceAll(":", "-")),
        fetchImpl: async () => fakeResponse("# public"),
        lookupImpl: async () => [address],
      });
      assert.equal(result.documents[0].text, "# public", address);
    }
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

test("preserves manifest validators across same-origin redirects", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-redirect-validator-"));
  let round = 0;
  const finalHeaders = [];
  try {
    const fetchImpl = async (url, init) => {
      const value = String(url);
      if (value === "https://docs.example.test/llms.txt") {
        round++;
        return { status: 302, ok: false, url: value, headers: new Headers({ location: "/nested/llms.txt" }) };
      }
      assert.equal(value, "https://docs.example.test/nested/llms.txt");
      finalHeaders.push(init?.headers);
      if (round === 1) return fakeResponse("# Docs", { etag: '"manifest-1"' });
      assert.equal(init?.headers?.["if-none-match"], '"manifest-1"');
      return { status: 304, ok: false, url: value, headers: new Headers() };
    };
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 });
    const revalidated = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      fetchImpl,
      force: true,
      now: () => 86_401_000,
    });
    assert.equal(revalidated.fromCache, true);
    assert.equal(finalHeaders.length, 2);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("rechecks DNS destinations for every redirect and linked request", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-dns-hop-"));
  const fetches = [];
  let lookups = 0;
  try {
    const fetchImpl = async (url) => {
      fetches.push(String(url));
      if (String(url) === "https://docs.example.test/llms.txt") {
        return { status: 302, ok: false, url: String(url), headers: new Headers({ location: "/nested/llms.txt" }) };
      }
      if (String(url) === "https://docs.example.test/nested/llms.txt") return fakeResponse("[guide](guide.md)");
      return fakeResponse("# Guide");
    };
    const result = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      fetchImpl,
      lookupImpl: async (hostname) => {
        lookups++;
        assert.equal(hostname, "docs.example.test");
        return ["93.184.216.34"];
      },
    });
    assert.deepEqual(result.documents.map((document) => document.url), [
      "https://docs.example.test/nested/llms.txt",
      "https://docs.example.test/nested/guide.md",
    ]);
    assert.deepEqual(fetches, [
      "https://docs.example.test/llms.txt",
      "https://docs.example.test/nested/llms.txt",
      "https://docs.example.test/nested/guide.md",
    ]);
    assert.equal(lookups, 6);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("passes the validated DNS addresses to the outbound request seam", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-bound-"));
  const requests = [];
  try {
    const result = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      lookupImpl: async () => ["93.184.216.34"],
      requestImpl: async (url, init, addresses) => {
        requests.push({ url: String(url), addresses, encoding: init.headers?.["accept-encoding"] });
        return fakeResponse("# Docs");
      },
    });
    assert.equal(result.documents[0].text, "# Docs");
    assert.deepEqual(requests, [{ url: "https://docs.example.test/llms.txt", addresses: ["93.184.216.34"], encoding: "identity" }]);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("bounds DNS resolution with the same request deadline", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-dns-timeout-"));
  try {
    await assert.rejects(
      () => fetchLlmsTxt({
        url: "https://docs.example.test/llms.txt",
        cacheDir,
        timeoutMs: 25,
        fetchImpl: async () => fakeResponse("unexpected"),
        lookupImpl: async () => new Promise(() => {}),
      }),
      /request timed out/,
    );
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

test("stops collecting linked pages at the hard page budget", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-link-cap-"));
  const links = Array.from({ length: LLMS_TXT_POLICY.maxLinkedPages + 100 }, (_, index) => `[guide-${index}](guide-${index}.md)`).join("\n");
  const calls = [];
  try {
    const fetchImpl = async (url) => {
      calls.push(String(url));
      return String(url).endsWith("llms.txt") ? fakeResponse(links) : fakeResponse("# Guide");
    };
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl });
    assert.equal(calls.length, LLMS_TXT_POLICY.maxLinkedPages + 1);
    assert.equal(result.documents.length, LLMS_TXT_POLICY.maxLinkedPages + 1);
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

test("cancels bodies on every early-abandon response path", async () => {
  const scenarios = [
    {
      name: "redirect",
      response: () => ({ status: 302, headers: { location: "/next" } }),
      expected: /redirect limit|without Location/,
    },
    {
      name: "http-error",
      response: () => ({ status: 503, headers: { "content-type": "text/plain" } }),
      expected: /HTTP 503/,
    },
    {
      name: "content-type",
      response: () => ({ status: 200, headers: { "content-type": "application/octet-stream" } }),
      expected: /unsupported/,
    },
    {
      name: "content-length",
      response: () => ({ status: 200, headers: { "content-type": "text/plain", "content-length": String(LLMS_TXT_POLICY.maxBytes + 1) } }),
      expected: /exceeds the .*byte response limit/,
    },
  ];
  for (const scenario of scenarios) {
    const cacheDir = await mkdtemp(path.join(os.tmpdir(), `kanmer-sources-cancel-${scenario.name}-`));
    let cancelled = false;
    try {
      const fetchImpl = async () => {
        const details = scenario.response();
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1]));
          },
          cancel() {
            cancelled = true;
          },
        });
        return new Response(body, { status: details.status, headers: details.headers });
      };
      await assert.rejects(
        () => fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl }),
        scenario.expected,
      );
      assert.equal(cancelled, true, scenario.name);
    } finally {
      await rm(cacheDir, { recursive: true, force: true });
    }
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

test("surfaces an uncached linked 304 during a fresh root fetch", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-linked-304-"));
  try {
    const result = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      fetchImpl: async (url) => String(url).endsWith("llms.txt")
        ? fakeResponse("[guide](guide.md)")
        : { status: 304, ok: false, url: String(url), headers: new Headers() },
    });
    assert.deepEqual(result.documents.map((document) => document.url), ["https://docs.example.test/llms.txt"]);
    assert.match(result.failures.join("\n"), /guide\.md returned HTTP 304 without a cached representation/);
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

test("charges partial linked read failures to the aggregate byte budget", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-partial-budget-"));
  const rootText = "# Docs\n[a](a.md)\n[b](b.md)";
  const partialBytes = LLMS_TXT_POLICY.maxBytes - Buffer.byteLength(rootText, "utf8");
  const calls = [];
  try {
    const fetchImpl = async (url) => {
      const value = String(url);
      calls.push(value);
      if (value.endsWith("llms.txt")) return fakeResponse(rootText);
      if (value.endsWith("a.md")) {
        let delivered = false;
        const stream = new ReadableStream({
          pull(controller) {
            if (delivered) {
              controller.error(new Error("connection reset"));
              return;
            }
            delivered = true;
            controller.enqueue(new Uint8Array(partialBytes));
          },
        });
        return new Response(stream, { headers: { "content-type": "text/plain" } });
      }
      return fakeResponse("# should not be fetched");
    };
    const result = await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl });
    assert.deepEqual(calls, ["https://docs.example.test/llms.txt", "https://docs.example.test/a.md"]);
    assert.match(result.failures.join("\n"), /response read failed after/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("serializes concurrent refresh transactions and lets the second caller reuse the fresh cache", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-refresh-lock-"));
  let calls = 0;
  let active = 0;
  let maximumActive = 0;
  try {
    const fetchImpl = async () => {
      calls++;
      active++;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2_200));
      active--;
      return fakeResponse("# Docs", { etag: '"root-1"' });
    };
    const results = await Promise.all([
      fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 }),
      fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl, now: () => 1_000 }),
    ]);
    assert.equal(maximumActive, 1);
    assert.equal(calls, 1);
    assert.deepEqual(results.map((result) => result.documents[0].text), ["# Docs", "# Docs"]);
    assert.equal(results.filter((result) => result.fromCache).length, 1);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("charges retained 304 linked bytes before accepting a changed page", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-304-budget-"));
  const largeA = "a".repeat(1_500_000);
  const oldB = "b".repeat(500_000);
  const newB = "c".repeat(700_000);
  try {
    const first = async (url) => {
      if (String(url).endsWith("llms.txt")) return fakeResponse("[a](a.md)\n[b](b.md)", { etag: '"root-1"' });
      if (String(url).endsWith("a.md")) return fakeResponse(largeA, { etag: '"a-1"' });
      return fakeResponse(oldB, { etag: '"b-1"' });
    };
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: first, now: () => 1_000 });
    const second = async (url) => {
      if (String(url).endsWith("llms.txt")) return { status: 304, ok: false, url: String(url), headers: new Headers(), text: async () => "" };
      if (String(url).endsWith("a.md")) return { status: 304, ok: false, url: String(url), headers: new Headers(), text: async () => "" };
      return fakeResponse(newB, { etag: '"b-2"' });
    };
    const refreshed = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      fetchImpl: second,
      force: true,
      now: () => 86_401_000,
    });
    const totalBytes = refreshed.documents.reduce((sum, document) => sum + Buffer.byteLength(document.text, "utf8"), 0);
    assert.ok(totalBytes <= LLMS_TXT_POLICY.maxBytes);
    assert.deepEqual(refreshed.documents.map((document) => document.url), [
      "https://docs.example.test/llms.txt",
      "https://docs.example.test/a.md",
    ]);
    assert.match(refreshed.failures.join("\n"), /aggregate response limit/);
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test("retries a linked page that was missing from the prior cached document set", async () => {
  const cacheDir = await mkdtemp(path.join(os.tmpdir(), "kanmer-sources-missing-link-"));
  let recovered = false;
  try {
    const first = async (url) => {
      if (String(url).endsWith("llms.txt")) return fakeResponse("[missing](missing.md)", { etag: '"root-1"' });
      throw new Error("linked page unavailable");
    };
    await fetchLlmsTxt({ url: "https://docs.example.test/llms.txt", cacheDir, fetchImpl: first, now: () => 1_000 });
    const second = async (url) => {
      if (String(url).endsWith("llms.txt")) return { status: 304, ok: false, url: String(url), headers: new Headers(), text: async () => "" };
      recovered = true;
      return fakeResponse("# Recovered", { etag: '"missing-1"' });
    };
    const refreshed = await fetchLlmsTxt({
      url: "https://docs.example.test/llms.txt",
      cacheDir,
      fetchImpl: second,
      force: true,
      now: () => 86_401_000,
    });
    assert.equal(recovered, true);
    assert.deepEqual(refreshed.documents.map((document) => document.url), [
      "https://docs.example.test/llms.txt",
      "https://docs.example.test/missing.md",
    ]);
    assert.equal(refreshed.documents[1].text, "# Recovered");
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});
