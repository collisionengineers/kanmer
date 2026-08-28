import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("electron", () => ({ safeStorage: { isEncryptionAvailable: () => true, encryptString: (value: string) => Buffer.from(value), decryptString: (value: Buffer) => value.toString("utf8") } }));
import { getSecret, putSecret, secureBackend } from "./secrets.js";
import { removeTreeWithRetry } from "@kanmer/core";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => removeTreeWithRetry(root))); });

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
    expect(() => secureBackend(backend("basic_text"), "linux")).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
    expect(() => secureBackend(backend("unknown"), "linux")).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
    expect(() => secureBackend({ ...backend(), isEncryptionAvailable: () => false }, "win32")).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
  });

  it("accepts Electron's Linux backend names", () => {
    expect(secureBackend(backend("gnome_libsecret"), "linux")).toBe("gnome_libsecret");
    expect(secureBackend(backend("kwallet5"), "linux")).toBe("kwallet5");
    expect(secureBackend(backend("kwallet6"), "linux")).toBe("kwallet6");
    expect(secureBackend(backend("kwallet7"), "linux")).toBe("kwallet7");
    expect(() => secureBackend(backend("kwallet-untrusted"), "linux")).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
  });

  it("uses the documented platform backend without calling the Linux-only selector", () => {
    const selected = backend();
    const selector = vi.spyOn(selected, "getSelectedStorageBackend");
    expect(secureBackend(selected, "win32")).toBe("dpapi");
    expect(secureBackend(selected, "darwin")).toBe("keychain");
    expect(selector).not.toHaveBeenCalled();
    expect(() => secureBackend({ ...selected, getSelectedStorageBackend: undefined }, "linux")).toThrow("REMOTE_SECURE_STORAGE_UNAVAILABLE");
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
