import path from "node:path";

function pathApi(platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

function normalize(input, platform) {
  const api = pathApi(platform);
  const normalized = input.replace(/[\\\\/]+/g, api.sep);
  const resolved = api.resolve(normalized);
  return platform === "win32" ? resolved.toLowerCase() : resolved;
}

/**
 * Whether the resolved workspace entry belongs to this checkout's core package.
 *
 * The check deliberately requires strict containment: a module entry must be a
 * file below packages/core, never the directory itself or a prefix lookalike.
 */
export function ownsCoreResolution({ ownCore, resolvedCore, platform = process.platform }) {
  const api = pathApi(platform);
  const owner = normalize(ownCore, platform);
  const candidate = normalize(resolvedCore, platform);
  const relative = api.relative(owner, candidate);
  return relative !== "" && !relative.startsWith(`..${api.sep}`) && relative !== ".." && !api.isAbsolute(relative);
}
