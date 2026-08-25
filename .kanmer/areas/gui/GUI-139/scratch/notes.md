## Review remediation

F-001 accepted and fixed in `04774ce2`: incomplete reload now compares every persisted field with `defaultProfile(projectId)`, so only the exact product-created default is accepted. Added rejection cases for a safe non-default executable and safe non-default profile name, alongside the existing partial tunnel-id case. Focused tests remain 13/13 PASS; GUI typecheck and diff check PASS.
