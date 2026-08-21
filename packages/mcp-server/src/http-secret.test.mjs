import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createTokenFile, loadTokenFile } from "../dist/http.js";

test("token files are exclusive, readable once, and cleaned after failed writes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-token-test-"));
  try {
    const target = path.join(directory, "token with spaces");
    const created = await createTokenFile(target);
    assert.deepEqual(await loadTokenFile(target), created.verifier);
    await assert.rejects(() => createTokenFile(target), /EEXIST/);
    const partial = path.join(directory, "partial");
    await assert.rejects(() => createTokenFile(partial, { write: async (_handle, token) => { throw new Error(token); } }), /REMOTE_AUTH_SECRET_FILE_WRITE_FAILED/);
    await assert.rejects(() => readFile(partial), /ENOENT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
