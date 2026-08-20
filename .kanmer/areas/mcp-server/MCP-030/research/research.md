# Research — MCP-030: plugin bundle reproducibility

## Finding

The merged MCP-029 source is sound. The failed `plugin:check` on the main checkout compares:

- fresh standalone output built with the main checkout’s dependency layout, where `js-yaml` resolves at `node_modules/js-yaml`; and
- the committed plugin bundle copied from MCP-029’s linked worktree, where a local `npm install --package-lock=false` created `node_modules/gray-matter/node_modules/js-yaml`.

The 60 changed lines are esbuild-generated source-path comments and CommonJS wrapper labels for that dependency. They are byte-visible despite no runtime behavior change.

## Evidence

- Main checkout: `node_modules/js-yaml` exists and `node_modules/gray-matter/node_modules/js-yaml` does not.
- MCP-029 worktree: both locations exist; its local nested copy was created while preparing the prior ticket.
- `npm ls js-yaml --all` reports the same logical dependency versions in both checkouts.
- Main’s fresh `npm run build` plus `npm run plugin:check` fails only the committed-bundle SHA comparison; tool-reference and manifest checks proceed normally.
- Core tests (249), server typecheck, smoke (159/159), and protocol smoke (26/26) pass on merged main.

## Decision

The check is deliberately authoritative only in the main checkout, whose dependency tree owns the canonical `node_modules`; it explicitly refuses linked worktrees because their output is untrustworthy. Therefore the correct repair is to regenerate and commit the bundle from the main checkout—not to weaken the byte comparison or broaden supported layouts to ad-hoc linked-worktree installs.

## Open questions

None. The existing check and repository instructions define the canonical build location.
