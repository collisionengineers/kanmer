import { lstat, open, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { generateBearerToken, verifierForToken, type BearerVerifier } from "./http-auth.js";

const MAX_TOKEN_FILE_BYTES = 128;

export interface TokenFileWriter {
  write(handle: Awaited<ReturnType<typeof open>>, token: string): Promise<void>;
}

const defaultWriter: TokenFileWriter = {
  async write(handle, token) {
    await handle.writeFile(`${token}\n`, "ascii");
    await handle.sync();
  },
};

/** The optional writer is test-only fault injection for atomic cleanup coverage. */
export async function createTokenFile(file: string, writer: TokenFileWriter = defaultWriter): Promise<{ verifier: BearerVerifier; fingerprint: string }> {
  const parent = await lstat(dirname(file));
  if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
  const generated = generateBearerToken();
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let created = false;
  try {
    handle = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    created = true;
    await writer.write(handle, generated.token);
    return { verifier: generated.verifier, fingerprint: generated.verifier.fingerprint };
  } catch (error) {
    if (!created) throw error;
    await rm(file, { force: true });
    // A filesystem/provider error could include data written by a custom stream;
    // never propagate it through a CLI diagnostic where it might reveal the token.
    throw new Error("REMOTE_AUTH_SECRET_FILE_WRITE_FAILED");
  } finally { await handle?.close(); }
}

export async function loadTokenFile(file: string): Promise<BearerVerifier> {
  const before = await lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_TOKEN_FILE_BYTES || (process.platform !== "win32" && (before.mode & 0o077) !== 0)) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (!after.isFile() || after.ino !== before.ino || after.dev !== before.dev) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
    const bytes = Buffer.alloc(MAX_TOKEN_FILE_BYTES + 1);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > MAX_TOKEN_FILE_BYTES) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
    const text = bytes.subarray(0, bytesRead).toString("ascii");
    bytes.fill(0);
    if (!/^[A-Za-z0-9_-]{43}\n?$/.test(text)) throw new Error("REMOTE_AUTH_INVALID_TOKEN");
    return verifierForToken(text.trimEnd());
  } finally { await handle.close(); }
}
