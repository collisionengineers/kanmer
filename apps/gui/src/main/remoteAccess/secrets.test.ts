import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("electron", () => ({ safeStorage: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "dpapi", encryptString: (value: string) => Buffer.from(value), decryptString: (value: Buffer) => value.toString("utf8") } }));
import { getSecret, putSecret, secureBackend } from "./secrets.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const token = "A".repeat(43);
function backend(selected = "dpapi") {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => selected,
    encryptString: (value: string) => Buffer.from(`encrypted:${Buffer.from(value, "utf8").toString("base64")}`, "utf8"),
    decryptString: (value: Buffer) => Buffer.from(value.toString("utf8").replace(/^encrypted:/, ""), "base64").toString("utf8"),
  };
}

describe("remote access secret storage", () => {
  it("fails closed for unavailable or plaintext OS backends", () => {
    expect(() => secureBackend(backend("basic_text"))).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
    expect(() => secureBackend({ ...backend(), isEncryptionAvailable: () => false })).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
  });

  it("accepts Electron's Linux backend names", () => {
    expect(secureBackend(backend("gnome_libsecret"))).toBe("gnome_libsecret");
    expect(secureBackend(backend("kwallet5"))).toBe("kwallet5");
    expect(secureBackend(backend("kwallet6"))).toBe("kwallet6");
  });

  it("stores encrypted bytes and decrypts only through the approved backend", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-remote-secret-")); roots.push(root);
    const selected = backend();
    const saved = await putSecret(root, token, selected);
    const raw = await readFile(join(root, "remote-access-secrets", `${saved.id}.bin`), "utf8");
    expect(raw).toContain("encrypted:");
    expect(raw).not.toContain(token);
    expect(await getSecret(root, saved.id, selected)).toBe(token);
  });
});
