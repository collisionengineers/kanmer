import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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
    const canary = "A".repeat(43);
    await assert.rejects(() => createTokenFile(partial, { write: async (_handle) => { throw new Error(canary); } }), /REMOTE_AUTH_SECRET_FILE_WRITE_FAILED/);
    await assert.rejects(() => readFile(partial), /ENOENT/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("token loading rejects non-regular, oversized, malformed, symlinked, and weak files", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kanmer-token-unsafe-"));
  try {
    const target = path.join(directory, "target");
    const created = await createTokenFile(target);
    assert.equal(JSON.stringify(created.verifier).includes((await readFile(target, "ascii")).trim()), false);

    const directoryPath = path.join(directory, "directory");
    await mkdir(directoryPath);
    await assert.rejects(() => loadTokenFile(directoryPath), /REMOTE_AUTH_SECRET_FILE_UNSAFE/);

    const oversized = path.join(directory, "oversized");
    await writeFile(oversized, `${"A".repeat(129)}\n`, { mode: 0o600 });
    await assert.rejects(() => loadTokenFile(oversized), /REMOTE_AUTH_SECRET_FILE_UNSAFE/);

    const malformed = path.join(directory, "malformed");
    await writeFile(malformed, "not a token\n", { mode: 0o600 });
    await assert.rejects(() => loadTokenFile(malformed), /REMOTE_AUTH_INVALID_TOKEN/);

    if (process.platform !== "win32") {
      await chmod(target, 0o644);
      await assert.rejects(() => loadTokenFile(target), /REMOTE_AUTH_SECRET_FILE_UNSAFE/);
      await chmod(target, 0o600);
      const link = path.join(directory, "link");
      await symlink(target, link);
      await assert.rejects(() => loadTokenFile(link), /REMOTE_AUTH_SECRET_FILE_UNSAFE/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
