# Plan — MCP-050

1. Reproduce the clean-clone failures without injecting the developer board.
2. Provision minimal disposable `.kanmer` directories inside the two affected test modules.
3. Pass the root explicitly through each test process environment and restore/clean it deterministically.
4. Preserve every behavioral assertion.
5. Run the focused tests, full MCP HTTP rail, full workspace verification, then repeat the CORE-103 clean-clone dry run.

Stop after the bounded PR is opened; independent review owns merge.
