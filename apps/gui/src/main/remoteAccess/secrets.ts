import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { safeStorage } from "electron";

export type SecureBackend = "dpapi" | "keychain" | "kwallet" | "gnome-libsecret";

export interface SecretBackend {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend(): string;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

const SAFE_BACKENDS = new Set<SecureBackend>(["dpapi", "keychain", "kwallet", "gnome-libsecret"]);

export function secureBackend(backend: SecretBackend = safeStorage): SecureBackend {
  const selected = backend.getSelectedStorageBackend();
  if (!backend.isEncryptionAvailable() || !SAFE_BACKENDS.has(selected as SecureBackend)) {
    throw new Error("REMOTE_SECURE_STORAGE_UNAVAILABLE");
  }
  return selected as SecureBackend;
}

function secretFile(userData: string, id: string): string {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("REMOTE_SECRET_REFERENCE_INVALID");
  return join(userData, "remote-access-secrets", `${id}.bin`);
}

export async function putSecret(userData: string, token: string, backend: SecretBackend = safeStorage): Promise<{ id: string; backend: SecureBackend }> {
  const selected = secureBackend(backend);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("REMOTE_AUTH_INVALID_TOKEN");
  const id = randomUUID();
  const directory = join(userData, "remote-access-secrets");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const target = secretFile(userData, id);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, backend.encryptString(token), { mode: 0o600 });
  await rename(temporary, target);
  return { id, backend: selected };
}

export async function getSecret(userData: string, id: string, backend: SecretBackend = safeStorage): Promise<string> {
  secureBackend(backend);
  return backend.decryptString(await readFile(secretFile(userData, id)));
}

export async function removeSecret(userData: string, id: string): Promise<void> {
  await rm(secretFile(userData, id), { force: true });
}

