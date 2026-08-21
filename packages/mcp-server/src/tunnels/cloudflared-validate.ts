import { execFile as execFileCallback } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export interface CloudflaredValidationResult { readonly version: string; }
export interface CloudflaredValidationOptions {
  readonly executable: string;
  readonly exec?: (file: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
}

export interface CloudflaredIngressValidationOptions {
  readonly executable: string;
  readonly configPath: string;
  readonly hostname: string;
  readonly exec?: (file: string, args: readonly string[]) => Promise<{ stdout: string; stderr: string }>;
}

function validateSafePath(value: string): void {
  if (!value || !/^[A-Za-z]:[\\/]|^\//.test(value) || /[\u0000-\u001f\u007f]/.test(value)) throw new Error("TUNNEL_INGRESS_CONFIG_INVALID");
}

function validateHostname(value: string): void {
  let parsed: URL;
  try { parsed = new URL(`https://${value}`); } catch { throw new Error("TUNNEL_INGRESS_HOST_INVALID"); }
  if (parsed.protocol !== "https:" || parsed.hostname !== value.toLowerCase() || parsed.pathname !== "/" || parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash || value.includes("*")) throw new Error("TUNNEL_INGRESS_HOST_INVALID");
}

/** Validate and exercise generated ingress rules without account/DNS mutation. */
export async function validateCloudflaredIngress(options: CloudflaredIngressValidationOptions): Promise<void> {
  validateSafePath(options.configPath);
  validateHostname(options.hostname);
  const invoke = options.exec ?? (async (file: string, args: readonly string[]) => {
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH ?? "" };
    if (process.platform === "win32" && process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
    const result = await execFile(file, [...args], {
      cwd: os.tmpdir(), env, timeout: 5_000,
      maxBuffer: 16 * 1024, windowsHide: true, shell: false,
    });
    return { stdout: result.stdout, stderr: result.stderr };
  });
  try { await invoke(options.executable, ["tunnel", "--config", options.configPath, "ingress", "validate"]); }
  catch { throw new Error("TUNNEL_INGRESS_VALIDATION_FAILED"); }
  try { await invoke(options.executable, ["tunnel", "--config", options.configPath, "ingress", "rule", `https://${options.hostname}/mcp`]); }
  catch { throw new Error("TUNNEL_INGRESS_RULE_FAILED"); }
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
