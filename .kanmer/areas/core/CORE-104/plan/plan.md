# Plan — CORE-104

## Objective
Make the unchanged filesystem-heavy area-validation test reliable on hosted Windows runners without weakening its behavior checks.

## Starting state
The test passes locally but exceeded the 5-second default in two consecutive hosted runs.

## Required changes
Give only this test a 15-second timeout, retaining every operation and assertion.

## Expected files
packages/core/src/store.test.ts only.

## Do not modify
Production code, assertions, global timeouts, workflow structure, or dependencies.

## Constraints
The limit remains finite and test-local.

## Governing docs
No product behavior changes; this is CI reliability.

## Ordered steps
1. Add the test-local timeout. 2. Run the focused test repeatedly. 3. Run core suite/typecheck. 4. Open PR and require hosted verify.

## Acceptance checks
Assertions unchanged; repeated focused runs and hosted verify pass.

## Commands
Focused Vitest, core suite, typecheck, git diff --check.

## Failure and deviation rules
Do not mask a reproducible assertion or production failure.

## Stop condition
Stop with the PR open and CORE-104 in Review.
