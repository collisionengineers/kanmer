// Construct the explicit upload set for the one package produced by release.mjs.

/** The canonical public filenames emitted and published for one release. */
export function releaseAssetNames(version) {
  return [
    `Kanmer-Setup-${version}.exe`,
    `Kanmer-Setup-${version}.exe.blockmap`,
    `kanmer-${version}.mcpb`,
    "latest.yml",
  ];
}

/**
 * Build the exact gh(1) upload arguments for a single already-built package.
 *
 * The verifier owns the public asset names, so callers pass its expected
 * entries here rather than deriving the upload set a second time. The `#name`
 * suffix also gives each GitHub asset an explicit display label; the packaged
 * filenames are already pinned to the same dash-safe names.
 */
export function exactUploadSpecs(expected, version) {
  if (!Array.isArray(expected) || expected.length === 0) {
    throw new Error("cannot publish a release without expected local assets");
  }
  const actualNames = expected.map(({ name }) => name).sort();
  const canonicalNames = releaseAssetNames(version).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(canonicalNames)) {
    throw new Error(
      `local release asset names do not match the canonical set for ${version}: ` +
        `expected ${canonicalNames.join(", ")}; got ${actualNames.join(", ")}`,
    );
  }

  return expected.map(({ localPath, name }) => {
    if (!localPath || !name) {
      throw new Error("cannot publish a release: an expected asset lacks its local path or GitHub name");
    }
    return `${localPath}#${name}`;
  });
}
