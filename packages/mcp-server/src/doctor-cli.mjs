#!/usr/bin/env node
import { runDoctor, renderDoctor, DOCTOR_MODES } from "./doctor/index.js";

const args = process.argv.slice(2);
const mode = args.find((arg) => DOCTOR_MODES.includes(arg)) ?? "config";
const json = args.includes("--json");
const invalid = args.some((arg) => ["--token", "--url", "--insecure", "--auto-fix", "--start-provider"].includes(arg));
if (invalid || !DOCTOR_MODES.includes(mode)) {
  process.stderr.write("doctor: invalid invocation; use config|local|public and --json (no raw token, URL, insecure, or mutation flags)\n");
  process.exitCode = 2;
} else {
  const report = await runDoctor({
    mode,
    config: {
      projectRoot: process.env.KANMER_ROOT,
      expectedProject: process.env.KANMER_EXPECTED_PROJECT,
      remoteHostname: process.env.KANMER_REMOTE_HOSTNAME,
      secretReference: process.env.KANMER_TOKEN_FILE,
      tunnel: {
        executable: process.env.CLOUDFLARED_PATH,
        tunnelId: process.env.CLOUDFLARED_TUNNEL_ID,
        hostname: process.env.KANMER_REMOTE_HOSTNAME,
        credentialsFile: process.env.CLOUDFLARED_CREDENTIALS_FILE,
        endpoint: process.env.KANMER_LOCAL_ENDPOINT,
      },
    },
  });
  process.stdout.write(json ? `${JSON.stringify(report)}\n` : `${renderDoctor(report)}\n`);
  process.exitCode = report.exitCode;
}
