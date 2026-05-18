import { join } from "path";
import { config } from "../../config.js";

export type GraphTarget = "project" | "corpus";

export function getGraphOutDir(target: GraphTarget): string {
  return join(config.graphifyOutDir, target);
}

export function getGraphJsonPath(target: GraphTarget): string {
  return join(getGraphOutDir(target), "graph.json");
}

export function getGraphHtmlPath(target: GraphTarget): string {
  return join(getGraphOutDir(target), "graph.html");
}

export function getGraphMetaPath(target: GraphTarget): string {
  return join(getGraphOutDir(target), "build-meta.json");
}

export function getGraphStalePath(target: GraphTarget): string {
  return join(getGraphOutDir(target), "needs_update");
}

/** Paths scanned for the project (codebase) graph — not uploaded documents. */
export function getProjectGraphRoots(): string[] {
  return [
    join(config.repoRoot, "apps"),
    join(config.repoRoot, "packages"),
    join(config.repoRoot, "scripts"),
    join(config.repoRoot, "README.md"),
    join(config.repoRoot, "stamped_intelligence_system_cursor_prompt.md"),
  ];
}
