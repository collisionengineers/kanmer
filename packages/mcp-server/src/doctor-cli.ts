import { DOCTOR_MODES, renderDoctor, runDoctor, type DoctorMode } from "./doctor/index.js";

const args = process.argv.slice(2);
const requested = args.find((arg): arg is DoctorMode => (DOCTOR_MODES as readonly string[]).includes(arg));
const mode = requested ?? "config";
const json = args.includes("--json");
const allowed = new Set(["--json", ...DOCTOR_MODES]);
const invalid = args.some((arg) => arg.startsWith("--") && !allowed.has(arg)) || new Set(args.filter((arg) => !arg.startsWith("--"))).size > (requested ? 1 : 0) || (args.some((arg) => !arg.startsWith("--") && !DOCTOR_MODES.includes(arg as DoctorMode)));
if (invalid) {
  process.stderr.write("doctor: invalid invocation; use config|local|public and --json (no raw token, URL, insecure, or mutation flags)\n");
  process.exitCode = 2;
} else {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  const report = await runDoctor({
    mode,
    signal: controller.signal,
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
  process.removeListener("SIGINT", abort);
  process.removeListener("SIGTERM", abort);
  process.stdout.write(json ? `${JSON.stringify(report)}\n` : `${renderDoctor(report)}\n`);
  process.exitCode = report.exitCode;
}
