/** Whether a tab close needs an unsaved-editor confirmation. */
export function tabCloseDecision(projectId: string, activeProjectId: string | null, dirty: boolean): "confirm" | "close" {
  return projectId === activeProjectId && dirty ? "confirm" : "close";
}
