// Pure release-boundary helpers. Keep the release command's ref policy
// dependency-free and testable without invoking GitHub, Git, or a publisher.

export const RELEASE_BASE_BRANCH = "main";

export function parseReleaseArgs(argv) {
  let version;
  let releaseCommit;
  let ticket;
  let dryRun = false;
  let publish = false;
  const optionValue = (name, index) => {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} needs a value`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--publish") {
      publish = true;
      continue;
    }
    if (arg === "--release-commit") {
      releaseCommit = optionValue(arg, index);
      index += 1;
      continue;
    }
    if (arg === "--ticket") {
      ticket = optionValue(arg, index);
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) throw new Error(`unknown option ${arg}`);
    if (version !== undefined) throw new Error(`unexpected positional argument ${arg}`);
    version = arg;
  }
  return { version, dryRun, publish, releaseCommit, ticket };
}

export function releaseBranch(version) {
  return `release/v${version}`;
}

export function releaseTag(version) {
  return `v${version}`;
}

export function releaseBranchRef(version) {
  return `refs/heads/${releaseBranch(version)}`;
}

export function releaseTagRef(version) {
  return `refs/tags/${releaseTag(version)}`;
}

export function isFullCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

export function ancestryOutcome(exitCode) {
  if (exitCode === 0) return "reachable";
  if (exitCode === 1) return "unreachable";
  return "indeterminate";
}
