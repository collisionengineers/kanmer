# Open questions — GUI-136

All implementation decisions are resolved.

- [x] Preserve the existing public `endpoint` contract and add a distinct `localEndpoint` field.
- [x] Keep the GUI trust boundary: it continues accepting only a canonical loopback `/mcp` URL as the child origin.
