// The post-publish decision is deliberately independent of Electron Builder.
// A release can be public even when the publisher exits non-zero (for example
// after a competing artifact task observes an already-created GitHub release).
// Only remote asset verification decides whether the one local package shipped.

/**
 * Build the exact gh(1) upload arguments for a single already-built package.
 *
 * GitHub asset names use dashes while the NSIS files on disk use spaces. The
 * verifier owns that mapping, so callers pass its expected entries here rather
 * than deriving names a second time.
 */
export function exactUploadSpecs(expected) {
  if (!Array.isArray(expected) || expected.length === 0) {
    throw new Error("cannot repair a release without expected local assets");
  }

  return expected.map(({ localPath, name }) => {
    if (!localPath || !name) {
      throw new Error("cannot repair a release: an expected asset lacks its local path or GitHub name");
    }
    return `${localPath}#${name}`;
  });
}

/**
 * Verify the published release and, only when it is incomplete, perform one
 * exact-file repair followed by one final verification. `repair` is intentionally
 * the only recovery capability: this helper cannot run Electron Builder or make
 * a second NSIS package.
 */
export async function settlePublication({ publisherError = null, verify, repair }) {
  let check;
  try {
    check = await verify();
  } catch (error) {
    return { status: "check-failed", error, publisherError };
  }

  if (check.ok) {
    return { status: "verified", check, publisherError, repaired: false };
  }

  if (check.derivationBroken) {
    return { status: "local-artifacts-invalid", check, publisherError };
  }

  try {
    await repair(check.expected);
  } catch (error) {
    return { status: "repair-failed", check, error, publisherError };
  }

  try {
    check = await verify();
  } catch (error) {
    return { status: "check-failed", error, publisherError, repaired: true };
  }

  if (check.ok) {
    return { status: "verified", check, publisherError, repaired: true };
  }

  return { status: "still-incomplete", check, publisherError, repaired: true };
}
