import { lstat, open } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { generateBearerToken, verifierForToken, type BearerVerifier } from "./http-auth.js";

const MAX_TOKEN_FILE_BYTES = 128;

export async function createTokenFile(file: string): Promise<{ verifier: BearerVerifier; fingerprint: string }> {
  await lstat(dirname(file));
  const generated = generateBearerToken();
  let handle;
  try {
    handle = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
    await handle.writeFile(`${generated.token}\n`, "ascii");
    await handle.sync();
    return { verifier: generated.verifier, fingerprint: generated.verifier.fingerprint };
  } finally { await handle?.close(); }
}

export async function loadTokenFile(file: string): Promise<BearerVerifier> {
  const before = await lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_TOKEN_FILE_BYTES) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
  const handle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (!after.isFile() || after.ino !== before.ino || after.dev !== before.dev) throw new Error("REMOTE_AUTH_SECRET_FILE_UNSAFE");
    const bytes = await handle.readFile();
    const text = bytes.toString("ascii");
    bytes.fill(0);
    if (!/^[A-Za-z0-9_-]{43}\n?$/.test(text)) throw new Error("REMOTE_AUTH_INVALID_TOKEN");
    return verifierForToken(text.trimEnd());
  } finally { await handle.close(); }
}
