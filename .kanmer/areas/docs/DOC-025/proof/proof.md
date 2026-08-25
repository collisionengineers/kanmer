# Proof — DOC-025

## Result

**PASS** — v0.3.8 release notes merged normally and are present at the top of the rendered release-note source.

## Traceability

- PR: https://github.com/collisionengineers/kanmer/pull/255
- Reviewed head: `3dce7c00e766d5ec2d4d2998a867b6670966cd67`
- Protected squash merge: `53d8e2a70c0a91225ace0125f243b2100bde4829`
- Merged at: 2026-08-25T01:08:43Z
- Required `verify`: PASS
- Required `kanmer-gate`: PASS
- Independent review: PASS; no findings.

## Merged-main verification

A fresh clone at `53d8e2a70c0a91225ace0125f243b2100bde4829` completed:

- `npm ci --ignore-scripts`: exit 0.
- `npm run build:core`: exit 0.
- `node --test scripts/release-notes.test.mjs`: exit 0; 1/1 passed.

The published notes name v0.3.8 and do not claim a release, installed update, public tunnel, or unsupported provider capability that has not yet been verified.
