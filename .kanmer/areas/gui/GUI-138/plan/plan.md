# Plan — GUI-138

## Objective

Allow packaged public-mode doctor to evaluate its existing tunnel and public checks using the manager-owned Cloudflare readiness snapshot.

## Starting state

The snapshot environment variable is absent, so tunnel readiness always fails.

## Required changes

Build an allowlisted JSON snapshot with connected/failed state, provider, public endpoint, canonical fingerprint, generation metadata, attempt, and timestamp; pass it only to the doctor child. Add a spawn-boundary regression.

## Expected files

Only manager.ts and manager.test.ts.

## Do not modify

Doctor semantics, providers, DNS, secrets, endpoint protocol, or updater.

## Constraints

No secrets or raw logs in the environment snapshot. Preserve generation conflict checks.

## Governing docs

FRD-025 requires truthful, end-to-end doctor evidence from the owned runtime.

## Ordered steps

1. Build the allowlisted snapshot from record/config.
2. Pass it as `KANMER_TUNNEL_STATUS_JSON`.
3. Add regression and run focused tests, GUI typecheck, build, diff check.
4. Report, commit, PR, Review.

## Acceptance checks

Connected owned runtime yields a connected snapshot with exact hostname/fingerprint and no sensitive fields; doctor proceeds beyond tunnel readiness.

## Commands

Focused manager tests, GUI typecheck, full build, git diff --check.

## Failure and deviation rules

Preserve failures and do not add provider calls.

## Stop condition

Stop with PR open and GUI-138 in Review.
