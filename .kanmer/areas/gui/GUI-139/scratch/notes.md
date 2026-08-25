## Review remediation

F-001 accepted and fixed in `04774ce2`: incomplete reload now compares every persisted field with `defaultProfile(projectId)`, so only the exact product-created default is accepted. Added rejection cases for a safe non-default executable and safe non-default profile name, alongside the existing partial tunnel-id case. Focused tests remain 13/13 PASS; GUI typecheck and diff check PASS.

## Review remediation F-002

F-002 accepted and fixed in `b24e9187`: Initialize and Doctor now reject an incomplete default with `OPENAI_PROFILE_INCOMPLETE` before changing status, spawning, or persisting diagnostics. A register → restart → Doctor/Initialize rejection → second restart regression proves the product-owned default remains reloadable. Focused tests 13/13, GUI typecheck, and diff check PASS.
