Opened PR #103: https://github.com/collisionengineers/kanmer/pull/103

Implementation commit: 9d13f65. Based on GUI-092 merge e5070de; checks passed: npm run test:scripts (66), npm run typecheck, npm run build -w @kanmer/gui, node --check, and git diff --check. Safe dry-run without credentials refused before mutation as expected.
