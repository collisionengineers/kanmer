import type { DoctorReport } from "./types.js";

export function renderDoctor(report: DoctorReport): string {
  const group = (id: string): string => id.startsWith("PROJECT_") || id.startsWith("REMOTE_CONFIG") || id.startsWith("SECRET_") || id.startsWith("TUNNEL_EXECUTABLE") || id.startsWith("TUNNEL_CONFIG") ? "Configuration" : id.startsWith("LOCAL_") || id.startsWith("AUTH_") || id.startsWith("MCP_") || id.startsWith("SESSION_") ? "Local MCP" : id.startsWith("PUBLIC_") || id.includes("PUBLIC") ? "Public endpoint" : "Safety";
  const lines = [
    `Kanmer doctor (${report.mode}) — ${report.status.toUpperCase()} (exit ${report.exitCode})`,
    `checks: ${report.counts.pass} pass, ${report.counts.warn} warn, ${report.counts.fail} fail, ${report.counts.skipped} skipped`,
  ];
  let current = "";
  const firstFailure = report.checks.find((check) => check.status === "fail");
  if (firstFailure) lines.push(`first blocking layer: ${group(firstFailure.id)} (${firstFailure.id})`);
  for (const check of report.checks) {
    if (group(check.id) !== current) { current = group(check.id); lines.push(`\n${current}`); }
    const detail = check.details?.reason ?? check.details?.observed ?? "";
    lines.push(`${check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : check.status === "fail" ? "FAIL" : "SKIP"} ${check.id}${detail ? ` — ${detail}` : ""}`);
    if (check.status === "fail" && check.repair) lines.push(`  repair: ${check.repair.actions.join(" ")}`);
  }
  const next = report.checks.find((check) => check.status === "fail" && check.repair);
  if (next?.repair) lines.push(`\nnext repair: ${next.repair.actions.join(" ")}`);
  return lines.join("\n");
}
