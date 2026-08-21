import { execFile as execFileCallback } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export interface CloudflaredValidationResult { readonly version: string; }
export interface CloudflaredValidationOptions {
  readonly executable: string;
  readonly exec?: (file: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
}

/** Direct, bounded validation only: no update, login, or account mutation. */
export async function validateCloudflaredExecutable(options: CloudflaredValidationOptions): Promise<CloudflaredValidationResult> {
  const invoke = options.exec ?? (async (file: string, args: readonly string[]) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
    if (process.platform === "win32" && process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
    const result = await execFile(file, [...args], {
      cwd: os.tmpdir(), env, timeout: 5_000,
      maxBuffer: 16 * 1024, windowsHide: true, shell: false,
    });
    return { stdout: result.stdout, stderr: result.stderr };
  });
  let versionOutput: { stdout: string; stderr: string };
  try { versionOutput = await invoke(options.executable, ["--version"]); }
  catch { throw new Error("TUNNEL_EXECUTABLE_VERSION_FAILED"); }
  const version = /cloudflared version\s+([0-9]+(?:\.[0-9]+){1,3})/i.exec(`${versionOutput.stdout}\n${versionOutput.stderr}`)?.[1];
  if (!version) throw new Error("TUNNEL_EXECUTABLE_VERSION_UNSUPPORTED");
  try { await invoke(options.executable, ["tunnel", "--help"]); }
  catch { throw new Error("TUNNEL_EXECUTABLE_HELP_FAILED"); }
  return { version };
}
