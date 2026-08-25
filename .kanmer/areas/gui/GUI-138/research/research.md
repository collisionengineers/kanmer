# Research — GUI-138

Public-mode doctor reads provider readiness exclusively from `KANMER_TUNNEL_STATUS_JSON`. `RemoteAccessManager.doctorNow` supplies executable/id/credentials/hostname/local endpoint but omits that variable, so doctor deterministically fabricates `{state:"failed",provider:"unknown"}`. The manager-owned record already has the required allowlisted facts: connected tunnel state, configured public hostname, canonical project fingerprint, and current generation. No provider query or secret is required. No declared project sources apply.
