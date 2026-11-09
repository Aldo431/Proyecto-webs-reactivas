// Extracts a safe return path from router state (011 RF-2): only internal
// single-slash paths are honored; anything else falls back to "/".
export function returnPathFromState(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (
    typeof from === "string" &&
    from.startsWith("/") &&
    !from.startsWith("//")
  ) {
    return from;
  }
  return "/";
}
